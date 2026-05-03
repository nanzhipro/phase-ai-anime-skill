import {
  buildCommandExample,
  createStaticGenerationAgent,
  readNumberInput,
  readStringInput,
} from '../shared/runtime';
import { GenerationAgentRequest } from '../shared/types';

export const videoGenerationExampleRequest: GenerationAgentRequest = {
  mode: 'collaborative',
  inputs: {
    shotPlanPath: 'examples/rainy-convenience-store/anime/storyboard/episode-001-shots.yaml',
    imageManifestPath:
      'examples/rainy-convenience-store/anime/jobs/episode-001-image-manifest.json',
    durationSeconds: 15,
    aspectRatio: '9:16',
    outputDir: 'examples/rainy-convenience-store/anime/renders/video',
    videoManifestPath:
      'examples/rainy-convenience-store/anime/jobs/episode-001-video-manifest.json',
    finalVideoPath: 'examples/rainy-convenience-store/anime/assembly/episode-001-preview.mp4',
    audioManifestPath:
      'examples/rainy-convenience-store/anime/audio/episode-001-audio-manifest.json',
  },
  upstreamArtifacts: [
    'artifact:video-shot-plan',
    'artifact:image-manifest',
    'artifact:audio-manifest',
  ],
  requestedOutputs: ['artifact:video-manifest', 'artifact:rendered-video'],
};

