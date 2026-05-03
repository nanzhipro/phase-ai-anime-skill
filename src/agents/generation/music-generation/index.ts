import {
  buildCommandExample,
  createStaticGenerationAgent,
  readStringInput,
} from '../shared/runtime';
import { GenerationAgentRequest } from '../shared/types';

export const musicGenerationExampleRequest: GenerationAgentRequest = {
  mode: 'collaborative',
  inputs: {
    musicBriefPath: 'examples/rainy-convenience-store/anime/audio/episode-001-music-brief.md',
    timingMapPath: 'examples/rainy-convenience-store/anime/audio/episode-001-timeline.yaml',
    outputDir: 'examples/rainy-convenience-store/anime/audio/music',
    audioManifestPath:
      'examples/rainy-convenience-store/anime/audio/episode-001-music-manifest.json',
    musicStemPath: 'examples/rainy-convenience-store/anime/audio/episode-001-music-stem.wav',
    cueVersion: 'v1',
  },
  upstreamArtifacts: ['artifact:music-brief', 'artifact:timing-map'],
  requestedOutputs: ['artifact:audio-manifest', 'artifact:music-stem'],
};

export const musicGenerationAgent = createStaticGenerationAgent({
  spec: {
    id: 'music-generation',
    capabilityId: 'music-generation-capability',
    capabilityKind: 'music-generation',
    label: 'Music-generation Agent',
    purpose:
      'Convert an approved music brief into cue-aligned score stems and timing manifests that can merge with dialogue and SFX.',
    reusableAbilities: [
      'Consumes provider-neutral music briefs.',
      'Outputs a mergeable music stem and manifest without prescribing a specific provider.',
      'Can work independently for score exploration or collaboratively with other audio agents.',
    ],
    specializedAbilities: [
      'Tracks cue versions so score revisions stay auditable.',
      'Keeps score timing aligned to the locked short-form timeline.',
    ],
    usage: {
      summary:
        'Use this agent when the score brief is approved and you need a music stem that stays aligned to the short-form cut.',
      cliExamples: [
        buildCommandExample('phase-ai-anime-music-generation-agent', '--describe'),
        buildCommandExample('phase-ai-anime-music-generation-agent', '--example'),
        buildCommandExample(
          'phase-ai-anime-music-generation-agent',
          '--input',
          './music-generation-request.json'
        ),
      ],
    },
    limitations: [
      'Requires an approved brief; it does not compose from free-form story text.',
      'Produces a score stem only and does not perform the final mix.',
      'Provider execution remains adapter-driven and is not embedded in the agent.',
    ],
    protocol: {
      standalone: {
        requiredInputFields: [
          {
            name: 'musicBriefPath',
            type: 'string',
            required: true,
            description: 'Path to the approved score or cue brief.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where music outputs should be written.',
          },
          {
            name: 'audioManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the music audio manifest will be written.',
          },
          {
            name: 'musicStemPath',
            type: 'string',
            required: true,
            description: 'Target path for the music stem output.',
          },
        ],
        optionalInputFields: [
          {
            name: 'timingMapPath',
            type: 'string',
            required: false,
            description: 'Optional timing map for sync-aware composition.',
          },
          {
            name: 'cueVersion',
            type: 'string',
            required: false,
            description: 'Optional cue version string for auditability.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:music-brief',
            required: true,
            description: 'Locked music brief or cue plan.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:timing-map',
            required: false,
            description: 'Optional timing map aligned to picture or other audio stems.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: true,
            description: 'Music timing manifest for downstream sync or mix.',
          },
          {
            path: 'artifact:music-stem',
            required: true,
            description: 'Music-only stem.',
          },
        ],
        protocolConditions: [
          'Cue intent must remain stable across reruns so edits stay reviewable.',
          'If no timing map is present, the output is only suitable for exploratory review.',
          'The music stem must remain isolated from dialogue and SFX.',
        ],
        collaboratorIds: ['video-generation', 'tts-generation', 'sfx-generation'],
      },
      collaborative: {
        requiredInputFields: [
          {
            name: 'musicBriefPath',
            type: 'string',
            required: true,
            description: 'Path to the approved score or cue brief.',
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
            description: 'Directory where music outputs should be written.',
          },
          {
            name: 'audioManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the music audio manifest will be written.',
          },
          {
            name: 'musicStemPath',
            type: 'string',
            required: true,
            description: 'Target path for the music stem output.',
          },
        ],
        optionalInputFields: [
          {
            name: 'cueVersion',
            type: 'string',
            required: false,
            description: 'Optional cue version string for auditability.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:music-brief',
            required: true,
            description: 'Locked music brief or cue plan.',
          },
          {
            path: 'artifact:timing-map',
            required: true,
            description: 'Locked timing map aligned to picture or other audio stems.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: false,
            description: 'Optional upstream audio-manifest for merge planning.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: true,
            description: 'Music timing manifest for downstream sync or mix.',
          },
          {
            path: 'artifact:music-stem',
            required: true,
            description: 'Music-only stem.',
          },
        ],
        protocolConditions: [
          'Collaborative mode requires the timing map to be locked before composition.',
          'Cue revisions should be surfaced via cueVersion so downstream agents can detect score changes.',
          'The music stem must remain isolated from dialogue and SFX for independent iteration.',
        ],
        collaboratorIds: ['video-generation', 'tts-generation', 'sfx-generation'],
      },
    },
  },
  exampleRequest: musicGenerationExampleRequest,
  buildSuccess(request) {
    const musicBriefPath = readStringInput(request, 'musicBriefPath');
    const timingMapPath = readStringInput(request, 'timingMapPath');
    const outputDir = readStringInput(request, 'outputDir');
    const audioManifestPath = readStringInput(request, 'audioManifestPath');
    const musicStemPath = readStringInput(request, 'musicStemPath');
    const cueVersion = readStringInput(request, 'cueVersion');

    return {
      summary: `Prepared music generation package in ${request.mode} mode${cueVersion ? ` (${cueVersion})` : ''}.`,
      warnings:
        timingMapPath.length > 0
          ? []
          : ['No timingMapPath provided; the score output is suitable only for exploratory review.'],
      nextAgentHints: ['video-generation'],
      output: {
        artifactBindings: {
          'artifact:music-brief': musicBriefPath,
          'artifact:timing-map': timingMapPath || undefined,
          'artifact:audio-manifest': audioManifestPath,
          'artifact:music-stem': musicStemPath,
        },
        outputDir,
        cueVersion: cueVersion || undefined,
      },
    };
  },
});

export const runMusicGenerationAgent = musicGenerationAgent.run;