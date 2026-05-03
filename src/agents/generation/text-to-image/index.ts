import {
  buildCommandExample,
  createStaticGenerationAgent,
  readStringArrayInput,
  readStringInput,
} from '../shared/runtime';
import { GenerationAgentRequest } from '../shared/types';

export const textToImageExampleRequest: GenerationAgentRequest = {
  mode: 'standalone',
  inputs: {
    promptManifestPath:
      'examples/rainy-convenience-store/anime/prompts/episode-001-image-prompts.yaml',
    promptRefs: ['shot-001', 'shot-002', 'shot-003'],
    aspectRatio: '9:16',
    outputDir: 'examples/rainy-convenience-store/anime/renders/images',
    imageManifestPath:
      'examples/rainy-convenience-store/anime/jobs/episode-001-image-manifest.json',
    continuityProfilePath: 'profiles/vertical-short/profile.yaml',
  },
  upstreamArtifacts: ['artifact:shot-plan', 'artifact:image-prompt-manifest'],
  requestedOutputs: ['artifact:image-manifest', 'artifact:rendered-image-batch'],
};

export const textToImageAgent = createStaticGenerationAgent({
  spec: {
    id: 'text-to-image',
    capabilityId: 'text-to-image-capability',
    capabilityKind: 'text-to-image',
    label: 'Text-to-image Agent',
    purpose:
      'Render approved storyboard prompts into reusable still-image assets with stable shot ids and continuity metadata.',
    reusableAbilities: [
      'Consumes provider-neutral prompt manifests.',
      'Returns stable artifact ids for downstream handoff.',
      'Can work with either standalone prompt packages or collaborative shot plans.',
    ],
    specializedAbilities: [
      'Maintains character/style continuity across shots.',
      'Normalizes prompt refs into image-manifest entries for video reuse.',
    ],
    usage: {
      summary:
        'Use this agent when you need locked still-image assets before video generation or review.',
      cliExamples: [
        buildCommandExample('phase-ai-anime-text-to-image-agent', '--describe'),
        buildCommandExample('phase-ai-anime-text-to-image-agent', '--example'),
        buildCommandExample(
          'phase-ai-anime-text-to-image-agent',
          '--input',
          './text-to-image-request.json'
        ),
      ],
    },
    limitations: [
      'Requires pre-authored prompt refs; it does not write prompts from scratch.',
      'Treats upstream artifacts as protocol tokens and does not read source files directly.',
      'Provider execution remains adapter-driven; this agent focuses on contract-safe orchestration.',
    ],
    protocol: {
      standalone: {
        requiredInputFields: [
          {
            name: 'promptManifestPath',
            type: 'string',
            required: true,
            description: 'Path to the approved image prompt manifest.',
          },
          {
            name: 'promptRefs',
            type: 'string[]',
            required: true,
            description: 'Prompt refs to render in this batch.',
          },
          {
            name: 'aspectRatio',
            type: 'string',
            required: true,
            description: 'Target still-image aspect ratio, usually 9:16 for the MVP.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where rendered stills should be written.',
          },
          {
            name: 'imageManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the produced image manifest will be written.',
          },
        ],
        optionalInputFields: [
          {
            name: 'continuityProfilePath',
            type: 'string',
            required: false,
            description: 'Optional profile used to stabilize style and character continuity.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:shot-plan',
            required: true,
            description: 'Locked shot ids and shot ordering.',
          },
          {
            path: 'artifact:image-prompt-manifest',
            required: true,
            description: 'Approved prompt manifest for image generation.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:continuity-profile',
            required: false,
            description: 'Optional continuity constraints shared across generation agents.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:image-manifest',
            required: true,
            description: 'Manifest that binds shot ids to rendered still-image outputs.',
          },
          {
            path: 'artifact:rendered-image-batch',
            required: true,
            description: 'Rendered still-image asset directory.',
          },
        ],
        protocolConditions: [
          'Prompt refs must already be approved by the prompt package step.',
          'Every output image must keep the original shot id to remain reusable.',
          'The produced image manifest is the only supported handoff to video-generation.',
        ],
        collaboratorIds: ['video-generation'],
      },
      collaborative: {
        requiredInputFields: [
          {
            name: 'promptManifestPath',
            type: 'string',
            required: true,
            description: 'Path to the approved image prompt manifest.',
          },
          {
            name: 'promptRefs',
            type: 'string[]',
            required: true,
            description: 'Prompt refs to render in this collaborative batch.',
          },
          {
            name: 'aspectRatio',
            type: 'string',
            required: true,
            description: 'Target aspect ratio for downstream video use.',
          },
          {
            name: 'outputDir',
            type: 'string',
            required: true,
            description: 'Directory where rendered stills should be written.',
          },
          {
            name: 'imageManifestPath',
            type: 'string',
            required: true,
            description: 'Path where the produced image manifest will be written.',
          },
        ],
        optionalInputFields: [
          {
            name: 'continuityProfilePath',
            type: 'string',
            required: false,
            description: 'Optional style continuity profile shared with other agents.',
          },
        ],
        requiredArtifacts: [
          {
            path: 'artifact:shot-plan',
            required: true,
            description: 'Locked shot plan from screenplay and storyboard work.',
          },
          {
            path: 'artifact:image-prompt-manifest',
            required: true,
            description: 'Prompt package approved for rendering.',
          },
          {
            path: 'artifact:continuity-profile',
            required: true,
            description: 'Cross-agent continuity profile ensuring consistent characters and style.',
          },
        ],
        optionalArtifacts: [
          {
            path: 'artifact:video-shot-plan',
            required: false,
            description: 'Optional downstream framing plan for video reuse.',
          },
        ],
        producedArtifacts: [
          {
            path: 'artifact:image-manifest',
            required: true,
            description: 'Shot-bound manifest for downstream video-generation.',
          },
          {
            path: 'artifact:rendered-image-batch',
            required: true,
            description: 'Rendered still-image asset directory.',
          },
        ],
        protocolConditions: [
          'Do not mutate shot ids or prompt refs after the collaborative handoff is accepted.',
          'The continuity profile must be echoed back in the image manifest metadata.',
          'Video-generation consumes image-manifest entries by shot id, not by raw filenames.',
        ],
        collaboratorIds: ['video-generation'],
      },
    },
  },
  exampleRequest: textToImageExampleRequest,
  buildSuccess(request) {
    const promptRefs = readStringArrayInput(request, 'promptRefs');
    const promptManifestPath = readStringInput(request, 'promptManifestPath');
    const outputDir = readStringInput(request, 'outputDir');
    const imageManifestPath = readStringInput(request, 'imageManifestPath');
    const aspectRatio = readStringInput(request, 'aspectRatio');
    const continuityProfilePath = readStringInput(request, 'continuityProfilePath');

    return {
      summary: `Prepared ${promptRefs.length} still-image render tasks for ${request.mode} execution.`,
      warnings:
        continuityProfilePath.length > 0
          ? []
          : ['No continuityProfilePath was provided; style consistency will depend on prompt discipline.'],
      nextAgentHints: ['video-generation'],
      output: {
        artifactBindings: {
          'artifact:image-prompt-manifest': promptManifestPath,
          'artifact:image-manifest': imageManifestPath,
          'artifact:rendered-image-batch': outputDir,
        },
        promptRefs,
        aspectRatio,
        continuityProfilePath: continuityProfilePath || undefined,
        handoffTarget: 'video-generation',
      },
    };
  },
});

export const runTextToImageAgent = textToImageAgent.run;