export const videoGenerationAgent = createStaticGenerationAgent({
  spec: {
    id: 'video-generation',
    capabilityId: 'video-generation-capability',
    capabilityKind: 'video-generation',
    label: 'Video-generation Agent',
    purpose:
      'Animate approved still-image or media inputs into a locked short-form video package with shot and timing traceability.',
    reusableAbilities: [
      'Consumes image-manifest outputs from text-to-image or other approved still-image sources.',
      'Accepts optional audio-manifest coordination without forcing an audio provider choice.',
      'Returns manifest-driven outputs for QC or assembly.',
    ],
    specializedAbilities: [
      'Preserves shot timing for the 15-second MVP chain.',
      'Packages video outputs so downstream assembly can trace every shot back to its source image id.',
    ],
    usage: {
      summary:
        'Use this agent when shot plan and keyframes are locked and you need a provider-neutral video generation handoff.',
      cliExamples: [
        buildCommandExample('phase-ai-anime-video-generation-agent', '--describe'),
        buildCommandExample('phase-ai-anime-video-generation-agent', '--example'),
        buildCommandExample(
          'phase-ai-anime-video-generation-agent',
          '--input',
          './video-generation-request.json'
        ),
      ],
    },
    limitations: [
      'Requires pre-approved visual inputs; it does not invent narrative timing by itself.',
      'Treats audio as an optional collaboration layer and does not synthesize audio.',
      'Real provider execution remains delegated to adapter contracts.',
    ],
    protocol: {
      standalone: {
        requiredInputFields: [
          {
            name: 'shotPlanPath',
            type: 'string',
            required: true,
            description: 'Path to the video shot plan or animatic timing file.',
          },
          {
            name: 'imageManifestPath',
            type: 'string',
            required: true,
            description: 'Path to the image manifest or approved still-image source manifest.',
          },
          {
            name: 'durationSeconds',
            type: 'number',
            required: true,
            description: 'Target total duration, kept at 15 seconds for the MVP.',
          },
          {
            name: 'aspectRatio',
            type: 'string',
            required: true,
            description: 'Target output aspect ratio.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where intermediate video renders should be written.',
          },
          {
            name: 'videoManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the produced video manifest will be written.',
          },
          {
            name: 'finalVideoPath',
            type: 'string',
            required: true,
            description: 'Target path for the rendered video output.',
          },
        ],
        optionalInputFields: [
          {
            name: 'audioManifestPath',
            type: 'string',
            required: false,
            description: 'Optional audio coordination manifest.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:video-shot-plan',
            required: true,
            description: 'Locked shot timing and framing plan.',
          },
          {
            path: 'artifact:image-manifest',
            required: true,
            description: 'Still-image inputs referenced by stable shot ids.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: false,
            description: 'Optional audio timing and asset manifest for sync-aware rendering.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:video-manifest',
            required: true,
            description: 'Manifest describing rendered shot outputs and timing.',
          },
          {
            path: 'artifact:rendered-video',
            required: true,
            description: 'Rendered short-form video output.',
          },
        ],
        protocolConditions: [
          'The shot plan must already be locked to keep the MVP deterministic.',
          'Every rendered segment must preserve the input shot id from image-manifest.',
          'If audio is omitted, the result remains a silent preview and should be labeled as such.',
        ],
        collaboratorIds: ['text-to-image', 'tts-generation', 'sfx-generation', 'music-generation'],
      },
      collaborative: {
        requiredInputFields: [
          {
            name: 'shotPlanPath',
            type: 'string',
            required: true,
            description: 'Path to the video shot plan or animatic timing file.',
          },
          {
            name: 'imageManifestPath',
            type: 'string',
            required: true,
            description: 'Path to the image manifest produced by text-to-image.',
          },
          {
            name: 'durationSeconds',
            type: 'number',
            required: true,
            description: 'Target total duration, kept at 15 seconds for the MVP.',
          },
          {
            name: 'aspectRatio',
            type: 'string',
            required: true,
            description: 'Target output aspect ratio.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where intermediate video renders should be written.',
          },
          {
            name: 'videoManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the produced video manifest will be written.',
          },
          {
            name: 'finalVideoPath',
            type: 'string',
            required: true,
            description: 'Target path for the rendered video output.',
          },
        ],
        optionalInputFields: [
          {
            name: 'audioManifestPath',
            type: 'string',
            required: false,
            description: 'Optional path to the merged audio manifest for sync-aware rendering.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:video-shot-plan',
            required: true,
            description: 'Locked shot timing and framing plan.',
          },
          {
            path: 'artifact:image-manifest',
            required: true,
            description: 'Still-image inputs referenced by stable shot ids.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:audio-manifest',
            required: false,
            description: 'Merged dialogue, SFX, and music timing manifest.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:video-manifest',
            required: true,
            description: 'Manifest describing rendered shot outputs and timing.',
          },
          {
            path: 'artifact:rendered-video',
            required: true,
            description: 'Rendered short-form video output.',
          },
        ],
        protocolConditions: [
          'Collaborative mode expects shot ids to match text-to-image output exactly.',
          'If artifact:audio-manifest is present, the final video timing must remain sync-safe with that manifest.',
          'The produced video-manifest must preserve a back-reference to the source image-manifest.',
        ],
        collaboratorIds: ['text-to-image', 'tts-generation', 'sfx-generation', 'music-generation'],
      },
    },
  },
  exampleRequest: videoGenerationExampleRequest,
  buildSuccess(request) {
    const shotPlanPath = readStringInput(request, 'shotPlanPath');
    const imageManifestPath = readStringInput(request, 'imageManifestPath');
    const videoManifestPath = readStringInput(request, 'videoManifestPath');
    const finalVideoPath = readStringInput(request, 'finalVideoPath');
    const outputDir = readStringInput(request, 'outputDir');
    const aspectRatio = readStringInput(request, 'aspectRatio');
    const audioManifestPath = readStringInput(request, 'audioManifestPath');
    const durationSeconds = readNumberInput(request, 'durationSeconds');

    return {
      summary: `Prepared video generation package for ${durationSeconds || 0}s ${aspectRatio} output in ${request.mode} mode.`,
      warnings:
        audioManifestPath.length > 0
          ? []
          : ['No audioManifestPath provided; the result should be treated as a silent preview render.'],
      nextAgentHints: [],
      output: {
        artifactBindings: {
          'artifact:video-shot-plan': shotPlanPath,
          'artifact:image-manifest': imageManifestPath,
          'artifact:audio-manifest': audioManifestPath || undefined,
          'artifact:video-manifest': videoManifestPath,
          'artifact:rendered-video': finalVideoPath,
        },
        outputDir,
        durationSeconds,
        aspectRatio,
        assemblyReady: audioManifestPath.length > 0,
      },
    };
  },
});

export const runVideoGenerationAgent = videoGenerationAgent.run;