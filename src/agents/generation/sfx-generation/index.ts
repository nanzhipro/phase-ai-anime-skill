import {
  buildCommandExample,
  createStaticGenerationAgent,
  readStringInput,
} from '../shared/runtime';
import { GenerationAgentRequest } from '../shared/types';

export const sfxGenerationExampleRequest: GenerationAgentRequest = {
  mode: 'collaborative',
  inputs: {
    cueSheetPath: 'examples/rainy-convenience-store/anime/audio/episode-001-sfx-cues.yaml',
    timingMapPath: 'examples/rainy-convenience-store/anime/audio/episode-001-timeline.yaml',
    outputDir: 'examples/rainy-convenience-store/anime/audio/sfx',
    audioManifestPath:
      'examples/rainy-convenience-store/anime/audio/episode-001-sfx-manifest.json',
    sfxStemPath: 'examples/rainy-convenience-store/anime/audio/episode-001-sfx-stem.wav',
  },
  upstreamArtifacts: ['artifact:cue-sheet', 'artifact:timing-map'],
  requestedOutputs: ['artifact:audio-manifest', 'artifact:sfx-stem'],
};

export const sfxGenerationAgent = createStaticGenerationAgent({
  spec: {
    id: 'sfx-generation',
    capabilityId: 'sfx-generation-capability',
    capabilityKind: 'sfx-generation',
    label: 'SFX-generation Agent',
    purpose:
      'Turn approved SFX cue sheets into event-aligned effect stems and timing manifests that can merge with dialogue and music.',
    reusableAbilities: [
      'Consumes provider-neutral cue sheets.',
      'Produces timing-safe SFX stems and manifests that can be merged without reauthoring video.',
      'Supports standalone preview rendering or collaborative sync-aware audio work.',
    ],
    specializedAbilities: [
      'Aligns transient events to exact cue timings.',
      'Keeps SFX isolated in a dedicated stem for independent revision.',
    ],
    usage: {
      summary:
        'Use this agent when spot effects are locked and need their own stem plus a mergeable manifest.',
      cliExamples: [
        buildCommandExample('phase-ai-anime-sfx-generation-agent', '--describe'),
        buildCommandExample('phase-ai-anime-sfx-generation-agent', '--example'),
        buildCommandExample(
          'phase-ai-anime-sfx-generation-agent',
          '--input',
          './sfx-generation-request.json'
        ),
      ],
    },
    limitations: [
      'Requires cue timing prepared upstream; it does not detect sound opportunities automatically.',
      'Produces an isolated effects stem and does not perform the final mix.',
      'Provider execution remains adapter-driven and is not embedded in the agent.',
    ],
    protocol: {
      standalone: {
        requiredInputFields: [
          {
            name: 'cueSheetPath',
            type: 'string',
            required: true,
            description: 'Path to the approved SFX cue sheet.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where SFX outputs should be written.',
          },
          {
            name: 'audioManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the SFX audio manifest will be written.',
          },
          {
            name: 'sfxStemPath',
            type: 'string',
            required: true,
            description: 'Target path for the SFX stem output.',
          },
        ],
        optionalInputFields: [
          {
            name: 'timingMapPath',
            type: 'string',
            required: false,
            description: 'Optional timing map for sync-aware placement.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:cue-sheet',
            required: true,
            description: 'Locked effect cues with cue ids and placements.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:timing-map',
            required: false,
            description: 'Optional timing map aligned to picture or audio stems.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: true,
            description: 'SFX timing manifest for downstream sync or mix.',
          },
          {
            path: 'artifact:sfx-stem',
            required: true,
            description: 'Effects-only audio stem.',
          },
        ],
        protocolConditions: [
          'Cue ids must remain stable across revisions.',
          'If no timing map is provided, the result is a loose preview and should be labeled as such.',
          'This agent never writes dialogue or music into the SFX stem.',
        ],
        collaboratorIds: ['video-generation', 'tts-generation', 'music-generation'],
      },
      collaborative: {
        requiredInputFields: [
          {
            name: 'cueSheetPath',
            type: 'string',
            required: true,
            description: 'Path to the approved SFX cue sheet.',
          },
          {
            name: 'timingMapPath',
            type: 'string',
            required: true,
            description: 'Path to the locked timing map or timeline.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where SFX outputs should be written.',
          },
          {
            name: 'audioManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the SFX audio manifest will be written.',
          },
          {
            name: 'sfxStemPath',
            type: 'string',
            required: true,
            description: 'Target path for the SFX stem output.',
          },
        ],
        optionalInputFields: [],
        requiredArtifacts: [
          {
            path: 'artifact:cue-sheet',
            required: true,
            description: 'Locked effect cues with cue ids and placements.',
          },
          {
            path: 'artifact:timing-map',
            required: true,
            description: 'Locked timing map aligned to picture or audio stems.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:rendered-video',
            required: false,
            description: 'Optional preview render used only for QC confirmation.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: true,
            description: 'SFX timing manifest for downstream sync or mix.',
          },
          {
            path: 'artifact:sfx-stem',
            required: true,
            description: 'Effects-only audio stem.',
          },
        ],
        protocolConditions: [
          'Collaborative mode requires the timing map to be locked before synthesis.',
          'All cue ids and timings must be reflected verbatim in the produced audio-manifest.',
          'The SFX stem stays isolated so dialogue and music agents can iterate independently.',
        ],
        collaboratorIds: ['video-generation', 'tts-generation', 'music-generation'],
      },
    },
  },
  exampleRequest: sfxGenerationExampleRequest,
  buildSuccess(request) {
    const cueSheetPath = readStringInput(request, 'cueSheetPath');
    const timingMapPath = readStringInput(request, 'timingMapPath');
    const outputDir = readStringInput(request, 'outputDir');
    const audioManifestPath = readStringInput(request, 'audioManifestPath');
    const sfxStemPath = readStringInput(request, 'sfxStemPath');

    return {
      summary: `Prepared SFX generation package in ${request.mode} mode.`,
      warnings:
        timingMapPath.length > 0
          ? []
          : ['No timingMapPath provided; SFX placement will only be preview-level.'],
      nextAgentHints: ['video-generation'],
      output: {
        artifactBindings: {
          'artifact:cue-sheet': cueSheetPath,
          'artifact:timing-map': timingMapPath || undefined,
          'artifact:audio-manifest': audioManifestPath,
          'artifact:sfx-stem': sfxStemPath,
        },
        outputDir,
      },
    };
  },
});

export const runSfxGenerationAgent = sfxGenerationAgent.run;