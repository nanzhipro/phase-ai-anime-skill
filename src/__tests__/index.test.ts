import {
  animeSkillHandler,
  buildAnimeDramaWorkflow,
  createAdapterRegistry,
  createErrorResponse,
  createSkillResponse,
  AgentSpec,
  GenerationJobSpec,
  insertWorkflowNode,
  removeWorkflowNode,
  validateGenerationJobAgainstContract,
  validateGenerationJobsAgainstContracts,
  validateAnimeDramaBlueprint,
  WorkflowNode,
} from '../index';

describe('createSkillResponse', () => {
  it('creates a successful response with data', () => {
    const result = createSkillResponse({ id: '1', title: 'Test Anime Drama' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '1', title: 'Test Anime Drama' });
    expect(result.error).toBeUndefined();
  });

  it('creates a response with explicit success=false', () => {
    const result = createSkillResponse(null, false);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });
});

describe('createErrorResponse', () => {
  it('creates an error response', () => {
    const result = createErrorResponse('Something went wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
    expect(result.data).toBeUndefined();
  });
});

describe('buildAnimeDramaWorkflow', () => {
  it('builds the default offline MVP workflow', () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '一个怕水的猫耳侦探必须在暴雨夜找回会说话的失踪耳机。',
    });

    expect(blueprint.kind).toBe('phase-ai-anime-blueprint');
    expect(blueprint.target.platform).toBe('vertical-short');
    expect(blueprint.target.aspectRatio).toBe('9:16');
    expect(blueprint.target.episodeDurationSeconds).toBe(15);
    expect(blueprint.target.modelCallDepth).toBe('offline-spec-only');
    expect(blueprint.phaseFlow).toEqual(
      expect.objectContaining({
        mode: 'standard',
        startPhaseId: 'phase-0-screenplay-design',
        resetRequested: false,
      })
    );
    expect(blueprint.phases).toHaveLength(4);
    expect(blueprint.phases.every((phase) => phase.requiresUserConfirmation)).toBe(true);
    expect(blueprint.nodes.map((node) => node.id)).toContain('image_generation');
    expect(blueprint.generationCapabilities.map((capability) => capability.id)).toEqual(
      expect.arrayContaining([
        'text-to-image-capability',
        'video-generation-capability',
        'tts-generation-capability',
        'sfx-generation-capability',
        'music-generation-capability',
      ])
    );
    expect(blueprint.agents.map((agent) => agent.role)).toEqual(
      expect.arrayContaining(['phase', 'node', 'capability', 'adapter'])
    );
    expect(blueprint.artifacts.map((artifact) => artifact.path)).toContain(
      'anime/manifests/episode-001-image-manifest.json'
    );
    expect(validateAnimeDramaBlueprint(blueprint)).toEqual([]);
  });

  it('keeps generation jobs provider-neutral and secret-free', () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '少女在废弃影院里发现未来的自己正在配音。',
      targetPlatform: 'episodic-cinematic',
      episodeDurationSeconds: 180,
    });

    expect(blueprint.target.aspectRatio).toBe('16:9');
    expect(blueprint.generationJobs.every((job) => job.provider === 'unassigned')).toBe(true);
    expect(JSON.stringify(blueprint.generationJobs).toLowerCase()).not.toContain('api_key');
    expect(blueprint.generationJobs.every((job) => job.manifestPath.includes('manifest'))).toBe(true);
    expect(blueprint.sampleTimeline[blueprint.sampleTimeline.length - 1].endSeconds).toBe(180);
  });

  it('can mark the blueprint to restart from phase-0', () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '一个忘了自己台词的侦探必须重演昨晚的暴雨现场。',
      phaseFlowMode: 'reset-phase-0',
    });

    expect(blueprint.phaseFlow).toEqual(
      expect.objectContaining({
        mode: 'reset-phase-0',
        startPhaseId: 'phase-0-screenplay-design',
        resetRequested: true,
      })
    );
    expect(blueprint.nextSteps[0]).toContain('ruby scripts/planctl reset');
  });
});

