import {
  AnimeDramaBlueprint,
  AnimeDramaWorkflowInput,
  PhaseFlowMode,
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

  const phaseFlow = parsePhaseFlowRequest(request.query);
  const contextPremise = stringValue(request.context?.premise);

  if (phaseFlow.mode === 'reset-phase-0' && !phaseFlow.cleanedQuery && !contextPremise) {
    return createErrorResponse(
      'Reset phase requested. Run `ruby scripts/planctl reset` in the project root to restart from phase-0, or provide a new premise to rebuild the blueprint.'
    );
  }

  const workflowInput = requestToWorkflowInput(request, phaseFlow, contextPremise);
  const blueprint = buildAnimeDramaWorkflow(workflowInput);
  const issues = validateAnimeDramaBlueprint(blueprint);

  if (issues.length > 0) {
    return createErrorResponse(`Blueprint validation failed: ${issues.join('; ')}`);
  }

  return createSkillResponse<AnimeDramaBlueprint>(blueprint);
};

function requestToWorkflowInput(
  request: SkillRequest,
  phaseFlow: ParsedPhaseFlowRequest,
  contextPremise?: string
): AnimeDramaWorkflowInput {
  const context = request.context || {};

  return {
    title: stringValue(context.title),
    premise: phaseFlow.cleanedQuery || contextPremise || request.query.trim(),
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
    phaseFlowMode: phaseFlow.mode,
  };
}

interface ParsedPhaseFlowRequest {
  mode: PhaseFlowMode;
  cleanedQuery: string;
}

const RESET_PHASE_PATTERNS = [
  /^\s*reset\s+phase\b[\s:：,，-]*/i,
  /^\s*重置\s*phase\b[\s:：,，-]*/i,
  /^\s*reset\s*阶段\b[\s:：,，-]*/i,
  /^\s*重置阶段\b[\s:：,，-]*/i,
  /^\s*从\s*0\s*开始(?:\s*phase)?[\s:：,，-]*/i,
  /^\s*从零开始(?:\s*phase)?[\s:：,，-]*/i,
];

function parsePhaseFlowRequest(query: string): ParsedPhaseFlowRequest {
  const trimmed = query.trim();

  for (const pattern of RESET_PHASE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        mode: 'reset-phase-0',
        cleanedQuery: trimmed.replace(pattern, '').trim(),
      };
    }
  }

  return {
    mode: 'standard',
    cleanedQuery: trimmed,
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
