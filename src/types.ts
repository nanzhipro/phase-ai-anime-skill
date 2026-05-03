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

export type AgentRole = 'phase' | 'node' | 'capability' | 'adapter';

export type GenerationCapabilityKind =
  | 'text-to-image'
  | 'video-generation'
  | 'tts-generation'
  | 'sfx-generation'
  | 'music-generation';

export type CapabilityExecutionMode = 'standalone' | 'collaborative' | 'standalone-or-collaborative';

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
  requiresUserConfirmation: boolean;
  confirmationArtifacts: string[];
  transitionManifest?: string;
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
  requiresUserConfirmation: boolean;
  trackingManifest?: string;
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
  capabilityId?: string;
  capabilityKind?: GenerationCapabilityKind;
  executionMode?: CapabilityExecutionMode;
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
  format: 'markdown' | 'yaml' | 'json' | 'directory' | 'video';
  purpose: string;
  producedBy: string;
}

export interface GenerationCapabilitySpec {
  id: string;
  label: string;
  kind: GenerationCapabilityKind;
  executionMode: CapabilityExecutionMode;
  purpose: string;
  nodeIds: string[];
  adapterSlots: string[];
  inputs: string[];
  outputs: string[];
  reusableAbilities: string[];
  specializedAbilities: string[];
  collaborationInputs: string[];
  collaborationOutputs: string[];
  collaboratesWith: string[];
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
  trackingManifest: string;
  requiredFields: string[];
  forbiddenFields: string[];
  recommendedProviders: string[];
}

export type BuiltInProvider =
  | 'volcengine-seedream'
  | 'volcengine-seedance'
  | 'volcengine-openspeech-tts'
  | 'custom-http-sfx'
  | 'custom-http-music';

export interface AdapterRegistryEntry extends ProviderContract {
  status: 'contract-only' | 'available';
}

export interface AdapterHttpRequest {
  method: 'GET' | 'POST';
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface AdapterHttpResponse {
  status: number;
  ok: boolean;
  json: unknown;
}

export type AdapterTransport = (
  request: AdapterHttpRequest
) => Promise<AdapterHttpResponse>;

export interface AdapterPollTemplate {
  method: 'GET';
  urlTemplate: string;
  headers: Record<string, string>;
}

export interface ProviderExecutionPlan {
  provider: BuiltInProvider;
  model: string;
  jobId: string;
  adapterSlot: string;
  request: AdapterHttpRequest;
  poll?: AdapterPollTemplate;
  notes: string[];
}

export interface ProviderExecutionOutput {
  expectedPath: string;
  format: string;
  url?: string;
  b64Json?: string;
  size?: string;
}

export interface ProviderExecutionResult {
  provider: BuiltInProvider;
  model: string;
  jobId: string;
  adapterSlot: string;
  status: 'submitted' | 'succeeded';
  taskId?: string;
  manifestPath: string;
  outputs: ProviderExecutionOutput[];
  manifestPatch: Record<string, unknown>;
  response: unknown;
  pollAttempts?: number;
}

export interface VolcengineAdapterBaseOptions {
  apiKey?: string;
  apiKeyEnvVar?: string;
  baseUrl?: string;
  transport?: AdapterTransport;
}

export interface VolcengineImageExecutionOptions
  extends VolcengineAdapterBaseOptions {
  prompt: string;
  model?: string;
  size?: string;
  outputFormat?: 'png' | 'jpeg';
  responseFormat?: 'url' | 'b64_json';
  watermark?: boolean;
  sequentialImageGeneration?: 'auto' | 'disabled';
  maxImages?: number;
}

export interface VolcengineVideoImageInput {
  url: string;
  role?: 'first_frame' | 'last_frame' | 'reference_image';
}

export interface VolcengineVideoVideoInput {
  url: string;
  role?: 'reference_video';
}

export interface VolcengineVideoAudioInput {
  url: string;
  role?: 'reference_audio';
}

export interface VolcengineSeedanceExecutionOptions
  extends VolcengineAdapterBaseOptions {
  prompt?: string;
  model?: string;
  images?: Array<string | VolcengineVideoImageInput>;
  videos?: Array<string | VolcengineVideoVideoInput>;
  audios?: Array<string | VolcengineVideoAudioInput>;
  duration?: number;
  ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive';
  resolution?: '480p' | '720p' | '1080p';
  watermark?: boolean;
  generateAudio?: boolean;
  returnLastFrame?: boolean;
  serviceTier?: 'default' | 'flex';
  executionExpiresAfter?: number;
  safetyIdentifier?: string;
  seed?: number;
  autoPoll?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  waiter?: (ms: number) => Promise<void>;
}

export interface VolcengineOpenSpeechTtsExecutionOptions
  extends VolcengineAdapterBaseOptions {
  text: string;
  appId: string;
  resourceId: string;
  voiceType: string;
  voice?: string;
  language?: string;
  audioFormat?: 'pcm' | 'wav' | 'mp3' | 'ogg_opus';
  sampleRate?: number;
  volume?: number;
  speed?: number;
  pitch?: number;
  enableSubtitle?: 0 | 1 | 2 | 3;
  sentenceInterval?: number;
  style?: string;
  callbackUrl?: string;
  emotionPrediction?: boolean;
  autoPoll?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  waiter?: (ms: number) => Promise<void>;
}

export interface CustomHttpAudioExecutionOptions
  extends VolcengineAdapterBaseOptions {
  provider: 'custom-http-sfx' | 'custom-http-music';
  prompt: string;
  model: string;
  submitUrl: string;
  queryUrlTemplate: string;
  durationSeconds?: number;
  format?: string;
  requestBody?: Record<string, unknown>;
  authHeaderName?: string;
  authScheme?: 'bearer' | 'plain';
  autoPoll?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  waiter?: (ms: number) => Promise<void>;
}

export interface VolcengineRuntimeEnvironmentOptions {
  apiKeyEnvVar?: string;
  explicitApiKey?: string;
  cwd?: string;
  envFileName?: string;
  templateFileName?: string;
  env?: Record<string, string | undefined>;
  readFile?: (filePath: string) => string | undefined;
}

export interface VolcengineRuntimeEnvironmentStatus {
  ready: boolean;
  apiKeyEnvVar: string;
  source: 'explicit' | 'process.env' | '.env' | 'missing' | 'invalid';
  envFilePath: string;
  templateFilePath: string;
  message: string;
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
  manifestPath: string;
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
  generationCapabilities: GenerationCapabilitySpec[];
  agents: AgentSpec[];
  artifacts: ArtifactPlan[];
  sampleTimeline: ShotTimeline[];
  providerContracts: ProviderContract[];
  generationJobs: GenerationJobSpec[];
  qualityGates: string[];
  nextSteps: string[];
}
