import { GenerationAgentId, GenerationAgentModule } from './shared/types';
import { musicGenerationAgent } from './music-generation';
import { sfxGenerationAgent } from './sfx-generation';
import { textToImageAgent } from './text-to-image';
import { ttsGenerationAgent } from './tts-generation';
import { videoGenerationAgent } from './video-generation';

const REGISTRY: Record<GenerationAgentId, GenerationAgentModule> = {
  'text-to-image': textToImageAgent,
  'video-generation': videoGenerationAgent,
  'tts-generation': ttsGenerationAgent,
  'sfx-generation': sfxGenerationAgent,
  'music-generation': musicGenerationAgent,
};

export function listGenerationAgents(): GenerationAgentModule[] {
  return Object.values(REGISTRY);
}

export function getGenerationAgent(
  agentId: GenerationAgentId
): GenerationAgentModule {
  return REGISTRY[agentId];
}

export function hasGenerationAgent(agentId: string): agentId is GenerationAgentId {
  return Object.prototype.hasOwnProperty.call(REGISTRY, agentId);
}