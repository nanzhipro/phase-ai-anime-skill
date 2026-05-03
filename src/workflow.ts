import {
  AgentSpec,
  AnimeDramaBlueprint,
  AnimeDramaTarget,
  AnimeDramaWorkflowInput,
  ArtifactPlan,
  AspectRatio,
  GenerationCapabilitySpec,
  GenerationJobSpec,
  PhaseFlowControl,
  PhaseDefinition,
  ProviderContract,
  ShotTimeline,
  TargetPlatform,
  WorkflowMutationResult,
  WorkflowNode,
} from './types';

const DEFAULT_DURATION_SECONDS = 15;
const DEFAULT_EPISODE_COUNT = 1;
const DEFAULT_LANGUAGE = 'zh-CN';
const DEFAULT_STYLE = '15-second vertical anime drama, decisive first-3-second hook, clean line art, stable character consistency, and stage-by-stage manifest handoff';
const DEFAULT_START_PHASE_ID = 'phase-0-screenplay-design';

export function buildAnimeDramaWorkflow(
  input: AnimeDramaWorkflowInput
): AnimeDramaBlueprint {
  const normalized = normalizeInput(input);
  const phaseFlow = createPhaseFlow(input.phaseFlowMode);
  const phases = createDefaultPhases();
  const nodes = createDefaultNodes();
  const artifacts = createDefaultArtifacts();
  const sampleTimeline = createSampleTimeline(normalized);
  const providerContracts = createProviderContracts();
  const generationCapabilities = createGenerationCapabilities(nodes, providerContracts);
  const generationJobs = createGenerationJobs(normalized, sampleTimeline);
  const agents = createDefaultAgents(
    phases,
    nodes,
    artifacts,
    generationCapabilities,
    providerContracts
  );

  return {
    kind: 'phase-ai-anime-blueprint',
    version: 1,
    title: input.title?.trim() || deriveTitle(input.premise),
    premise: input.premise.trim(),
    target: normalized,
    phaseFlow,
    styleDirection: input.styleDirection?.trim() || DEFAULT_STYLE,
    overlays: input.overlays?.length ? input.overlays : ['single-video-mvp', 'character-consistency', 'provider-manifests'],
    phases,
    nodes,
    generationCapabilities,
    agents,
    artifacts,
    sampleTimeline,
    providerContracts,
    generationJobs,
    qualityGates: [
      'The screenplay package must fit one 15-second video and include beat-by-beat staging that can be shot as a manga-drama clip.',
      'Character, world, and scene prompts must be categorized and linked through prompt/image/video manifests before generation begins.',
      'Image generation outputs must be traceable through an image manifest so the next stage can reuse or regenerate exact assets.',
      'Video generation must produce one deliverable clip for the current episode and record its lineage in a video manifest.',
      'Generation jobs remain provider-neutral and must not contain API keys, tokens, cookies, or local private paths.',
      'Each stage pauses for explicit user confirmation before the next stage consumes its manifest.',
    ],
    nextSteps: createNextSteps(phaseFlow),
  };
}

function createPhaseFlow(mode: AnimeDramaWorkflowInput['phaseFlowMode']): PhaseFlowControl {
  const resolvedMode = mode || 'standard';
  const resetRequested = resolvedMode === 'reset-phase-0';

  return {
    mode: resolvedMode,
    startPhaseId: DEFAULT_START_PHASE_ID,
    resetRequested,
    commands: resetRequested
      ? ['ruby scripts/planctl reset', 'ruby scripts/planctl advance --strict']
      : ['ruby scripts/planctl advance --strict'],
  };
}

function createNextSteps(phaseFlow: PhaseFlowControl): string[] {
  const defaultSteps = [
    'Write a 15-second design brief and a shootable screenplay package, then stop for user confirmation.',
    'Expand the approved screenplay into character, world, and scene prompt packs, and record them in episode-001-prompt-manifest.json.',
    'After prompt approval, generate image jobs and an image manifest for this single video only.',
    'After image approval, generate the video job, track the result in a video manifest, and deliver one 15-second clip.',
  ];

  if (!phaseFlow.resetRequested) {
    return defaultSteps;
  }

  return [
    `Run \`ruby scripts/planctl reset\` to clear completed phase state and restart from ${phaseFlow.startPhaseId}.`,
    'After reset, rerun `ruby scripts/planctl advance --strict` before re-authoring the screenplay package.',
    ...defaultSteps.slice(1),
  ];
}

export function insertWorkflowNode(
  blueprint: AnimeDramaBlueprint,
  node: WorkflowNode,
  afterNodeId?: string,
  agent?: AgentSpec
): WorkflowMutationResult {
  if (blueprint.nodes.some((existing) => existing.id === node.id)) {
    return { success: false, error: `Node already exists: ${node.id}` };
  }
  if (!agent) {
    return { success: false, error: `Node agent is required for inserted node: ${node.id}` };
  }
  if (agent.role !== 'node' || agent.nodeId !== node.id) {
    return { success: false, error: `Agent ${agent.id} must be a node agent for ${node.id}` };
  }
  if (blueprint.agents.some((existing) => existing.id === agent.id)) {
    return { success: false, error: `Agent already exists: ${agent.id}` };
  }

  const insertionIndex = afterNodeId
    ? blueprint.nodes.findIndex((existing) => existing.id === afterNodeId)
    : blueprint.nodes.length - 1;

  if (insertionIndex < 0) {
    return { success: false, error: `afterNodeId not found: ${afterNodeId}` };
  }

  const nodes = [...blueprint.nodes];
  nodes.splice(insertionIndex + 1, 0, node);

  return {
    success: true,
    workflow: {
      ...blueprint,
      nodes,
      agents: [...blueprint.agents, agent],
    },
  };
}

export function removeWorkflowNode(
  blueprint: AnimeDramaBlueprint,
  nodeId: string
): WorkflowMutationResult {
  const node = blueprint.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return { success: false, error: `Node not found: ${nodeId}` };
  }

  const dependents = blueprint.nodes.filter((candidate) =>
    candidate.dependsOn.includes(nodeId)
  );
  if (dependents.length > 0) {
    return {
      success: false,
      error: `Node ${nodeId} is required by: ${dependents
        .map((dependent) => dependent.id)
        .join(', ')}`,
    };
  }
  if (!node.deletable) {
    return { success: false, error: `Node is not deletable: ${nodeId}` };
  }

  return {
    success: true,
    workflow: {
      ...blueprint,
      nodes: blueprint.nodes.filter((candidate) => candidate.id !== nodeId),
      agents: blueprint.agents.filter((candidate) => candidate.nodeId !== nodeId),
    },
  };
}

