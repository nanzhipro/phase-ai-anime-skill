import { GenerationCapabilityKind } from '../../../types';

export type GenerationAgentId =
  | 'text-to-image'
  | 'video-generation'
  | 'tts-generation'
  | 'sfx-generation'
  | 'music-generation';

export type GenerationAgentMode = 'standalone' | 'collaborative';

export type GenerationAgentFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'object';

export interface GenerationAgentFieldContract {
  name: string;
  type: GenerationAgentFieldType;
  required: boolean;
  description: string;
}

export interface GenerationAgentArtifactContract {
  path: string;
  required: boolean;
  description: string;
}

export interface GenerationAgentModeContract {
  requiredInputFields: GenerationAgentFieldContract[];
  optionalInputFields: GenerationAgentFieldContract[];
  requiredArtifacts: GenerationAgentArtifactContract[];
  optionalArtifacts: GenerationAgentArtifactContract[];
  producedArtifacts: GenerationAgentArtifactContract[];
  protocolConditions: string[];
  collaboratorIds?: GenerationAgentId[];
}

export interface GenerationAgentUsage {
  summary: string;
  cliExamples: string[];
}

export interface GenerationAgentSpec {
  id: GenerationAgentId;
  capabilityId: string;
  capabilityKind: GenerationCapabilityKind;
  label: string;
  purpose: string;
  reusableAbilities: string[];
  specializedAbilities: string[];
  usage: GenerationAgentUsage;
  limitations: string[];
  protocol: {
    standalone: GenerationAgentModeContract;
    collaborative: GenerationAgentModeContract;
  };
}

export interface GenerationAgentRequest {
  mode: GenerationAgentMode;
  inputs: Record<string, unknown>;
  upstreamArtifacts: string[];
  requestedOutputs?: string[];
  metadata?: Record<string, string>;
}

export interface GenerationAgentResult {
  agentId: GenerationAgentId;
  capabilityId: string;
  mode: GenerationAgentMode;
  success: boolean;
  status: 'ready' | 'blocked';
  summary: string;
  consumedArtifacts: string[];
  producedArtifacts: string[];
  collaborationProtocol: string[];
  warnings: string[];
  errors: string[];
  nextAgentHints: GenerationAgentId[];
  output: Record<string, unknown>;
}

export interface GenerationAgentModule {
  spec: GenerationAgentSpec;
  exampleRequest: GenerationAgentRequest;
  run: (request: GenerationAgentRequest) => GenerationAgentResult;
}

export interface GenerationAgentCliExecution {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface StaticGenerationAgentConfig {
  spec: GenerationAgentSpec;
  exampleRequest: GenerationAgentRequest;
  buildSuccess: (request: GenerationAgentRequest) => {
    summary: string;
    warnings?: string[];
    nextAgentHints?: GenerationAgentId[];
    output: Record<string, unknown>;
  };
}