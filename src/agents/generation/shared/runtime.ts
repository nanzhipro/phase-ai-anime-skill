import {
  GenerationAgentFieldType,
  GenerationAgentModule,
  GenerationAgentRequest,
  GenerationAgentResult,
  StaticGenerationAgentConfig,
} from './types';

export function createStaticGenerationAgent(
  config: StaticGenerationAgentConfig
): GenerationAgentModule {
  return {
    spec: config.spec,
    exampleRequest: config.exampleRequest,
    run(request: GenerationAgentRequest): GenerationAgentResult {
      const issues = validateGenerationAgentRequest(config.spec, request);
      const modeContract = config.spec.protocol[request.mode];
      const consumedArtifacts = uniqueStrings([
        ...modeContract.requiredArtifacts.map((artifact) => artifact.path),
        ...request.upstreamArtifacts,
      ]);
      const producedArtifacts = uniqueStrings([
        ...modeContract.producedArtifacts.map((artifact) => artifact.path),
        ...(request.requestedOutputs || []),
      ]);

      if (issues.length > 0) {
        return {
          agentId: config.spec.id,
          capabilityId: config.spec.capabilityId,
          mode: request.mode,
          success: false,
          status: 'blocked',
          summary: `${config.spec.label} blocked: ${issues.join('; ')}`,
          consumedArtifacts,
          producedArtifacts: [],
          collaborationProtocol: modeContract.protocolConditions,
          warnings: [],
          errors: issues,
          nextAgentHints: [],
          output: {
            requiredInputs: modeContract.requiredInputFields.map((field) => field.name),
            requiredArtifacts: modeContract.requiredArtifacts.map((artifact) => artifact.path),
          },
        };
      }

      const success = config.buildSuccess(request);
      return {
        agentId: config.spec.id,
        capabilityId: config.spec.capabilityId,
        mode: request.mode,
        success: true,
        status: 'ready',
        summary: success.summary,
        consumedArtifacts,
        producedArtifacts,
        collaborationProtocol: modeContract.protocolConditions,
        warnings: success.warnings || [],
        errors: [],
        nextAgentHints: success.nextAgentHints || [],
        output: success.output,
      };
    },
  };
}

export function validateGenerationAgentRequest(
  module: GenerationAgentModule['spec'],
  request: GenerationAgentRequest
): string[] {
  const modeContract = module.protocol[request.mode];
  const issues: string[] = [];

  modeContract.requiredInputFields.forEach((field) => {
    const value = request.inputs[field.name];
    if (!matchesFieldType(value, field.type)) {
      issues.push(`missing or invalid input: ${field.name} (${field.type})`);
    }
  });

  modeContract.requiredArtifacts.forEach((artifact) => {
    if (!request.upstreamArtifacts.includes(artifact.path)) {
      issues.push(`missing required artifact: ${artifact.path}`);
    }
  });

  return issues;
}

export function readStringInput(
  request: GenerationAgentRequest,
  fieldName: string
): string {
  return String(request.inputs[fieldName] || '').trim();
}

export function readNumberInput(
  request: GenerationAgentRequest,
  fieldName: string
): number | undefined {
  const value = request.inputs[fieldName];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readStringArrayInput(
  request: GenerationAgentRequest,
  fieldName: string
): string[] {
  const value = request.inputs[fieldName];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export function buildCommandExample(
  command: string,
  flag: '--describe' | '--example' | '--input',
  arg?: string
): string {
  return [command, flag, arg].filter((value) => Boolean(value)).join(' ');
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function matchesFieldType(value: unknown, type: GenerationAgentFieldType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string' && value.trim().length > 0;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'string[]':
      return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
    case 'object':
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    default:
      return false;
  }
}