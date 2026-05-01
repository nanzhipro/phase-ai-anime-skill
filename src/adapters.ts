import {
  AdapterRegistryEntry,
  AdapterValidationIssue,
  AdapterValidationResult,
  GenerationJobSpec,
  ProviderContract,
} from './types';

const DEFAULT_FORBIDDEN_FIELD_NAMES = [
  'apiKey',
  'api_key',
  'token',
  'cookie',
  'secret',
  'password',
  'credential',
  'authorization',
  'privatePath',
  'localPrivatePath',
];

export function createAdapterRegistry(
  contracts: ProviderContract[]
): AdapterRegistryEntry[] {
  return contracts.map((contract) => ({
    kind: contract.kind,
    adapterSlot: contract.adapterSlot,
    status: 'contract-only',
    inputArtifacts: contract.inputArtifacts,
    outputArtifacts: contract.outputArtifacts,
    requiredFields: contract.requiredFields,
    forbiddenFields: uniqueStrings([
      ...DEFAULT_FORBIDDEN_FIELD_NAMES,
      ...contract.forbiddenFields,
    ]),
  }));
}

export function validateGenerationJobsAgainstContracts(
  jobs: GenerationJobSpec[],
  contracts: ProviderContract[]
): AdapterValidationResult {
  return mergeValidationResults(
    jobs.map((job) => {
      const contract = contracts.find(
        (candidate) =>
          candidate.kind === job.kind && candidate.adapterSlot === job.adapterSlot
      );

      if (!contract) {
        return {
          valid: false,
          issues: [
            issue(
              job.jobId,
              'missing_contract',
              `No provider contract found for ${job.kind}:${job.adapterSlot}`
            ),
          ],
        };
      }

      return validateGenerationJobAgainstContract(job, contract);
    })
  );
}

export function validateGenerationJobAgainstContract(
  job: GenerationJobSpec,
  contract: ProviderContract
): AdapterValidationResult {
  const issues: AdapterValidationIssue[] = [];

  if (job.provider !== 'unassigned') {
    issues.push(
      issue(job.jobId, 'provider_bound', 'MVP jobs must keep provider as unassigned')
    );
  }

  if (job.kind !== contract.kind) {
    issues.push(
      issue(
        job.jobId,
        'kind_mismatch',
        `Job kind ${job.kind} does not match contract kind ${contract.kind}`
      )
    );
  }

  if (job.adapterSlot !== contract.adapterSlot) {
    issues.push(
      issue(
        job.jobId,
        'adapter_slot_mismatch',
        `Job adapter slot ${job.adapterSlot} does not match contract slot ${contract.adapterSlot}`
      )
    );
  }

  contract.requiredFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(job.input, field)) {
      issues.push(
        issue(job.jobId, 'missing_required_field', `Missing input field: ${field}`)
      );
    }
  });

  const forbiddenFields = uniqueStrings([
    ...DEFAULT_FORBIDDEN_FIELD_NAMES,
    ...contract.forbiddenFields,
  ]);
  const forbiddenHits = findForbiddenKeys(job, forbiddenFields);
  forbiddenHits.forEach((fieldPath) => {
    issues.push(
      issue(job.jobId, 'forbidden_field', `Forbidden field present: ${fieldPath}`)
    );
  });

  const privatePathHits = findPrivatePathValues(job);
  privatePathHits.forEach((fieldPath) => {
    issues.push(
      issue(job.jobId, 'private_path', `Private local path present: ${fieldPath}`)
    );
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

function mergeValidationResults(
  results: AdapterValidationResult[]
): AdapterValidationResult {
  const issues = results.flatMap((result) => result.issues);

  return {
    valid: issues.length === 0,
    issues,
  };
}

function findForbiddenKeys(value: unknown, forbiddenFields: string[]): string[] {
  const forbidden = new Set(forbiddenFields.map(normalizeFieldName));
  const hits: string[] = [];
  visit(value, [], (path, entry) => {
    if (path.length === 0) {
      return;
    }

    const fieldName = path[path.length - 1];
    if (forbidden.has(normalizeFieldName(fieldName))) {
      hits.push(path.join('.'));
    }

    if (typeof entry === 'string' && looksLikeSecret(entry)) {
      hits.push(path.join('.'));
    }
  });

  return uniqueStrings(hits);
}

function findPrivatePathValues(value: unknown): string[] {
  const hits: string[] = [];
  visit(value, [], (path, entry) => {
    if (typeof entry === 'string' && looksLikePrivatePath(entry)) {
      hits.push(path.join('.'));
    }
  });

  return uniqueStrings(hits);
}

function visit(
  value: unknown,
  path: string[],
  visitor: (path: string[], value: unknown) => void
): void {
  visitor(path, value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => visit(entry, [...path, String(index)], visitor));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      visit(entry, [...path, key], visitor);
    });
  }
}

function normalizeFieldName(value: string): string {
  return value.replace(/[-_]/g, '').toLowerCase();
}

function looksLikeSecret(value: string): boolean {
  return /(?:api[_-]?key|bearer\s+|secret|token=|password=)/i.test(value);
}

function looksLikePrivatePath(value: string): boolean {
  return /^\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(value);
}

function issue(
  jobId: string,
  code: AdapterValidationIssue['code'],
  message: string
): AdapterValidationIssue {
  return { jobId, code, message };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
