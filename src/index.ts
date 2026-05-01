import {
  AnimeDramaBlueprint,
  AnimeDramaWorkflowInput,
  SkillHandler,
  SkillRequest,
  SkillResponse,
} from './types';
import {
  buildAnimeDramaWorkflow,
  insertWorkflowNode,
  removeWorkflowNode,
  validateAnimeDramaBlueprint,
} from './workflow';

export function createSkillResponse<T>(
  data: T,
  success = true
): SkillResponse<T> {
  return { success, data };
}

export function createErrorResponse(error: string): SkillResponse<never> {
  return { success: false, error };
}

export const animeSkillHandler: SkillHandler<
  SkillRequest,
  AnimeDramaBlueprint
> = async (request) => {
  if (!request.query?.trim()) {
    return createErrorResponse('Query is required');
  }

  const workflowInput = requestToWorkflowInput(request);
  const blueprint = buildAnimeDramaWorkflow(workflowInput);
  const issues = validateAnimeDramaBlueprint(blueprint);

  if (issues.length > 0) {
    return createErrorResponse(`Blueprint validation failed: ${issues.join('; ')}`);
  }

  return createSkillResponse<AnimeDramaBlueprint>(blueprint);
};

function requestToWorkflowInput(request: SkillRequest): AnimeDramaWorkflowInput {
  const context = request.context || {};

  return {
    title: stringValue(context.title),
    premise: request.query,
    targetPlatform: enumValue(context.targetPlatform, [
      'vertical-short',
      'episodic-cinematic',
      'webtoon-motion',
      'character-ip',
      'custom',
    ]),
    aspectRatio: enumValue(context.aspectRatio, ['9:16', '16:9', '1:1', '4:5', 'custom']),
    episodeDurationSeconds: numberValue(context.episodeDurationSeconds),
    episodeCount: numberValue(context.episodeCount),
    language: stringValue(context.language),
    styleDirection: stringValue(context.styleDirection),
    modelCallDepth: enumValue(context.modelCallDepth, [
      'offline-spec-only',
      'local-command-adapter',
      'cloud-api-adapter',
    ]),
    overlays: stringArrayValue(context.overlays),
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );

  return strings.length > 0 ? strings : undefined;
}

function enumValue<TValue extends string>(
  value: unknown,
  allowedValues: TValue[]
): TValue | undefined {
  return typeof value === 'string' && allowedValues.includes(value as TValue)
    ? (value as TValue)
    : undefined;
}

export {
  buildAnimeDramaWorkflow,
  insertWorkflowNode,
  removeWorkflowNode,
  validateAnimeDramaBlueprint,
};
export {
  createAdapterRegistry,
  validateGenerationJobAgainstContract,
  validateGenerationJobsAgainstContracts,
} from './adapters';

export * from './types';