describe('workflow agent contracts', () => {
  it('creates phase, node, and adapter agents for the default workflow', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一台复古录音机每天重播主角还没说出口的话。' });

    expect(blueprint.agents).toHaveLength(
      blueprint.phases.length +
        blueprint.nodes.length +
        blueprint.generationCapabilities.length +
        blueprint.providerContracts.length
    );
    expect(blueprint.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'phase', ownerPhaseId: 'phase-1-prompt-package' }),
        expect.objectContaining({ role: 'node', nodeId: 'prompt_package' }),
        expect.objectContaining({
          role: 'capability',
          capabilityId: 'text-to-image-capability',
          capabilityKind: 'text-to-image',
          executionMode: 'standalone-or-collaborative',
        }),
        expect.objectContaining({ role: 'adapter', adapterSlot: 'video_generation_adapter' }),
      ])
    );
  });

  it('separates reusable and specialized capability concerns for image and video generation', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '便利店屋檐下的耳机开始指挥一场只持续 15 秒的追逐。' });

    const imageCapability = blueprint.generationCapabilities.find(
      (capability) => capability.id === 'text-to-image-capability'
    );
    const videoCapability = blueprint.generationCapabilities.find(
      (capability) => capability.id === 'video-generation-capability'
    );

    expect(imageCapability).toEqual(
      expect.objectContaining({
        executionMode: 'standalone-or-collaborative',
        collaboratesWith: ['video-generation-capability'],
      })
    );
    expect(imageCapability?.reusableAbilities).toEqual(
      expect.arrayContaining(['provider-neutral job validation', 'manifest update and lineage recording'])
    );
    expect(imageCapability?.specializedAbilities).toEqual(
      expect.arrayContaining(['prompt-to-image request planning'])
    );

    expect(videoCapability).toEqual(
      expect.objectContaining({
        executionMode: 'standalone-or-collaborative',
        collaboratesWith: expect.arrayContaining([
          'text-to-image-capability',
          'tts-generation-capability',
          'sfx-generation-capability',
          'music-generation-capability',
        ]),
      })
    );
    expect(videoCapability?.reusableAbilities).toEqual(
      expect.arrayContaining(['provider-neutral job validation', 'runtime preflight and approval gate handling'])
    );
    expect(videoCapability?.specializedAbilities).toEqual(
      expect.arrayContaining(['async submit-and-poll task orchestration'])
    );
  });

  it('adds standalone-or-collaborative audio capabilities for tts, sfx, and music', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '旧耳机把雨夜所有脚步声都转录成了旋律。' });

    const ttsCapability = blueprint.generationCapabilities.find(
      (capability) => capability.id === 'tts-generation-capability'
    );
    const sfxCapability = blueprint.generationCapabilities.find(
      (capability) => capability.id === 'sfx-generation-capability'
    );
    const musicCapability = blueprint.generationCapabilities.find(
      (capability) => capability.id === 'music-generation-capability'
    );

    expect(ttsCapability).toEqual(
      expect.objectContaining({
        executionMode: 'standalone-or-collaborative',
        adapterSlots: ['tts_generation_adapter'],
        collaboratesWith: expect.arrayContaining([
          'sfx-generation-capability',
          'music-generation-capability',
          'video-generation-capability',
        ]),
      })
    );
    expect(ttsCapability?.reusableAbilities).toEqual(
      expect.arrayContaining(['provider-neutral job validation'])
    );
    expect(ttsCapability?.specializedAbilities).toEqual(
      expect.arrayContaining(['script-to-voice planning'])
    );

    expect(sfxCapability?.specializedAbilities).toEqual(
      expect.arrayContaining(['cue-sheet to effect planning'])
    );
    expect(musicCapability?.specializedAbilities).toEqual(
      expect.arrayContaining(['score brief and motif planning'])
    );
  });

  it('reports a missing phase agent', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '便利店收银机突然开始打印未来的悔意。' });
    const invalidBlueprint = {
      ...blueprint,
      agents: blueprint.agents.filter((agent) => agent.id !== 'phase-0-screenplay-design-agent'),
    };

    expect(validateAnimeDramaBlueprint(invalidBlueprint)).toContain(
      'phase phase-0-screenplay-design is missing a phase agent'
    );
  });

  it('reports a missing node agent', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '少女发现自己的影子已经替她拍完了预告片。' });
    const invalidBlueprint = {
      ...blueprint,
      agents: blueprint.agents.filter((agent) => agent.id !== 'image_generation-agent'),
    };

    expect(validateAnimeDramaBlueprint(invalidBlueprint)).toContain(
      'workflow node image_generation is missing a node agent'
    );
  });

  it('reports a missing capability agent', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一支会梦游的耳机把最后一个镜头提前泄露了。' });
    const invalidBlueprint = {
      ...blueprint,
      agents: blueprint.agents.filter(
        (agent) => agent.id !== 'video-generation-capability-agent'
      ),
    };

    expect(validateAnimeDramaBlueprint(invalidBlueprint)).toContain(
      'generation capability video-generation-capability is missing a capability agent'
    );
  });
});

