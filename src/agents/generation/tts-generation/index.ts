import {
  buildCommandExample,
  createStaticGenerationAgent,
  readStringInput,
} from '../shared/runtime';
import { GenerationAgentRequest } from '../shared/types';

export const ttsGenerationExampleRequest: GenerationAgentRequest = {
  mode: 'collaborative',
  inputs: {
    dialogueScriptPath: 'examples/rainy-convenience-store/anime/storyboard/episode-001-dialogue-lines.yaml',
    language: 'zh-CN',
    voiceProfilePath: 'profiles/character-ip/profile.yaml',
    outputDir: 'examples/rainy-convenience-store/anime/audio/dialogue',
    audioManifestPath:
      'examples/rainy-convenience-store/anime/audio/episode-001-tts-manifest.json',
    dialogueStemPath:
      'examples/rainy-convenience-store/anime/audio/episode-001-dialogue-stem.wav',
  },
  upstreamArtifacts: ['artifact:dialogue-script', 'artifact:voice-casting-sheet'],
  requestedOutputs: ['artifact:audio-manifest', 'artifact:dialogue-stem'],
};

export const ttsGenerationAgent = createStaticGenerationAgent({
  spec: {
    id: 'tts-generation',
    capabilityId: 'tts-generation-capability',
    capabilityKind: 'tts-generation',
    label: 'TTS-generation Agent',
    purpose:
      'Convert locked dialogue scripts into speech-ready stems and timing manifests that other agents can consume.',
    reusableAbilities: [
      'Consumes provider-neutral dialogue scripts and voice plans.',
      'Produces an audio-manifest that can merge with SFX and music without changing the protocol.',
      'Can operate alone for dialogue review or as part of a collaborative audio pipeline.',
    ],
    specializedAbilities: [
      'Maintains per-line timing traceability for lip-sync or subtitle alignment.',
      'Packages dialogue stems separately from mixed audio.',
    ],
    usage: {
      summary:
        'Use this agent when dialogue lines are locked and you need voice-ready stems plus a timing manifest.',
      cliExamples: [
        buildCommandExample('phase-ai-anime-tts-generation-agent', '--describe'),
        buildCommandExample('phase-ai-anime-tts-generation-agent', '--example'),
        buildCommandExample(
          'phase-ai-anime-tts-generation-agent',
          '--input',
          './tts-generation-request.json'
        ),
      ],
    },
    limitations: [
      'Requires a dialogue script and voice-casting agreement before synthesis.',
      'Does not mix SFX or music; it only prepares dialogue outputs.',
      'Provider execution remains adapter-driven and is not hard-coded in the agent.',
    ],
    protocol: {
      standalone: {
        requiredInputFields: [
          {
            name: 'dialogueScriptPath',
            type: 'string',
            required: true,
            description: 'Path to the locked dialogue lines or script manifest.',
          },
          {
            name: 'language',
            type: 'string',
            required: true,
            description: 'Language code for dialogue synthesis.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where dialogue audio outputs should be written.',
          },
          {
            name: 'audioManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the dialogue audio manifest will be written.',
          },
          {
            name: 'dialogueStemPath',
            type: 'string',
            required: true,
            description: 'Target path for the dialogue stem output.',
          },
        ],
        optionalInputFields: [
          {
            name: 'voiceProfilePath',
            type: 'string',
            required: false,
            description: 'Optional path to a voice profile or casting sheet binding.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:dialogue-script',
            required: true,
            description: 'Locked dialogue script with line ids and timing cues.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:voice-casting-sheet',
            required: false,
            description: 'Optional voice-casting sheet for character/voice binding.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: true,
            description: 'Dialogue timing manifest for downstream merging or sync.',
          },
          {
            path: 'artifact:dialogue-stem',
            required: true,
            description: 'Dialogue-only audio stem.',
          },
        ],
        protocolConditions: [
          'Dialogue line ids must remain stable across TTS reruns.',
          'The produced audio-manifest should preserve timestamps per dialogue line.',
          'This agent does not create a full mix; downstream agents merge audio stems.',
        ],
        collaboratorIds: ['video-generation', 'sfx-generation', 'music-generation'],
      },
      collaborative: {
        requiredInputFields: [
          {
            name: 'dialogueScriptPath',
            type: 'string',
            required: true,
            description: 'Path to the locked dialogue lines or script manifest.',
          },
          {
            name: 'language',
            type: 'string',
            required: true,
            description: 'Language code for dialogue synthesis.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where dialogue audio outputs should be written.',
          },
          {
            name: 'audioManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the dialogue audio manifest will be written.',
          },
          {
            name: 'dialogueStemPath',
            type: 'string',
            required: true,
            description: 'Target path for the dialogue stem output.',
          },
        ],
        optionalInputFields: [
          {
            name: 'voiceProfilePath',
            type: 'string',
            required: false,
            description: 'Optional path to a voice profile or casting sheet binding.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:dialogue-script',
            required: true,
            description: 'Locked dialogue script with line ids and timing cues.',
          },
          {
            path: 'artifact:voice-casting-sheet',
            required: true,
            description: 'Approved voice plan mapping characters to voices.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:timing-map',
            required: false,
            description: 'Optional timing map to keep dialogue aligned with picture or music.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: true,
            description: 'Dialogue timing manifest for downstream merging or sync.',
          },
          {
            path: 'artifact:dialogue-stem',
            required: true,
            description: 'Dialogue-only audio stem.',
          },
        ],
        protocolConditions: [
          'Collaborative mode requires the voice-casting sheet to be locked before synthesis.',
          'The produced audio-manifest must keep line ids stable for subtitle, lip-sync, or QC tools.',
          'Dialogue stems remain unmixed so SFX and music can iterate independently.',
        ],
        collaboratorIds: ['video-generation', 'sfx-generation', 'music-generation'],
      },
    },
  },
  exampleRequest: ttsGenerationExampleRequest,
  buildSuccess(request) {
    const dialogueScriptPath = readStringInput(request, 'dialogueScriptPath');
    const language = readStringInput(request, 'language');
    const voiceProfilePath = readStringInput(request, 'voiceProfilePath');
    const outputDir = readStringInput(request, 'outputDir');
    const audioManifestPath = readStringInput(request, 'audioManifestPath');
    const dialogueStemPath = readStringInput(request, 'dialogueStemPath');

    return {
      summary: `Prepared dialogue synthesis package for language ${language} in ${request.mode} mode.`,
      warnings:
        voiceProfilePath.length > 0
          ? []
          : ['No voiceProfilePath provided; downstream quality will depend on the provider default voice choice.'],
      nextAgentHints: ['video-generation'],
      output: {
        artifactBindings: {
          'artifact:dialogue-script': dialogueScriptPath,
          'artifact:audio-manifest': audioManifestPath,
          'artifact:dialogue-stem': dialogueStemPath,
        },
        outputDir,
        language,
        voiceProfilePath: voiceProfilePath || undefined,
      },
    };
  },
});

export const runTtsGenerationAgent = ttsGenerationAgent.run;