export function validateAnimeDramaBlueprint(
  blueprint: AnimeDramaBlueprint
): string[] {
  const issues: string[] = [];

  if (!blueprint.premise.trim()) {
    issues.push('premise is required');
  }
  if (blueprint.sampleTimeline.length === 0) {
    issues.push('sampleTimeline must contain at least one shot');
  }

  const timelineShotIds = new Set(
    blueprint.sampleTimeline.map((shot) => shot.shotId)
  );
  if (timelineShotIds.size !== blueprint.sampleTimeline.length) {
    issues.push('sampleTimeline shotId values must be unique');
  }

  blueprint.sampleTimeline.forEach((shot) => {
    if (shot.endSeconds <= shot.startSeconds) {
      issues.push(`${shot.shotId} must have positive duration`);
    }
    if (shot.audioCues.length === 0) {
      issues.push(`${shot.shotId} must include at least one audio cue`);
    }
    if (shot.promptRefs.length === 0) {
      issues.push(`${shot.shotId} must include promptRefs`);
    }
  });

  blueprint.generationJobs.forEach((job) => {
    if (job.provider !== 'unassigned') {
      issues.push(`${job.jobId} must stay provider-neutral in the MVP`);
    }
    const serialized = JSON.stringify(job).toLowerCase();
    if (serialized.includes('api_key') || serialized.includes('token')) {
      issues.push(`${job.jobId} must not include secrets`);
    }
  });

  validateAgentSpecs(blueprint, issues);

  return issues;
}

function validateAgentSpecs(blueprint: AnimeDramaBlueprint, issues: string[]): void {
  if (blueprint.agents.length === 0) {
    issues.push('agents must contain phase, node, capability, and adapter contracts');
    return;
  }

  const agentIds = new Set<string>();
  blueprint.agents.forEach((agent) => {
    if (agentIds.has(agent.id)) {
      issues.push(`agent id must be unique: ${agent.id}`);
    }
    agentIds.add(agent.id);

    if (!agent.purpose.trim()) {
      issues.push(`${agent.id} must declare a purpose`);
    }
    if (agent.outputs.length === 0) {
      issues.push(`${agent.id} must declare outputs`);
    }
    if (agent.requiredArtifacts.length === 0) {
      issues.push(`${agent.id} must declare requiredArtifacts`);
    }
    if (agent.qualityGates.length === 0) {
      issues.push(`${agent.id} must declare qualityGates`);
    }
    if (agent.handoffArtifacts.length === 0) {
      issues.push(`${agent.id} must declare handoffArtifacts`);
    }
    if (agent.handoff.producedArtifacts.length === 0) {
      issues.push(`${agent.id} handoff must declare producedArtifacts`);
    }

    agent.outputs.forEach((outputPath) => {
      if (!agent.allowedPaths.some((allowedPath) => pathMatches(allowedPath, outputPath))) {
        issues.push(`${agent.id} output ${outputPath} is not covered by allowedPaths`);
      }
    });
  });

  blueprint.phases.forEach((phase) => {
    if (!blueprint.agents.some((agent) => agent.role === 'phase' && agent.ownerPhaseId === phase.id)) {
      issues.push(`phase ${phase.id} is missing a phase agent`);
    }
  });

  blueprint.nodes.forEach((nodeItem) => {
    if (!blueprint.agents.some((agent) => agent.role === 'node' && agent.nodeId === nodeItem.id)) {
      issues.push(`workflow node ${nodeItem.id} is missing a node agent`);
    }
  });

  blueprint.generationCapabilities.forEach((capabilityItem) => {
    if (!blueprint.agents.some((agent) => agent.role === 'capability' && agent.capabilityId === capabilityItem.id)) {
      issues.push(`generation capability ${capabilityItem.id} is missing a capability agent`);
    }
  });

  blueprint.providerContracts.forEach((contractItem) => {
    if (!blueprint.agents.some((agent) => agent.role === 'adapter' && agent.adapterSlot === contractItem.adapterSlot)) {
      issues.push(`adapter slot ${contractItem.adapterSlot} is missing an adapter agent`);
    }
  });

  const availableArtifacts = uniqueStrings([
    ...blueprint.artifacts.map((artifactItem) => artifactItem.path),
    ...blueprint.nodes.flatMap((nodeItem) => nodeItem.outputs),
    ...blueprint.providerContracts.flatMap((contractItem) => contractItem.outputArtifacts),
  ]);

  blueprint.agents.forEach((agent) => {
    agent.inputs.forEach((inputPath) => {
      if (!availableArtifacts.some((artifactPath) => pathsCompatible(artifactPath, inputPath))) {
        issues.push(`${agent.id} input ${inputPath} is not produced by an upstream artifact or adapter contract`);
      }
    });
  });
}

function createDefaultAgents(
  phases: PhaseDefinition[],
  nodes: WorkflowNode[],
  artifacts: ArtifactPlan[],
  generationCapabilities: GenerationCapabilitySpec[],
  providerContracts: ProviderContract[]
): AgentSpec[] {
  return [
    ...phases.map((phase) => createPhaseAgent(phase, phases)),
    ...nodes.map((nodeItem) => createNodeAgent(nodeItem, nodes, artifacts)),
    ...generationCapabilities.map(createCapabilityAgent),
    ...providerContracts.map((contractItem) => createAdapterAgent(contractItem, generationCapabilities)),
  ];
}

function createPhaseAgent(
  phase: PhaseDefinition,
  phases: PhaseDefinition[]
): AgentSpec {
  const dependencyArtifacts = phase.dependsOn.flatMap((phaseId) => {
    const dependency = phases.find((candidate) => candidate.id === phaseId);

    return dependency ? dependency.requiredArtifacts : [];
  });

  return {
    id: `${phase.id}-agent`,
    label: `${phase.title} Agent`,
    role: 'phase',
    purpose: `Owns the phase contract, execution boundary, required artifacts, and handoff for ${phase.id}.`,
    ownerPhaseId: phase.id,
    inputs: dependencyArtifacts,
    outputs: phase.requiredArtifacts,
    allowedPaths: allowedPathsForArtifacts(phase.requiredArtifacts),
    requiredArtifacts: phase.requiredArtifacts,
    qualityGates: [
      `All required artifacts for ${phase.id} exist before handoff.`,
      'Phase output remains inside the current execution boundary.',
      'No future phase deliverables are mixed into this phase.',
      ...(phase.requiresUserConfirmation
        ? [
            `User confirmation package is ready: ${phase.confirmationArtifacts.join(', ')}.`,
          ]
        : []),
    ],
    handoffArtifacts: phase.requiredArtifacts,
    forbiddenActions: [
      'Do not call external providers from a phase agent.',
      'Do not write secrets, cookies, credentials, or private local paths.',
      'Do not publish, tag, archive, or make release decisions.',
    ],
    humanApprovalGates: [
      ...(phase.requiresUserConfirmation
        ? [
            `User confirms ${phase.confirmationArtifacts.join(', ')} before the next phase starts.`,
          ]
        : []),
      'Real provider call approval.',
      'Public release, commercial use, tag, or archive decision.',
    ],
    handoff: {
      producedArtifacts: phase.requiredArtifacts,
      nextAgentIds: nextPhaseAgentIds(phase, phases),
      notes: uniqueStrings([
        'Update plan/handoff.md after the phase is objectively complete.',
        ...(phase.transitionManifest
          ? [`Record downstream handoff state in ${phase.transitionManifest}.`]
          : []),
      ]),
    },
  };
}

