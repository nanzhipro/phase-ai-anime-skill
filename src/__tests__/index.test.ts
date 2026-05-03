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
    expect(blueprint.target.modelCallDepth).toBe('offline-spec-only');
    expect(blueprint.phaseFlow).toEqual(
      expect.objectContaining({
        mode: 'standard',
        startPhaseId: 'phase-0-concept-promise',
        resetRequested: false,
      })
    );
    expect(blueprint.phases).toHaveLength(9);
    expect(blueprint.nodes.map((node) => node.id)).toContain('audio_timeline');
    expect(blueprint.agents.map((agent) => agent.role)).toEqual(
      expect.arrayContaining(['phase', 'node', 'adapter'])
    );
    expect(blueprint.artifacts.map((artifact) => artifact.path)).toContain(
      'anime/jobs/episode-001-generation-jobs.json'
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
        startPhaseId: 'phase-0-concept-promise',
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
      blueprint.phases.length + blueprint.nodes.length + blueprint.providerContracts.length
    );
    expect(blueprint.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'phase', ownerPhaseId: 'phase-4-shot-storyboard' }),
        expect.objectContaining({ role: 'node', nodeId: 'shot_storyboard' }),
        expect.objectContaining({ role: 'adapter', adapterSlot: 'image_to_video_adapter' }),
      ])
    );
  });

  it('reports a missing phase agent', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '便利店收银机突然开始打印未来的悔意。' });
    const invalidBlueprint = {
      ...blueprint,
      agents: blueprint.agents.filter((agent) => agent.id !== 'phase-0-concept-promise-agent'),
    };

    expect(validateAnimeDramaBlueprint(invalidBlueprint)).toContain(
      'phase phase-0-concept-promise is missing a phase agent'
    );
  });

  it('reports a missing node agent', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '少女发现自己的影子已经替她拍完了预告片。' });
    const invalidBlueprint = {
      ...blueprint,
      agents: blueprint.agents.filter((agent) => agent.id !== 'audio_timeline-agent'),
    };

    expect(validateAnimeDramaBlueprint(invalidBlueprint)).toContain(
      'workflow node audio_timeline is missing a node agent'
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
      inputs: ['anime/audio/episode-001-timeline.yaml'],
      outputs: ['anime/review/platform-caption-review.md'],
      requiredArtifacts: ['anime/review/platform-caption-review.md'],
      replaceableBy: ['human-review'],
      dependsOn: ['audio_timeline'],
      optional: true,
      deletable: true,
    };
    const agent = createNodeAgentForTest(node);

    const result = insertWorkflowNode(blueprint, node, 'audio_timeline', agent);

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
      inputs: ['anime/audio/episode-001-timeline.yaml'],
      outputs: ['anime/review/policy-caption-review.md'],
      requiredArtifacts: ['anime/review/policy-caption-review.md'],
      replaceableBy: ['human-review'],
      dependsOn: ['audio_timeline'],
      optional: true,
      deletable: true,
    };

    const result = insertWorkflowNode(blueprint, node, 'audio_timeline');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Node agent is required for inserted node: policy_caption_review');
  });

  it('prevents removing a node used by downstream nodes', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '便利店门口的自动贩卖机开始预告明天。' });

    const result = removeWorkflowNode(blueprint, 'audio_timeline');

    expect(result.success).toBe(false);
    expect(result.error).toContain('generation_job_specs');
  });

  it('can remove a deletable terminal review node', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '一位失眠少女每晚都被同一段片尾曲叫醒。' });

    const result = removeWorkflowNode(blueprint, 'human_qc');

    expect(result.success).toBe(true);
    expect(result.workflow?.nodes.map((node) => node.id)).not.toContain('human_qc');
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

    expect(registry.map((entry) => entry.status)).toContain('contract-only');
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
      'image_to_video_adapter'
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
    ownerPhaseId: 'phase-6-audio-timeline',
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
      nextAgentIds: ['generation_job_specs-agent'],
      notes: ['Inserted during test.'],
    },
  };
}