describe('workflow node mutations', () => {
  it('can insert an optional workflow node after an existing node', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一只会剪辑的幽灵想让自己的遗作爆火。' });
    const node: WorkflowNode = {
      id: 'platform_caption_review',
      label: 'Platform Caption Review',
      type: 'review',
      inputs: ['anime/manifests/episode-001-video-manifest.json'],
      outputs: ['anime/review/platform-caption-review.md'],
      requiredArtifacts: ['anime/review/platform-caption-review.md'],
      replaceableBy: ['human-review'],
      dependsOn: ['video_generation'],
      optional: true,
      deletable: true,
      requiresUserConfirmation: false,
      trackingManifest: 'anime/manifests/episode-001-video-manifest.json',
    };
    const agent = createNodeAgentForTest(node);

    const result = insertWorkflowNode(blueprint, node, 'video_generation', agent);

    expect(result.success).toBe(true);
    expect(result.workflow?.nodes.map((item) => item.id)).toContain('platform_caption_review');
    expect(result.workflow?.agents.map((item) => item.id)).toContain('platform_caption_review-agent');
    expect(validateAnimeDramaBlueprint(result.workflow!)).toEqual([]);
  });

  it('requires a node agent when inserting a workflow node', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '旧投影仪开始剪掉主角所有说谎的镜头。' });
    const node: WorkflowNode = {
      id: 'policy_caption_review',
      label: 'Policy Caption Review',
      type: 'review',
      inputs: ['anime/manifests/episode-001-video-manifest.json'],
      outputs: ['anime/review/policy-caption-review.md'],
      requiredArtifacts: ['anime/review/policy-caption-review.md'],
      replaceableBy: ['human-review'],
      dependsOn: ['video_generation'],
      optional: true,
      deletable: true,
      requiresUserConfirmation: false,
      trackingManifest: 'anime/manifests/episode-001-video-manifest.json',
    };

    const result = insertWorkflowNode(blueprint, node, 'video_generation');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Node agent is required for inserted node: policy_caption_review');
  });

  it('prevents removing a node used by downstream nodes', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '便利店门口的自动贩卖机开始预告明天。' });

    const result = removeWorkflowNode(blueprint, 'image_generation');

    expect(result.success).toBe(false);
    expect(result.error).toContain('video_generation');
  });

  it('can remove an inserted deletable terminal review node', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一位失眠少女每晚都被同一段片尾曲叫醒。' });
    const node: WorkflowNode = {
      id: 'delivery_gate_review',
      label: 'Delivery Gate Review',
      type: 'review',
      inputs: ['anime/manifests/episode-001-video-manifest.json'],
      outputs: ['anime/review/delivery-gate-review.md'],
      requiredArtifacts: ['anime/review/delivery-gate-review.md'],
      replaceableBy: ['human-review'],
      dependsOn: ['video_generation'],
      optional: true,
      deletable: true,
      requiresUserConfirmation: false,
      trackingManifest: 'anime/manifests/episode-001-video-manifest.json',
    };
    const insertResult = insertWorkflowNode(
      blueprint,
      node,
      'video_generation',
      createNodeAgentForTest(node)
    );

    expect(insertResult.success).toBe(true);

    const result = removeWorkflowNode(insertResult.workflow!, 'delivery_gate_review');

    expect(result.success).toBe(true);
    expect(result.workflow?.nodes.map((node) => node.id)).not.toContain('delivery_gate_review');
  });
});