function createNodeAgent(
  nodeItem: WorkflowNode,
  nodes: WorkflowNode[],
  artifacts: ArtifactPlan[]
): AgentSpec {
  const upstreamArtifacts = nodeItem.dependsOn.flatMap((nodeId) => {
    const dependency = nodes.find((candidate) => candidate.id === nodeId);

    return dependency ? dependency.outputs : [];
  });

  return {
    id: `${nodeItem.id}-agent`,
    label: `${nodeItem.label} Agent`,
    role: 'node',
    purpose: `Produces the ${nodeItem.label} workflow node outputs while preserving input/output contracts.`,
    ownerPhaseId: ownerPhaseForNode(nodeItem, artifacts),
    nodeId: nodeItem.id,
    capabilityId: capabilityIdForNode(nodeItem.id),
    capabilityKind: capabilityKindForNode(nodeItem.id),
    executionMode: capabilityExecutionModeForNode(nodeItem.id),
    inputs: upstreamArtifacts,
    outputs: nodeItem.outputs,
    allowedPaths: allowedPathsForArtifacts(nodeItem.outputs),
    requiredArtifacts: nodeItem.requiredArtifacts,
    qualityGates: [
      `Outputs match the workflow node contract for ${nodeItem.id}.`,
      'Required artifacts are ready for the next node before handoff.',
      'Node changes do not break downstream inputs.',
      ...(nodeItem.trackingManifest
        ? [`Manifest ${nodeItem.trackingManifest} is updated before handoff.`]
        : []),
    ],
    handoffArtifacts: nodeItem.outputs,
    forbiddenActions: [
      'Do not mutate upstream source artifacts outside the active phase contract.',
      'Do not write secrets, cookies, credentials, or private local paths.',
    ],
    humanApprovalGates: uniqueStrings([
      ...(nodeItem.type === 'generation' ? ['Real provider calls.'] : []),
      ...(nodeItem.requiresUserConfirmation
        ? [
            `User confirms outputs tracked by ${nodeItem.trackingManifest || nodeItem.outputs[0]} before downstream work continues.`,
          ]
        : []),
    ]),
    handoff: {
      producedArtifacts: nodeItem.outputs,
      nextAgentIds: nextNodeAgentIds(nodeItem, nodes),
      notes: uniqueStrings([
        'Record any continuity, timing, or missing-input risk before handoff.',
        ...(nodeItem.trackingManifest
          ? [`Update ${nodeItem.trackingManifest} with the latest outputs and approval status.`]
          : []),
      ]),
    },
  };
}

function createCapabilityAgent(capabilityItem: GenerationCapabilitySpec): AgentSpec {
  return {
    id: `${capabilityItem.id}-agent`,
    label: `${capabilityItem.label} Agent`,
    role: 'capability',
    purpose: capabilityItem.purpose,
    capabilityId: capabilityItem.id,
    capabilityKind: capabilityItem.kind,
    executionMode: capabilityItem.executionMode,
    inputs: capabilityItem.inputs,
    outputs: capabilityItem.outputs,
    allowedPaths: allowedPathsForArtifacts(capabilityItem.outputs),
    requiredArtifacts: capabilityItem.outputs,
    qualityGates: [
      'Reusable capability boundaries remain stable across providers and orchestration modes.',
      `Reusable abilities are explicit: ${capabilityItem.reusableAbilities.join(', ')}.`,
      `Specialized abilities remain isolated: ${capabilityItem.specializedAbilities.join(', ')}.`,
      ...(capabilityItem.collaboratesWith.length > 0
        ? [
            `Collaboration handoff is explicit with ${capabilityItem.collaboratesWith.join(', ')} through ${capabilityItem.collaborationOutputs.join(', ')}.`,
          ]
        : []),
    ],
    handoffArtifacts: capabilityItem.outputs,
    forbiddenActions: [
      'Do not merge image and video capability concerns into one opaque agent.',
      'Do not write secrets, cookies, credentials, or private local paths.',
      'Do not bypass provider-neutral manifests when collaborating with another capability.',
    ],
    humanApprovalGates: [
      'Real provider call approval.',
      'Capability handoff artifacts are confirmed before downstream execution.',
    ],
    handoff: {
      producedArtifacts: capabilityItem.outputs,
      nextAgentIds: uniqueStrings([
        ...capabilityItem.adapterSlots.map((adapterSlot) => `${adapterSlot}-agent`),
        ...capabilityItem.collaboratesWith.map((capabilityId) => `${capabilityId}-agent`),
      ]),
      notes: uniqueStrings([
        `Reusable abilities: ${capabilityItem.reusableAbilities.join(', ')}.`,
        `Specialized abilities: ${capabilityItem.specializedAbilities.join(', ')}.`,
      ]),
    },
  };
}

