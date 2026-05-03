import { getGenerationAgent, hasGenerationAgent, listGenerationAgents } from '../registry';
import {
  GenerationAgentCliExecution,
  GenerationAgentId,
  GenerationAgentModule,
  GenerationAgentRequest,
} from './types';

export function executeGenerationAgentCli(
  args: string[],
  defaultAgentId?: GenerationAgentId
): GenerationAgentCliExecution {
  const normalizedArgs = [...args];

  if (normalizedArgs.includes('--list')) {
    return success({
      agents: listGenerationAgents().map((agent) => ({
        id: agent.spec.id,
        capabilityId: agent.spec.capabilityId,
        label: agent.spec.label,
      })),
    });
  }

  const resolvedAgentId = defaultAgentId || shiftAgentId(normalizedArgs);
  if (!resolvedAgentId) {
    return failure(
      'Missing agent id. Use --list or pass one of: text-to-image, video-generation, tts-generation, sfx-generation, music-generation.'
    );
  }

  if (!hasGenerationAgent(resolvedAgentId)) {
    return failure(`Unknown agent id: ${resolvedAgentId}`);
  }

  const agent = getGenerationAgent(resolvedAgentId);

  if (normalizedArgs.includes('--describe')) {
    return success({
      spec: agent.spec,
      exampleRequest: agent.exampleRequest,
    });
  }

  if (normalizedArgs.includes('--example')) {
    return success(agent.run(agent.exampleRequest));
  }

  const inputIndex = normalizedArgs.indexOf('--input');
  if (inputIndex >= 0) {
    const filePath = normalizedArgs[inputIndex + 1];
    if (!filePath) {
      return failure('Missing file path after --input');
    }

    try {
      const request = readJsonFile(filePath) as GenerationAgentRequest;
      return success(agent.run(request));
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Failed to load JSON input file.'
      );
    }
  }

  return failure(buildUsage(agent));
}

export function runGenerationAgentCli(defaultAgentId?: GenerationAgentId): void {
  const processLike = globalThis as {
    process?: {
      argv?: string[];
      stdout?: { write: (message: string) => unknown };
      stderr?: { write: (message: string) => unknown };
      exit?: (code?: number) => never;
    };
  };
  const argv = processLike.process?.argv || [];
  const execution = executeGenerationAgentCli(argv.slice(2), defaultAgentId);

  if (execution.stdout) {
    processLike.process?.stdout?.write(`${execution.stdout}\n`);
  }
  if (execution.stderr) {
    processLike.process?.stderr?.write(`${execution.stderr}\n`);
  }
  if (processLike.process?.exit) {
    processLike.process.exit(execution.exitCode);
  }
}

function shiftAgentId(args: string[]): string | undefined {
  const firstArg = args[0];
  if (!firstArg || firstArg.startsWith('--')) {
    return undefined;
  }

  args.shift();
  return firstArg;
}

function buildUsage(agent: GenerationAgentModule): string {
  return [
    `Usage for ${agent.spec.id}:`,
    ...agent.spec.usage.cliExamples,
    'Use --describe to inspect protocol, or --example to run the built-in demo.',
  ].join('\n');
}

function success(payload: unknown): GenerationAgentCliExecution {
  return {
    exitCode: 0,
    stdout: JSON.stringify(payload, null, 2),
    stderr: '',
  };
}

function failure(message: string): GenerationAgentCliExecution {
  return {
    exitCode: 1,
    stdout: '',
    stderr: message,
  };
}

function readJsonFile(filePath: string): unknown {
  const requireLike = loadNodeRequire();
  if (!requireLike) {
    throw new Error('Node file loading is unavailable in the current runtime.');
  }

  const fs = requireLike('fs') as {
    readFileSync: (path: string, encoding: string) => string;
  };
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadNodeRequire(): ((id: string) => unknown) | undefined {
  return Function('return typeof require === "function" ? require : undefined;')() as
    | ((id: string) => unknown)
    | undefined;
}