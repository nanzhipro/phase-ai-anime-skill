import {
  VolcengineRuntimeEnvironmentOptions,
  VolcengineRuntimeEnvironmentStatus,
} from './types';

const DEFAULT_ARK_API_KEY_ENV_VAR = 'ARK_API_KEY';
const DEFAULT_ENV_FILE_NAME = '.env';
const DEFAULT_ENV_TEMPLATE_FILE_NAME = '.env.example';

interface RuntimeEnvironmentInspection {
  status: VolcengineRuntimeEnvironmentStatus;
  resolvedApiKey?: string;
}

export function checkVolcengineRuntimeEnvironment(
  options: VolcengineRuntimeEnvironmentOptions = {}
): VolcengineRuntimeEnvironmentStatus {
  return inspectVolcengineRuntimeEnvironment(options).status;
}

export function assertVolcengineRuntimeEnvironmentReady(
  options: VolcengineRuntimeEnvironmentOptions = {}
): VolcengineRuntimeEnvironmentStatus {
  const status = checkVolcengineRuntimeEnvironment(options);
  if (!status.ready) {
    throw new Error(status.message);
  }

  return status;
}

export function resolveVolcengineRuntimeApiKey(
  explicitApiKey?: string,
  options: VolcengineRuntimeEnvironmentOptions = {}
): string {
  const apiKeyEnvVar = options.apiKeyEnvVar || DEFAULT_ARK_API_KEY_ENV_VAR;
  const normalizedExplicitApiKey = normalizeRuntimeSecret(explicitApiKey);
  if (normalizedExplicitApiKey) {
    if (isPlaceholderValue(normalizedExplicitApiKey)) {
      throw new Error(
        `Explicit apiKey is still a placeholder. Set ${apiKeyEnvVar} in process.env or .env before running. Without a valid API key the provider flow cannot run.`
      );
    }

    return normalizedExplicitApiKey;
  }

  const inspection = inspectVolcengineRuntimeEnvironment(options);
  if (!inspection.status.ready || !inspection.resolvedApiKey) {
    throw new Error(inspection.status.message);
  }

  cacheRuntimeSecret(inspection.status.apiKeyEnvVar, inspection.resolvedApiKey);
  return inspection.resolvedApiKey;
}