function createAdapterAgent(
  contractItem: ProviderContract,
  generationCapabilities: GenerationCapabilitySpec[]
): AgentSpec {
  const providerNote = contractItem.recommendedProviders.length > 0
    ? `Recommended first adapters: ${contractItem.recommendedProviders.join(', ')}.`
    : undefined
  const capabilityItem = generationCapabilities.find((candidate) =>
    candidate.adapterSlots.includes(contractItem.adapterSlot)
  );

  return {
    id: `${contractItem.adapterSlot}-agent`,
    label: `${titleCase(contractItem.adapterSlot)} Agent`,
    role: 'adapter',
    purpose: `Translates validated provider-neutral ${contractItem.kind} jobs for the ${contractItem.adapterSlot} slot after human approval.`,
    capabilityId: capabilityItem?.id,
    capabilityKind: capabilityItem?.kind,
    executionMode: capabilityItem?.executionMode,
    adapterSlot: contractItem.adapterSlot,
    inputs: contractItem.inputArtifacts,
    outputs: contractItem.outputArtifacts,
    allowedPaths: contractItem.outputArtifacts,
    requiredArtifacts: contractItem.outputArtifacts,
    qualityGates: [
      'Generation jobs validate against the provider contract before execution.',
      'Provider remains unassigned until a human chooses the concrete adapter.',
      `Run reports record provider, model, cost, duration, and output checks in ${contractItem.trackingManifest}.`,
    ],
    handoffArtifacts: contractItem.outputArtifacts,
    forbiddenActions: [
      'Do not store API keys, tokens, cookies, bearer headers, passwords, or account configuration in the repository.',
      'Do not mutate story, storyboard, audio timeline, prompt, or job source files during provider execution.',
      'Do not upload private input assets before explicit human approval.',
      ...(capabilityItem
        ? [`Do not absorb ${capabilityItem.id} reusable concerns into provider-specific request code.`]
        : []),
    ],
    humanApprovalGates: [
      'Provider and model family.',
      'Authentication mechanism.',
      'Estimated cost or quota impact.',
      'Exact input artifacts to upload.',
      'Output retention and usage rights.',
    ],
    handoff: {
      producedArtifacts: contractItem.outputArtifacts,
      nextAgentIds: [],
      notes: uniqueStrings([
        `Write the run report into ${contractItem.trackingManifest} when a real adapter is used.`,
        ...(providerNote ? [providerNote] : []),
      ]),
    },
  };
}