describe('provider adapter contracts', () => {
  it('validates generated jobs against provider contracts', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一盏路灯每天午夜都会给路人递剧本。' });
    const registry = createAdapterRegistry(blueprint.providerContracts);

    const result = validateGenerationJobsAgainstContracts(
      blueprint.generationJobs,
      blueprint.providerContracts
    );

    expect(blueprint.generationJobs.map((job) => job.adapterSlot)).toEqual(
      expect.arrayContaining([
        'image_generation_adapter',
        'video_generation_adapter',
        'tts_generation_adapter',
        'sfx_generation_adapter',
        'music_generation_adapter',
      ])
    );
    expect(registry.map((entry) => entry.status)).toEqual([
      'available',
      'available',
      'available',
      'available',
      'available',
    ]);
    expect(registry.map((entry) => entry.trackingManifest)).toEqual(
      expect.arrayContaining([
        'anime/manifests/episode-001-image-manifest.json',
        'anime/manifests/episode-001-video-manifest.json',
        'anime/manifests/episode-001-audio-manifest.json',
      ])
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects jobs with forbidden secret-like fields', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一位配音演员发现自己能听见明天的弹幕。' });
    const job: GenerationJobSpec = {
      ...blueprint.generationJobs[0],
      input: {
        ...blueprint.generationJobs[0].input,
        api_key: 'should-never-be-here',
      },
    };

    const result = validateGenerationJobAgainstContract(job, blueprint.providerContracts[0]);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('forbidden_field');
  });

  it('rejects adapter slot mismatches', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一台旧电视机开始播放还没发生的片尾。' });
    const job: GenerationJobSpec = {
      ...blueprint.generationJobs[1],
      adapterSlot: 'wrong_adapter_slot',
    };

    const result = validateGenerationJobAgainstContract(job, blueprint.providerContracts[1]);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('adapter_slot_mismatch');
  });
});

describe('animeSkillHandler', () => {
  it('returns error response when query is empty', async () => {
    const result = await animeSkillHandler({ query: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Query is required');
  });

  it('returns a validated blueprint for a valid query', async () => {
    const result = await animeSkillHandler({
      query: '一个新手魔法少女必须在 60 秒内让全班相信黑板会说话。',
      context: {
        title: '会说话的黑板',
        targetPlatform: 'vertical-short',
        episodeDurationSeconds: 60,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('会说话的黑板');
    expect(result.data?.target.episodeDurationSeconds).toBe(60);
    expect(result.data?.providerContracts.map((contract) => contract.adapterSlot)).toContain(
      'video_generation_adapter'
    );
  });

  it('parses reset phase requests and restarts from phase-0', async () => {
    const result = await animeSkillHandler({
      query: 'reset phase: 一个猫耳侦探决定重新调查昨夜的耳机失踪案。',
      context: {
        episodeDurationSeconds: 60,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.premise).toBe('一个猫耳侦探决定重新调查昨夜的耳机失踪案。');
    expect(result.data?.phaseFlow).toEqual(
      expect.objectContaining({
        mode: 'reset-phase-0',
        resetRequested: true,
      })
    );
    expect(result.data?.nextSteps[0]).toContain('ruby scripts/planctl reset');
  });

  it('returns actionable guidance for a bare reset phase request', async () => {
    const result = await animeSkillHandler({ query: 'reset phase' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ruby scripts/planctl reset');
  });
});

function createNodeAgentForTest(node: WorkflowNode): AgentSpec {
  return {
    id: `${node.id}-agent`,
    label: `${node.label} Agent`,
    role: 'node',
    purpose: `Test agent for ${node.id}.`,
    ownerPhaseId: 'phase-3-video-generation',
    nodeId: node.id,
    inputs: node.inputs,
    outputs: node.outputs,
    allowedPaths: node.outputs,
    requiredArtifacts: node.requiredArtifacts,
    qualityGates: ['Inserted node output is present before handoff.'],
    handoffArtifacts: node.outputs,
    forbiddenActions: ['Do not write secrets or private paths.'],
    humanApprovalGates: [],
    handoff: {
      producedArtifacts: node.outputs,
      nextAgentIds: [],
      notes: ['Inserted during test.'],
    },
  };
}