function inspectVolcengineRuntimeEnvironment(
  options: VolcengineRuntimeEnvironmentOptions
): RuntimeEnvironmentInspection {
  const apiKeyEnvVar = options.apiKeyEnvVar || DEFAULT_ARK_API_KEY_ENV_VAR;
  const normalizedExplicitApiKey = normalizeRuntimeSecret(options.explicitApiKey);
  const cwd = options.cwd || getProcessCwd();
  const envFileName = options.envFileName || DEFAULT_ENV_FILE_NAME;
  const templateFileName = options.templateFileName || DEFAULT_ENV_TEMPLATE_FILE_NAME;
  const envFilePath = joinPath(cwd, envFileName);
  const templateFilePath = joinPath(cwd, templateFileName);
  const envMap = options.env || getProcessEnv();
  const processValue = normalizeRuntimeSecret(envMap[apiKeyEnvVar]);

  if (normalizedExplicitApiKey) {
    if (isPlaceholderValue(normalizedExplicitApiKey)) {
      return {
        status: {
          ready: false,
          apiKeyEnvVar,
          source: 'invalid',
          envFilePath,
          templateFilePath,
          message: `Explicit apiKey is still a placeholder. Set ${apiKeyEnvVar} in process.env or .env before running. Without a valid API key the provider flow cannot run.`,
        },
      };
    }

    return {
      status: {
        ready: true,
        apiKeyEnvVar,
        source: 'explicit',
        envFilePath,
        templateFilePath,
        message: 'A non-placeholder apiKey was provided explicitly for this execution.',
      },
      resolvedApiKey: normalizedExplicitApiKey,
    };
  }

  if (processValue) {
    if (isPlaceholderValue(processValue)) {
      return {
        status: {
          ready: false,
          apiKeyEnvVar,
          source: 'invalid',
          envFilePath,
          templateFilePath,
          message: `${apiKeyEnvVar} is present in process.env but still looks like a placeholder. Replace it with a real key before running. Without a valid API key the provider flow cannot run.`,
        },
      };
    }

    return {
      status: {
        ready: true,
        apiKeyEnvVar,
        source: 'process.env',
        envFilePath,
        templateFilePath,
        message: `${apiKeyEnvVar} is available in process.env.`,
      },
      resolvedApiKey: processValue,
    };
  }

  const readFile = options.readFile || defaultReadFile;
  const envContent = readFile(envFilePath);
  if (typeof envContent !== 'string') {
    return {
      status: {
        ready: false,
        apiKeyEnvVar,
        source: 'missing',
        envFilePath,
        templateFilePath,
        message: `Missing required runtime API key ${apiKeyEnvVar}. Copy ${templateFileName} to ${envFileName}, set ${apiKeyEnvVar}, and ${envFileName} must not be committed to GitHub. Without a valid API key the provider flow cannot run.`,
      },
    };
  }

  const parsedEnv = parseDotEnv(envContent);
  const envFileValue = normalizeRuntimeSecret(parsedEnv[apiKeyEnvVar]);
  if (!envFileValue) {
    return {
      status: {
        ready: false,
        apiKeyEnvVar,
        source: 'missing',
        envFilePath,
        templateFilePath,
        message: `Found ${envFileName}, but ${apiKeyEnvVar} is missing. Set ${apiKeyEnvVar} before running. ${envFileName} is local-only and must not be committed to GitHub.`,
      },
    };
  }

  if (isPlaceholderValue(envFileValue)) {
    return {
      status: {
        ready: false,
        apiKeyEnvVar,
        source: 'invalid',
        envFilePath,
        templateFilePath,
        message: `Found ${envFileName}, but ${apiKeyEnvVar} still uses a placeholder value. Replace it with a real key before running. Without a valid API key the provider flow cannot run.`,
      },
    };
  }

  return {
    status: {
      ready: true,
      apiKeyEnvVar,
      source: '.env',
      envFilePath,
      templateFilePath,
      message: `${apiKeyEnvVar} is available in ${envFileName}.`,
    },
    resolvedApiKey: envFileValue,
  };
}

function getProcessEnv(): Record<string, string | undefined> {
  const processLike = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };

  return processLike.process?.env || {};
}

function getProcessCwd(): string {
  const processLike = globalThis as {
    process?: { cwd?: () => string };
  };

  return processLike.process?.cwd?.() || '.';
}

function cacheRuntimeSecret(envVar: string, value: string): void {
  const processLike = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };

  if (processLike.process?.env) {
    processLike.process.env[envVar] = value;
  }
}

function joinPath(root: string, leaf: string): string {
  if (!root || root === '.') {
    return leaf;
  }

  return root.endsWith('/') ? `${root}${leaf}` : `${root}/${leaf}`;
}

function defaultReadFile(filePath: string): string | undefined {
  const requireLike = loadNodeRequire();
  if (!requireLike) {
    return undefined;
  }

  try {
    const fs = requireLike('fs') as {
      existsSync: (path: string) => boolean;
      readFileSync: (path: string, encoding: string) => string;
    };
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function loadNodeRequire(): ((id: string) => unknown) | undefined {
  return Function('return typeof require === "function" ? require : undefined;')() as
    | ((id: string) => unknown)
    | undefined;
}

function parseDotEnv(content: string): Record<string, string> {
  return content.split(/\r?\n/).reduce<Record<string, string>>((parsed, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return parsed;
    }

    const normalizedLine = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex < 0) {
      return parsed;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!key) {
      return parsed;
    }

    let value = normalizedLine.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
    return parsed;
  }, {});
}

function normalizeRuntimeSecret(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isPlaceholderValue(value: string): boolean {
  return [
    /^your[_-]?ark[_-]?api[_-]?key(?:[_-]?here)?$/i,
    /^your[_-]?api[_-]?key(?:[_-]?here)?$/i,
    /^replace(?:[_-]?me)?$/i,
    /^changeme$/i,
    /^paste[_-]?api[_-]?key[_-]?here$/i,
    /^example$/i,
    /^todo$/i,
    /^xxx+$/i,
    /^<[^>]+>$/,
    /^\$\{[^}]+\}$/,
  ].some((pattern) => pattern.test(value));
}