function createGenerationCapabilities(
  nodes: WorkflowNode[],
  providerContracts: ProviderContract[]
): GenerationCapabilitySpec[] {
  const imageNode = findNode(nodes, 'image_generation');
  const videoNode = findNode(nodes, 'video_generation');
  const imageContract = findProviderContract(providerContracts, 'image_generation_adapter');
  const videoContract = findProviderContract(providerContracts, 'video_generation_adapter');

  return [
    {
      id: 'text-to-image-capability',
      label: 'Text-to-Image Capability',
      kind: 'text-to-image',
      executionMode: 'standalone-or-collaborative',
      purpose: 'Owns text-to-image planning, manifest-safe image generation handoff, and reusable image asset production as an independent capability that can also collaborate with downstream video generation.',
      nodeIds: [imageNode.id],
      adapterSlots: [imageContract.adapterSlot],
      inputs: uniqueStrings([...imageNode.inputs, ...imageContract.inputArtifacts]),
      outputs: uniqueStrings([
        ...imageNode.outputs,
        imageContract.trackingManifest,
        ...imageContract.outputArtifacts,
      ]),
      reusableAbilities: [
        'provider-neutral job validation',
        'runtime preflight and approval gate handling',
        'manifest update and lineage recording',
        'asset path normalization and quality gate reporting',
      ],
      specializedAbilities: [
        'prompt-to-image request planning',
        'aspect-ratio to image-size mapping',
        'image asset batching and anchor-frame production',
      ],
      collaborationInputs: ['anime/manifests/episode-001-prompt-manifest.json'],
      collaborationOutputs: ['anime/manifests/episode-001-image-manifest.json'],
      collaboratesWith: ['video-generation-capability'],
    },
    {
      id: 'video-generation-capability',
      label: 'Video Generation Capability',
      kind: 'video-generation',
      executionMode: 'standalone-or-collaborative',
      purpose: 'Owns video generation orchestration, async task lifecycle handling, and final delivery assembly as an independent capability that can consume upstream image outputs when collaborating.',
      nodeIds: [videoNode.id],
      adapterSlots: [videoContract.adapterSlot],
      inputs: uniqueStrings([...videoNode.inputs, ...videoContract.inputArtifacts]),
      outputs: uniqueStrings([
        ...videoNode.outputs,
        videoContract.trackingManifest,
        ...videoContract.outputArtifacts,
      ]),
      reusableAbilities: [
        'provider-neutral job validation',
        'runtime preflight and approval gate handling',
        'manifest update and lineage recording',
        'delivery review and output verification',
      ],
      specializedAbilities: [
        'image-to-video and text-conditioned video planning',
        'async submit-and-poll task orchestration',
        'duration, resolution, ratio, and final mp4 handoff control',
      ],
      collaborationInputs: [
        'anime/manifests/episode-001-image-manifest.json',
        'anime/manifests/episode-001-audio-manifest.json',
      ],
      collaborationOutputs: ['anime/manifests/episode-001-video-manifest.json', 'anime/final/episode-001.mp4'],
      collaboratesWith: [
        'text-to-image-capability',
        'tts-generation-capability',
        'sfx-generation-capability',
        'music-generation-capability',
      ],
    },
    {
      id: 'tts-generation-capability',
      label: 'Text-to-Speech Capability',
      kind: 'tts-generation',
      executionMode: 'standalone-or-collaborative',
      purpose: 'Owns dialogue-to-voice planning, speaker and emotion mapping, and reusable speech asset handoff as an independent capability that can also collaborate with SFX, music, and final video delivery.',
      nodeIds: [],
      adapterSlots: ['tts_generation_adapter'],
      inputs: [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      outputs: [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/dialogue/**',
      ],
      reusableAbilities: [
        'provider-neutral job validation',
        'runtime preflight and approval gate handling',
        'manifest update and lineage recording',
        'asset path normalization and quality gate reporting',
      ],
      specializedAbilities: [
        'script-to-voice planning',
        'speaker, pacing, and emotion mapping',
        'dialogue audio asset production and approval handoff',
      ],
      collaborationInputs: [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      collaborationOutputs: [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/dialogue/**',
      ],
      collaboratesWith: [
        'sfx-generation-capability',
        'music-generation-capability',
        'video-generation-capability',
      ],
    },
    {
      id: 'sfx-generation-capability',
      label: 'Sound Effects Capability',
      kind: 'sfx-generation',
      executionMode: 'standalone-or-collaborative',
      purpose: 'Owns cue-to-effect planning, transient and ambience asset packaging, and reusable sound-effect handoff as an independent capability that can also collaborate with dialogue, music, and final video delivery.',
      nodeIds: [],
      adapterSlots: ['sfx_generation_adapter'],
      inputs: [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      outputs: [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/sfx/**',
      ],
      reusableAbilities: [
        'provider-neutral job validation',
        'runtime preflight and approval gate handling',
        'manifest update and lineage recording',
        'asset path normalization and quality gate reporting',
      ],
      specializedAbilities: [
        'cue-sheet to effect planning',
        'impact, ambience, and transition sound design',
        'sound-effect stem packaging and approval handoff',
      ],
      collaborationInputs: [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      collaborationOutputs: [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/sfx/**',
      ],
      collaboratesWith: [
        'tts-generation-capability',
        'music-generation-capability',
        'video-generation-capability',
      ],
    },
    {
      id: 'music-generation-capability',
      label: 'Music Scoring Capability',
      kind: 'music-generation',
      executionMode: 'standalone-or-collaborative',
      purpose: 'Owns scoring brief design, motif and energy-arc planning, and reusable music stem handoff as an independent capability that can also collaborate with dialogue, SFX, and final video delivery.',
      nodeIds: [],
      adapterSlots: ['music_generation_adapter'],
      inputs: [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      outputs: [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/music/**',
      ],
      reusableAbilities: [
        'provider-neutral job validation',
        'runtime preflight and approval gate handling',
        'manifest update and lineage recording',
        'asset path normalization and quality gate reporting',
      ],
      specializedAbilities: [
        'score brief and motif planning',
        'energy-arc, loop, and transition control',
        'music stem packaging and approval handoff',
      ],
      collaborationInputs: [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      collaborationOutputs: [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/music/**',
      ],
      collaboratesWith: [
        'tts-generation-capability',
        'sfx-generation-capability',
        'video-generation-capability',
      ],
    },
  ];
}

function findNode(nodes: WorkflowNode[], nodeId: string): WorkflowNode {
  const nodeItem = nodes.find((candidate) => candidate.id === nodeId);
  if (!nodeItem) {
    throw new Error(`Missing workflow node: ${nodeId}`);
  }

  return nodeItem;
}

function findProviderContract(
  providerContracts: ProviderContract[],
  adapterSlot: string
): ProviderContract {
  const contractItem = providerContracts.find((candidate) => candidate.adapterSlot === adapterSlot);
  if (!contractItem) {
    throw new Error(`Missing provider contract: ${adapterSlot}`);
  }

  return contractItem;
}

function capabilityIdForNode(nodeId: string): string | undefined {
  switch (nodeId) {
    case 'image_generation':
      return 'text-to-image-capability';
    case 'video_generation':
      return 'video-generation-capability';
    default:
      return undefined;
  }
}

function capabilityKindForNode(nodeId: string): GenerationCapabilitySpec['kind'] | undefined {
  switch (nodeId) {
    case 'image_generation':
      return 'text-to-image';
    case 'video_generation':
      return 'video-generation';
    default:
      return undefined;
  }
}

function capabilityExecutionModeForNode(nodeId: string): GenerationCapabilitySpec['executionMode'] | undefined {
  switch (nodeId) {
    case 'image_generation':
    case 'video_generation':
      return 'standalone-or-collaborative';
    default:
      return undefined;
  }
}

function normalizeInput(input: AnimeDramaWorkflowInput): AnimeDramaTarget {
  const platform = input.targetPlatform || 'vertical-short';
  const episodeDurationSeconds = ensurePositiveNumber(
    input.episodeDurationSeconds,
    DEFAULT_DURATION_SECONDS
  );

  return {
    platform,
    aspectRatio: input.aspectRatio || defaultAspectRatio(platform),
    episodeDurationSeconds,
    episodeCount: ensurePositiveInteger(input.episodeCount, DEFAULT_EPISODE_COUNT),
    language: input.language?.trim() || DEFAULT_LANGUAGE,
    modelCallDepth: input.modelCallDepth || 'offline-spec-only',
  };
}

function createDefaultPhases(): PhaseDefinition[] {
  return [
    {
      id: 'phase-0-screenplay-design',
      title: 'Turn the idea into a shootable 15-second screenplay package',
      purpose: 'Expand the premise into a design brief, beat-by-beat screenplay, and a script manifest that can be reviewed before prompts are written.',
      requiredArtifacts: [
        'anime/scripts/episode-001-design-brief.md',
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      dependsOn: [],
      requiresUserConfirmation: true,
      confirmationArtifacts: [
        'anime/scripts/episode-001-design-brief.md',
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      transitionManifest: 'anime/manifests/episode-001-script-manifest.json',
    },
    {
      id: 'phase-1-prompt-package',
      title: 'Build character, world, and scene prompt foundations',
      purpose: 'Translate the approved screenplay into categorized prompt packs and a prompt manifest that downstream generation stages can consume.',
      requiredArtifacts: [
        'anime/prompts/episode-001-character-prompts.yaml',
        'anime/prompts/episode-001-world-prompts.yaml',
        'anime/prompts/episode-001-scene-prompts.yaml',
        'anime/manifests/episode-001-prompt-manifest.json',
      ],
      dependsOn: ['phase-0-screenplay-design'],
      requiresUserConfirmation: true,
      confirmationArtifacts: [
        'anime/prompts/episode-001-character-prompts.yaml',
        'anime/prompts/episode-001-world-prompts.yaml',
        'anime/prompts/episode-001-scene-prompts.yaml',
        'anime/manifests/episode-001-prompt-manifest.json',
      ],
      transitionManifest: 'anime/manifests/episode-001-prompt-manifest.json',
    },
    {
      id: 'phase-2-image-generation',
      title: 'Generate the image pack for one approved video',
      purpose: 'Produce provider-neutral image jobs, generated images, and an image manifest that records every reusable visual asset for this one video.',
      requiredArtifacts: [
        'anime/jobs/episode-001-image-jobs.json',
        'anime/manifests/episode-001-image-manifest.json',
        'anime/assets/images/episode-001/**',
      ],
      dependsOn: ['phase-1-prompt-package'],
      requiresUserConfirmation: true,
      confirmationArtifacts: [
        'anime/jobs/episode-001-image-jobs.json',
        'anime/manifests/episode-001-image-manifest.json',
        'anime/assets/images/episode-001/**',
      ],
      transitionManifest: 'anime/manifests/episode-001-image-manifest.json',
    },
    {
      id: 'phase-3-video-generation',
      title: 'Generate one 15-second manga-drama video deliverable',
      purpose: 'Use the approved image manifest to produce a single video job, the final clip, and a delivery review package.',
      requiredArtifacts: [
        'anime/jobs/episode-001-video-jobs.json',
        'anime/manifests/episode-001-video-manifest.json',
        'anime/final/episode-001.mp4',
        'anime/review/episode-001-delivery.md',
      ],
      dependsOn: ['phase-2-image-generation'],
      requiresUserConfirmation: true,
      confirmationArtifacts: [
        'anime/jobs/episode-001-video-jobs.json',
        'anime/manifests/episode-001-video-manifest.json',
        'anime/final/episode-001.mp4',
        'anime/review/episode-001-delivery.md',
      ],
      transitionManifest: 'anime/manifests/episode-001-video-manifest.json',
    },
  ];
}

function createDefaultNodes(): WorkflowNode[] {
  return [
    node(
      'screenplay_design',
      'Screenplay Design Package',
      'creative',
      [],
      [
        'anime/scripts/episode-001-design-brief.md',
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      [],
      false,
      false,
      true,
      'anime/manifests/episode-001-script-manifest.json'
    ),
    node(
      'prompt_package',
      'Prompt Foundation Package',
      'prompting',
      ['screenplay_design'],
      [
        'anime/prompts/episode-001-character-prompts.yaml',
        'anime/prompts/episode-001-world-prompts.yaml',
        'anime/prompts/episode-001-scene-prompts.yaml',
        'anime/manifests/episode-001-prompt-manifest.json',
      ],
      [
        'anime/scripts/episode-001-design-brief.md',
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      false,
      false,
      true,
      'anime/manifests/episode-001-prompt-manifest.json'
    ),
    node(
      'image_generation',
      'Image Generation Batch',
      'generation',
      ['prompt_package'],
      [
        'anime/jobs/episode-001-image-jobs.json',
        'anime/manifests/episode-001-image-manifest.json',
        'anime/assets/images/episode-001/**',
      ],
      [
        'anime/prompts/episode-001-character-prompts.yaml',
        'anime/prompts/episode-001-world-prompts.yaml',
        'anime/prompts/episode-001-scene-prompts.yaml',
        'anime/manifests/episode-001-prompt-manifest.json',
      ],
      false,
      false,
      true,
      'anime/manifests/episode-001-image-manifest.json'
    ),
    node(
      'video_generation',
      'Video Generation Batch',
      'generation',
      ['image_generation'],
      [
        'anime/jobs/episode-001-video-jobs.json',
        'anime/manifests/episode-001-video-manifest.json',
        'anime/final/episode-001.mp4',
        'anime/review/episode-001-delivery.md',
      ],
      [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-image-manifest.json',
        'anime/assets/images/episode-001/**',
      ],
      false,
      false,
      true,
      'anime/manifests/episode-001-video-manifest.json'
    ),
  ];
}

function node(
  id: string,
  label: string,
  type: WorkflowNode['type'],
  dependsOn: string[],
  outputs: string[],
  inputs: string[],
  optional: boolean,
  deletable: boolean,
  requiresUserConfirmation: boolean,
  trackingManifest?: string
): WorkflowNode {
  return {
    id,
    label,
    type,
    inputs,
    outputs,
    requiredArtifacts: outputs,
    replaceableBy: replacementOptions(type),
    dependsOn,
    optional,
    deletable,
    requiresUserConfirmation,
    trackingManifest,
  };
}

function replacementOptions(type: WorkflowNode['type']): string[] {
  switch (type) {
    case 'generation':
      return ['cloud-api-adapter', 'local-command-adapter', 'manual-upload-adapter'];
    case 'audio':
      return ['tts-api-adapter', 'manual-voiceover', 'local-audio-editor'];
    case 'assembly':
      return ['ffmpeg-adapter', 'davinci-resolve-project', 'manual-editor'];
    case 'review':
      return ['human-review', 'platform-policy-check', 'brand-safety-check'];
    default:
      return ['human-authoring', 'agent-assisted-authoring'];
  }
}

function createDefaultArtifacts(): ArtifactPlan[] {
  return [
    artifact('anime/scripts/episode-001-design-brief.md', 'markdown', '15-second video goal, hook, audience promise, shot count target, and production constraints.', 'phase-0-screenplay-design'),
    artifact('anime/scripts/episode-001-screenplay.md', 'markdown', 'Shootable screenplay for one 15-second manga-drama video with beats, shots, and confirmation questions.', 'phase-0-screenplay-design'),
    artifact('anime/manifests/episode-001-script-manifest.json', 'json', 'Tracks screenplay package versions, review status, and downstream handoff inputs.', 'phase-0-screenplay-design'),
    artifact('anime/prompts/episode-001-character-prompts.yaml', 'yaml', 'Character prompt pack with reusable looks, expressions, costumes, and anchor poses.', 'phase-1-prompt-package'),
    artifact('anime/prompts/episode-001-world-prompts.yaml', 'yaml', 'World prompt pack with environmental rules, props, lighting, and atmosphere.', 'phase-1-prompt-package'),
    artifact('anime/prompts/episode-001-scene-prompts.yaml', 'yaml', 'Scene prompt pack for each screenplay beat and shot transition.', 'phase-1-prompt-package'),
    artifact('anime/manifests/episode-001-prompt-manifest.json', 'json', 'Maps screenplay beats to categorized character/world/scene prompts for reuse.', 'phase-1-prompt-package'),
    artifact('anime/jobs/episode-001-image-jobs.json', 'json', 'Provider-neutral image generation jobs for the approved single-video prompt package.', 'phase-2-image-generation'),
    artifact('anime/manifests/episode-001-image-manifest.json', 'json', 'Records image asset lineage, approval state, and reuse decisions for the current video.', 'phase-2-image-generation'),
    artifact('anime/assets/images/episode-001/**', 'directory', 'Generated image assets referenced by the image manifest.', 'phase-2-image-generation'),
    artifact('anime/jobs/episode-001-video-jobs.json', 'json', 'Provider-neutral video generation jobs for the approved image set.', 'phase-3-video-generation'),
    artifact('anime/manifests/episode-001-video-manifest.json', 'json', 'Tracks video generation inputs, output lineage, review notes, and final delivery status.', 'phase-3-video-generation'),
    artifact('anime/final/episode-001.mp4', 'video', 'Single 15-second manga-drama deliverable for the current episode.', 'phase-3-video-generation'),
    artifact('anime/review/episode-001-delivery.md', 'markdown', 'Delivery review with final clip notes, approval decision, and next iteration risks.', 'phase-3-video-generation'),
  ];
}

function artifact(
  path: string,
  format: ArtifactPlan['format'],
  purpose: string,
  producedBy: string
): ArtifactPlan {
  return { path, format, purpose, producedBy };
}

function createSampleTimeline(target: AnimeDramaTarget): ShotTimeline[] {
  const hookEnd = Math.min(4, target.episodeDurationSeconds);
  const midEnd = Math.max(hookEnd + 2, Math.round(target.episodeDurationSeconds * 0.7));
  const finalEnd = target.episodeDurationSeconds;

  return [
    {
      shotId: 'shot-001-open-hook',
      startSeconds: 0,
      endSeconds: hookEnd,
      visualIntent: 'Open with the core contradiction of the episode already visible in one vertical-safe image.',
      camera: 'fast push-in, vertical-safe close-up',
      action: 'The protagonist discovers the impossible clue and makes the audience understand the goal in seconds.',
      promptRefs: ['anime/prompts/episode-001-scene-prompts.yaml#scene-001-hook'],
      audioCues: [
        cue('cue-001-dialogue', 'dialogue', 0.5, hookEnd, '它不是失踪，是在躲我。', 'protagonist', 'uneasy realization'),
        cue('cue-002-subtitle', 'subtitle', 0.5, hookEnd, '它不是失踪，是在躲我。'),
      ],
    },
    {
      shotId: 'shot-002-pursuit-turn',
      startSeconds: hookEnd,
      endSeconds: midEnd,
      visualIntent: 'Show the escalating obstacle and lock the visual motifs that the image stage must preserve.',
      camera: 'medium shot to over-the-shoulder with a hard vertical rack focus',
      action: 'The protagonist follows the clue into the scene and pays a visible price for continuing.',
      promptRefs: ['anime/prompts/episode-001-scene-prompts.yaml#scene-002-turn'],
      audioCues: [
        cue('cue-003-dialogue', 'dialogue', hookEnd + 0.6, midEnd - 0.8, '再往前一步，我就得承认它真的认识我。', 'protagonist', 'strained resolve'),
        cue('cue-004-subtitle', 'subtitle', hookEnd + 0.6, midEnd - 0.8, '再往前一步，我就得承认它真的认识我。'),
      ],
    },
    {
      shotId: 'shot-003-cliffhanger-reveal',
      startSeconds: midEnd,
      endSeconds: finalEnd,
      visualIntent: 'Land one reversal that justifies the entire 15-second video and makes the final frame reusable as marketing art.',
      camera: 'cut to extreme close-up, hold, then smash cut to black',
      action: 'The final image reveals the truth and freezes on a new question.',
      promptRefs: ['anime/prompts/episode-001-scene-prompts.yaml#scene-003-reveal'],
      audioCues: [
        cue('cue-005-silence', 'silence', midEnd, midEnd + 0.4, 'breath pause'),
        cue('cue-006-dialogue', 'dialogue', midEnd + 0.4, finalEnd - 0.4, '别找耳机了，昨晚失踪的人其实是你。', 'mystery_voice', 'calm and intimate'),
        cue('cue-007-subtitle', 'subtitle', midEnd + 0.4, finalEnd - 0.4, '别找耳机了，昨晚失踪的人其实是你。'),
      ],
    },
  ];
}

function cue(
  id: string,
  kind: ShotTimeline['audioCues'][number]['kind'],
  startSeconds: number,
  endSeconds: number,
  text: string,
  speaker?: string,
  emotion?: string
): ShotTimeline['audioCues'][number] {
  return {
    id,
    kind,
    startSeconds,
    endSeconds,
    text,
    speaker,
    emotion,
  };
}

function createProviderContracts(): ProviderContract[] {
  return [
    contract(
      'image',
      'image_generation_adapter',
      [
        'anime/prompts/episode-001-character-prompts.yaml',
        'anime/prompts/episode-001-world-prompts.yaml',
        'anime/prompts/episode-001-scene-prompts.yaml',
        'anime/manifests/episode-001-prompt-manifest.json',
      ],
      ['anime/assets/images/episode-001/**'],
      'anime/manifests/episode-001-image-manifest.json',
      ['promptRef', 'assetId', 'aspectRatio', 'sourceManifest', 'category'],
      ['apiKey', 'api_key', 'token', 'cookie', 'secret'],
      ['volcengine-seedream']
    ),
    contract(
      'video',
      'video_generation_adapter',
      [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-image-manifest.json',
        'anime/prompts/episode-001-scene-prompts.yaml',
      ],
      ['anime/final/episode-001.mp4'],
      'anime/manifests/episode-001-video-manifest.json',
      ['sourceManifest', 'imageManifest', 'durationSeconds', 'aspectRatio', 'shotPlan'],
      ['apiKey', 'api_key', 'token', 'cookie', 'secret'],
      ['volcengine-seedance']
    ),
    contract(
      'tts',
      'tts_generation_adapter',
      [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/dialogue/**',
      ],
      'anime/manifests/episode-001-audio-manifest.json',
      ['sourceManifest', 'screenplayPath', 'language', 'voicePlan'],
      ['apiKey', 'api_key', 'token', 'cookie', 'secret'],
      ['volcengine-openspeech-tts']
    ),
    contract(
      'sfx',
      'sfx_generation_adapter',
      [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/sfx/**',
      ],
      'anime/manifests/episode-001-audio-manifest.json',
      ['sourceManifest', 'screenplayPath', 'cueSheet', 'timingSource'],
      ['apiKey', 'api_key', 'token', 'cookie', 'secret'],
      ['custom-http-sfx']
    ),
    contract(
      'music',
      'music_generation_adapter',
      [
        'anime/scripts/episode-001-screenplay.md',
        'anime/manifests/episode-001-script-manifest.json',
      ],
      [
        'anime/manifests/episode-001-audio-manifest.json',
        'anime/assets/audio/episode-001/music/**',
      ],
      'anime/manifests/episode-001-audio-manifest.json',
      ['sourceManifest', 'screenplayPath', 'musicBrief', 'timingSource'],
      ['apiKey', 'api_key', 'token', 'cookie', 'secret'],
      ['custom-http-music']
    ),
  ];
}

function contract(
  kind: ProviderContract['kind'],
  adapterSlot: string,
  inputArtifacts: string[],
  outputArtifacts: string[],
  trackingManifest: string,
  requiredFields: string[],
  forbiddenFields: string[],
  recommendedProviders: string[]
): ProviderContract {
  return {
    kind,
    adapterSlot,
    inputArtifacts,
    outputArtifacts,
    trackingManifest,
    requiredFields,
    forbiddenFields,
    recommendedProviders,
  };
}

function createGenerationJobs(
  target: AnimeDramaTarget,
  timeline: ShotTimeline[]
): GenerationJobSpec[] {
  const [firstShot, , thirdShot] = timeline;
  const imageManifestPath = 'anime/manifests/episode-001-image-manifest.json';
  const videoManifestPath = 'anime/manifests/episode-001-video-manifest.json';
  const audioManifestPath = 'anime/manifests/episode-001-audio-manifest.json';
  const scriptManifestPath = 'anime/manifests/episode-001-script-manifest.json';

  return [
    {
      jobId: 'job-image-character-anchor',
      kind: 'image',
      provider: 'unassigned',
      adapterSlot: 'image_generation_adapter',
      manifestPath: imageManifestPath,
      input: {
        promptRef: 'anime/prompts/episode-001-character-prompts.yaml#lead-detective',
        assetId: 'lead-detective-anchor',
        aspectRatio: target.aspectRatio,
        sourceManifest: 'anime/manifests/episode-001-prompt-manifest.json',
        category: 'character',
      },
      output: {
        expectedPath: 'anime/assets/images/episode-001/lead-detective-anchor.png',
        format: 'png',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
    {
      jobId: 'job-image-scene-hook',
      kind: 'image',
      provider: 'unassigned',
      adapterSlot: 'image_generation_adapter',
      manifestPath: imageManifestPath,
      input: {
        promptRef: firstShot.promptRefs[0],
        assetId: firstShot.shotId,
        aspectRatio: target.aspectRatio,
        sourceManifest: 'anime/manifests/episode-001-prompt-manifest.json',
        category: 'scene',
      },
      output: {
        expectedPath: 'anime/assets/images/episode-001/shot-001-open-hook.png',
        format: 'png',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
    {
      jobId: 'job-image-scene-reveal',
      kind: 'image',
      provider: 'unassigned',
      adapterSlot: 'image_generation_adapter',
      manifestPath: imageManifestPath,
      input: {
        promptRef: thirdShot.promptRefs[0],
        assetId: thirdShot.shotId,
        aspectRatio: target.aspectRatio,
        sourceManifest: 'anime/manifests/episode-001-prompt-manifest.json',
        category: 'scene',
      },
      output: {
        expectedPath: 'anime/assets/images/episode-001/shot-003-cliffhanger-reveal.png',
        format: 'png',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
    {
      jobId: 'job-video-episode-001',
      kind: 'video',
      provider: 'unassigned',
      adapterSlot: 'video_generation_adapter',
      manifestPath: videoManifestPath,
      input: {
        sourceManifest: videoManifestPath,
        imageManifest: imageManifestPath,
        durationSeconds: target.episodeDurationSeconds,
        aspectRatio: target.aspectRatio,
        shotPlan: 'anime/scripts/episode-001-screenplay.md',
      },
      output: {
        expectedPath: 'anime/final/episode-001.mp4',
        format: 'mp4',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
    {
      jobId: 'job-tts-dialogue-episode-001',
      kind: 'tts',
      provider: 'unassigned',
      adapterSlot: 'tts_generation_adapter',
      manifestPath: audioManifestPath,
      input: {
        sourceManifest: scriptManifestPath,
        screenplayPath: 'anime/scripts/episode-001-screenplay.md',
        language: target.language,
        voicePlan: 'anime/audio/episode-001-voice-plan.yaml',
      },
      output: {
        expectedPath: 'anime/assets/audio/episode-001/dialogue/dialogue-main.mp3',
        format: 'mp3',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
    {
      jobId: 'job-sfx-episode-001',
      kind: 'sfx',
      provider: 'unassigned',
      adapterSlot: 'sfx_generation_adapter',
      manifestPath: audioManifestPath,
      input: {
        sourceManifest: scriptManifestPath,
        screenplayPath: 'anime/scripts/episode-001-screenplay.md',
        cueSheet: 'anime/audio/episode-001-sfx-cues.yaml',
        timingSource: 'anime/audio/episode-001-timeline.yaml',
      },
      output: {
        expectedPath: 'anime/assets/audio/episode-001/sfx/sfx-main.wav',
        format: 'wav',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
    {
      jobId: 'job-music-episode-001',
      kind: 'music',
      provider: 'unassigned',
      adapterSlot: 'music_generation_adapter',
      manifestPath: audioManifestPath,
      input: {
        sourceManifest: scriptManifestPath,
        screenplayPath: 'anime/scripts/episode-001-screenplay.md',
        musicBrief: 'anime/audio/episode-001-music-brief.md',
        timingSource: 'anime/audio/episode-001-timeline.yaml',
      },
      output: {
        expectedPath: 'anime/assets/audio/episode-001/music/music-main.wav',
        format: 'wav',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
  ];
}

function allowedPathsForArtifacts(paths: string[]): string[] {
  return uniqueStrings(
    paths.map((pathValue) => {
      const normalized = normalizePathReference(pathValue);
      if (normalized.endsWith('/**')) {
        return normalized;
      }
      if (!normalized.includes('/')) {
        return normalized;
      }

      return normalized;
    })
  );
}

function nextPhaseAgentIds(phase: PhaseDefinition, phases: PhaseDefinition[]): string[] {
  return phases
    .filter((candidate) => candidate.dependsOn.includes(phase.id))
    .map((candidate) => `${candidate.id}-agent`);
}

function nextNodeAgentIds(nodeItem: WorkflowNode, nodes: WorkflowNode[]): string[] {
  return nodes
    .filter((candidate) => candidate.dependsOn.includes(nodeItem.id))
    .map((candidate) => `${candidate.id}-agent`);
}

function ownerPhaseForNode(
  nodeItem: WorkflowNode,
  artifacts: ArtifactPlan[]
): string | undefined {
  const artifactMatch = artifacts.find((artifactItem) =>
    nodeItem.outputs.includes(artifactItem.path)
  );

  return artifactMatch?.producedBy;
}

function pathMatches(pattern: string, targetPath: string): boolean {
  const normalizedPattern = normalizePathReference(pattern);
  const normalizedTarget = normalizePathReference(targetPath);

  if (normalizedPattern === normalizedTarget) {
    return true;
  }
  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3);

    return normalizedTarget === prefix || normalizedTarget.startsWith(`${prefix}/`);
  }

  return false;
}

function pathsCompatible(availablePath: string, requestedPath: string): boolean {
  return pathMatches(availablePath, requestedPath) || pathMatches(requestedPath, availablePath);
}

function normalizePathReference(pathValue: string): string {
  return pathValue.split('#')[0];
}

function titleCase(value: string): string {
  return value
    .split(/[_-]/g)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function defaultAspectRatio(platform: TargetPlatform): AspectRatio {
  switch (platform) {
    case 'episodic-cinematic':
      return '16:9';
    case 'character-ip':
      return '9:16';
    case 'webtoon-motion':
      return '9:16';
    case 'vertical-short':
      return '9:16';
    case 'custom':
      return 'custom';
    default:
      return '9:16';
  }
}

function ensurePositiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function ensurePositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function deriveTitle(premise: string): string {
  const trimmed = premise.trim();
  if (!trimmed) {
    return 'Untitled AI Anime Drama';
  }

  return trimmed.length <= 24 ? trimmed : `${trimmed.slice(0, 24)}...`;
}
