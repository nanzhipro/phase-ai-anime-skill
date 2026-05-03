export type TargetPlatform =
  | 'vertical-short'
  | 'episodic-cinematic'
  | 'webtoon-motion'
  | 'character-ip'
  | 'custom';

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | 'custom';

export type ModelCallDepth =
  | 'offline-spec-only'
  | 'local-command-adapter'
  | 'cloud-api-adapter';

export type PhaseFlowMode = 'standard' | 'reset-phase-0';

export type WorkflowNodeType =
  | 'creative'
  | 'storyboard'
  | 'prompting'
  | 'audio'
  | 'generation'
  | 'assembly'
  | 'review';

export type AgentRole = 'phase' | 'node' | 'adapter';

export type ProviderKind =
  | 'image'
  | 'video'
  | 'tts'
  | 'sfx'
  | 'music'
  | 'assembly'
  | 'review';

export interface SkillRequest {
  query: string;
  context?: Record<string, unknown>;
}

export interface SkillResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SkillHandler<TRequest = SkillRequest, TResponse = unknown> = (
  request: TRequest
) => Promise<SkillResponse<TResponse>>;

export interface AnimeDramaWorkflowInput {
  title?: string;
  premise: string;
  targetPlatform?: TargetPlatform;
  aspectRatio?: AspectRatio;
  episodeDurationSeconds?: number;
  episodeCount?: number;
  language?: string;
  styleDirection?: string;
  modelCallDepth?: ModelCallDepth;
  overlays?: string[];
  phaseFlowMode?: PhaseFlowMode;
}

export interface PhaseFlowControl {
  mode: PhaseFlowMode;
  startPhaseId: string;
  resetRequested: boolean;
  commands: string[];
}

export interface AnimeDramaTarget {
  platform: TargetPlatform;
  aspectRatio: AspectRatio;
  episodeDurationSeconds: number;
  episodeCount: number;
  language: string;
  modelCallDepth: ModelCallDepth;
}

export interface PhaseDefinition {
  id: string;
  title: string;
  purpose: string;
  requiredArtifacts: string[];
  dependsOn: string[];
}

export interface WorkflowNode {
  id: string;
  label: string;
  type: WorkflowNodeType;
  inputs: string[];
  outputs: string[];
  requiredArtifacts: string[];
  replaceableBy: string[];
  dependsOn: string[];
  optional: boolean;
  deletable: boolean;
}

export interface AgentHandoff {
  producedArtifacts: string[];
  nextAgentIds: string[];
  notes: string[];
}

export interface AgentSpec {
  id: string;
  label: string;
  role: AgentRole;
  purpose: string;
  ownerPhaseId?: string;
  nodeId?: string;
  adapterSlot?: string;
  inputs: string[];
  outputs: string[];
  allowedPaths: string[];
  requiredArtifacts: string[];
  qualityGates: string[];
  handoffArtifacts: string[];
  forbiddenActions: string[];
  humanApprovalGates: string[];
  handoff: AgentHandoff;
}

export interface ArtifactPlan {
  path: string;
  format: 'markdown' | 'yaml' | 'json' | 'directory';
  purpose: string;
  producedBy: string;
}

export interface TimelineCue {
  id: string;
  kind: 'dialogue' | 'sfx' | 'music' | 'subtitle' | 'silence';
  startSeconds: number;
  endSeconds: number;
  text?: string;
  speaker?: string;
  emotion?: string;
}

export interface ShotTimeline {
  shotId: string;
  startSeconds: number;
  endSeconds: number;
  visualIntent: string;
  camera: string;
  action: string;
  promptRefs: string[];
  audioCues: TimelineCue[];
}

export interface ProviderContract {
  kind: ProviderKind;
  adapterSlot: string;
  inputArtifacts: string[];
  outputArtifacts: string[];
  requiredFields: string[];
  forbiddenFields: string[];
}

export interface AdapterRegistryEntry extends ProviderContract {
  status: 'contract-only' | 'available';
}

export interface AdapterValidationIssue {
  jobId: string;
  code:
    | 'missing_contract'
    | 'provider_bound'
    | 'kind_mismatch'
    | 'adapter_slot_mismatch'
    | 'missing_required_field'
    | 'forbidden_field'
    | 'private_path';
  message: string;
}

export interface AdapterValidationResult {
  valid: boolean;
  issues: AdapterValidationIssue[];
}

export interface GenerationJobSpec {
  jobId: string;
  kind: ProviderKind;
  provider: 'unassigned';
  adapterSlot: string;
  input: Record<string, string | number | string[]>;
  output: {
    expectedPath: string;
    format: string;
  };
  safety: {
    storesSecrets: false;
    requiresHumanApproval: boolean;
  };
}

export interface WorkflowMutationResult {
  success: boolean;
  workflow?: AnimeDramaBlueprint;
  error?: string;
}

export interface AnimeDramaBlueprint {
  kind: 'phase-ai-anime-blueprint';
  version: 1;
  title: string;
  premise: string;
  target: AnimeDramaTarget;
  phaseFlow: PhaseFlowControl;
  styleDirection: string;
  overlays: string[];
  phases: PhaseDefinition[];
  nodes: WorkflowNode[];
  agents: AgentSpec[];
  artifacts: ArtifactPlan[];
  sampleTimeline: ShotTimeline[];
  providerContracts: ProviderContract[];
  generationJobs: GenerationJobSpec[];
  qualityGates: string[];
  nextSteps: string[];
}
