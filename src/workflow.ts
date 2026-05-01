import {
  AnimeDramaBlueprint,
  AnimeDramaTarget,
  AnimeDramaWorkflowInput,
  ArtifactPlan,
  AspectRatio,
  GenerationJobSpec,
  PhaseDefinition,
  ProviderContract,
  ShotTimeline,
  TargetPlatform,
  WorkflowMutationResult,
  WorkflowNode,
} from './types';

const DEFAULT_DURATION_SECONDS = 75;
const DEFAULT_EPISODE_COUNT = 1;
const DEFAULT_LANGUAGE = 'zh-CN';
const DEFAULT_STYLE = 'anime drama, clean line art, expressive acting, consistent character design';

export function buildAnimeDramaWorkflow(
  input: AnimeDramaWorkflowInput
): AnimeDramaBlueprint {
  const normalized = normalizeInput(input);
  const phases = createDefaultPhases();
  const nodes = createDefaultNodes();
  const artifacts = createDefaultArtifacts();
  const sampleTimeline = createSampleTimeline(normalized);
  const providerContracts = createProviderContracts();
  const generationJobs = createGenerationJobs(normalized, sampleTimeline);

  return {
    kind: 'phase-ai-anime-blueprint',
    version: 1,
    title: input.title?.trim() || deriveTitle(input.premise),
    premise: input.premise.trim(),
    target: normalized,
    styleDirection: input.styleDirection?.trim() || DEFAULT_STYLE,
    overlays: input.overlays?.length ? input.overlays : ['character-consistency', 'audio-lipsync', 'provider-jobs'],
    phases,
    nodes,
    artifacts,
    sampleTimeline,
    providerContracts,
    generationJobs,
    qualityGates: [
      'Every shot has shotId, duration, camera, action, promptRefs, and audioCues.',
      'Every dialogue cue has speaker, text, timing, and emotion direction.',
      'Generation jobs are provider-neutral and contain no API keys, tokens, cookies, or local private paths.',
      'Assembly can be reconstructed from storyboard, timeline, jobs, and expected output paths.',
      'Human approval is required before real provider calls or public release.',
    ],
    nextSteps: [
      'Create plan/manifest.yaml from the selected profile and overlays.',
      'Write phase-0 concept and production constraints before generating assets.',
      'Upgrade future placeholder contracts only when planctl promotes them.',
      'Choose provider adapters only after the offline blueprint passes review.',
    ],
  };
}

export function insertWorkflowNode(
  blueprint: AnimeDramaBlueprint,
  node: WorkflowNode,
  afterNodeId?: string
): WorkflowMutationResult {
  if (blueprint.nodes.some((existing) => existing.id === node.id)) {
    return { success: false, error: `Node already exists: ${node.id}` };
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

  return issues;
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
      id: 'phase-0-concept-promise',
      title: 'Lock anime drama promise and production constraints',
      purpose: 'Define viewer promise, target platform, aspect ratio, duration, model-call depth, and non-goals.',
      requiredArtifacts: ['anime/bible/concept.md', 'anime/bible/production-constraints.md'],
      dependsOn: [],
    },
    {
      id: 'phase-1-cast-style-bible',
      title: 'Build cast, scene, and style bible',
      purpose: 'Create character anchors, scene anchors, visual style, voice direction, and continuity rules.',
      requiredArtifacts: ['anime/bible/characters.md', 'anime/bible/style-bible.md'],
      dependsOn: ['phase-0-concept-promise'],
    },
    {
      id: 'phase-2-episode-beat-sheet',
      title: 'Design episode beats and retention rhythm',
      purpose: 'Map hook, conflict, turns, payoff, and ending pull for the target duration.',
      requiredArtifacts: ['anime/scripts/episode-001-beats.md'],
      dependsOn: ['phase-1-cast-style-bible'],
    },
    {
      id: 'phase-3-dialogue-voice-script',
      title: 'Write dialogue, narration, subtitles, and voice direction',
      purpose: 'Produce TTS-friendly dialogue with speaker, emotion, pacing, and subtitle constraints.',
      requiredArtifacts: ['anime/scripts/episode-001-dialogue.md'],
      dependsOn: ['phase-2-episode-beat-sheet'],
    },
    {
      id: 'phase-4-shot-storyboard',
      title: 'Translate beats into shot storyboard',
      purpose: 'Create shot cards with timing, framing, action, camera movement, transitions, and audio hooks.',
      requiredArtifacts: ['anime/storyboard/episode-001-shots.yaml'],
      dependsOn: ['phase-3-dialogue-voice-script'],
    },
    {
      id: 'phase-5-visual-prompt-pack',
      title: 'Create image and video prompt pack',
      purpose: 'Generate image prompts, video prompts, negative prompts, references, seeds, and consistency notes.',
      requiredArtifacts: ['anime/prompts/episode-001-image-prompts.yaml', 'anime/prompts/episode-001-video-prompts.yaml'],
      dependsOn: ['phase-4-shot-storyboard'],
    },
    {
      id: 'phase-6-audio-timeline',
      title: 'Build audio, subtitle, and lip-sync timeline',
      purpose: 'Align dialogue, SFX, music, silence, subtitles, and action hit points on one timeline.',
      requiredArtifacts: ['anime/audio/episode-001-timeline.yaml'],
      dependsOn: ['phase-5-visual-prompt-pack'],
    },
    {
      id: 'phase-7-generation-job-specs',
      title: 'Export provider-neutral generation job specs',
      purpose: 'Prepare image, video, TTS, SFX, music, and assembly jobs without binding provider secrets.',
      requiredArtifacts: ['anime/jobs/episode-001-generation-jobs.json'],
      dependsOn: ['phase-6-audio-timeline'],
    },
    {
      id: 'phase-8-assembly-qc',
      title: 'Create final assembly manifest and QA checklist',
      purpose: 'Define final video structure, missing assets, sync checks, release checklist, and next iteration focus.',
      requiredArtifacts: ['anime/assembly/episode-001-assembly.json', 'anime/review/episode-001-qc.md'],
      dependsOn: ['phase-7-generation-job-specs'],
    },
  ];
}

function createDefaultNodes(): WorkflowNode[] {
  return [
    node('concept_intake', 'Concept Intake', 'creative', [], ['anime/bible/concept.md'], [], false, false),
    node('cast_style_bible', 'Cast and Style Bible', 'creative', ['concept_intake'], ['anime/bible/characters.md', 'anime/bible/style-bible.md'], ['concept_intake'], false, false),
    node('episode_beats', 'Episode Beats', 'creative', ['cast_style_bible'], ['anime/scripts/episode-001-beats.md'], ['cast_style_bible'], false, false),
    node('dialogue_script', 'Dialogue and Voice Script', 'creative', ['episode_beats'], ['anime/scripts/episode-001-dialogue.md'], ['episode_beats'], false, false),
    node('shot_storyboard', 'Shot Storyboard', 'storyboard', ['dialogue_script'], ['anime/storyboard/episode-001-shots.yaml'], ['dialogue_script'], false, false),
    node('visual_prompt_pack', 'Visual Prompt Pack', 'prompting', ['shot_storyboard'], ['anime/prompts/episode-001-image-prompts.yaml', 'anime/prompts/episode-001-video-prompts.yaml'], ['shot_storyboard'], false, false),
    node('audio_timeline', 'Audio Timeline', 'audio', ['dialogue_script', 'shot_storyboard'], ['anime/audio/episode-001-timeline.yaml'], ['dialogue_script', 'shot_storyboard'], false, false),
    node('generation_job_specs', 'Generation Job Specs', 'generation', ['visual_prompt_pack', 'audio_timeline'], ['anime/jobs/episode-001-generation-jobs.json'], ['visual_prompt_pack', 'audio_timeline'], false, false),
    node('assembly_manifest', 'Assembly Manifest', 'assembly', ['generation_job_specs'], ['anime/assembly/episode-001-assembly.json'], ['generation_job_specs'], false, false),
    node('human_qc', 'Human QC', 'review', ['assembly_manifest'], ['anime/review/episode-001-qc.md'], ['assembly_manifest'], true, true),
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
  deletable: boolean
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
    artifact('anime/bible/concept.md', 'markdown', 'Series promise, audience, platform, aspect ratio, duration, and non-goals.', 'phase-0-concept-promise'),
    artifact('anime/bible/characters.md', 'markdown', 'Character anchors for appearance, behavior, expression, and voice.', 'phase-1-cast-style-bible'),
    artifact('anime/bible/style-bible.md', 'markdown', 'Visual style, camera language, palette, lighting, and forbidden drift.', 'phase-1-cast-style-bible'),
    artifact('anime/scripts/episode-001-beats.md', 'markdown', 'Hook, beat map, escalation, payoff, and ending pull.', 'phase-2-episode-beat-sheet'),
    artifact('anime/scripts/episode-001-dialogue.md', 'markdown', 'TTS-friendly dialogue, narration, subtitles, and voice direction.', 'phase-3-dialogue-voice-script'),
    artifact('anime/storyboard/episode-001-shots.yaml', 'yaml', 'Shot cards with timing, framing, action, camera, and prompt refs.', 'phase-4-shot-storyboard'),
    artifact('anime/prompts/episode-001-image-prompts.yaml', 'yaml', 'Image prompts, reference placeholders, seeds, and negative prompts.', 'phase-5-visual-prompt-pack'),
    artifact('anime/prompts/episode-001-video-prompts.yaml', 'yaml', 'Image-to-video prompts, motion controls, and transition notes.', 'phase-5-visual-prompt-pack'),
    artifact('anime/audio/episode-001-timeline.yaml', 'yaml', 'Dialogue, SFX, music, silence, captions, and action hit points.', 'phase-6-audio-timeline'),
    artifact('anime/jobs/episode-001-generation-jobs.json', 'json', 'Provider-neutral image, video, TTS, SFX, music, and assembly jobs.', 'phase-7-generation-job-specs'),
    artifact('anime/assembly/episode-001-assembly.json', 'json', 'Final assembly manifest with clip, audio, subtitle, and gap tracking.', 'phase-8-assembly-qc'),
    artifact('anime/review/episode-001-qc.md', 'markdown', 'Human review checklist for continuity, sync, policy, and release decisions.', 'phase-8-assembly-qc'),
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
  const hookEnd = Math.min(3, target.episodeDurationSeconds);
  const midEnd = Math.max(hookEnd + 1, Math.round(target.episodeDurationSeconds * 0.58));
  const finalEnd = target.episodeDurationSeconds;

  return [
    {
      shotId: 'shot-001-hook',
      startSeconds: 0,
      endSeconds: hookEnd,
      visualIntent: 'Open with the protagonist already inside a sharp visual contradiction or immediate danger.',
      camera: 'fast push-in, vertical-safe close-up',
      action: 'The protagonist freezes as the impossible object speaks first.',
      promptRefs: ['anime/prompts/episode-001-image-prompts.yaml#shot-001-hook'],
      audioCues: [
        cue('cue-001-sfx', 'sfx', 0, 0.6, 'impact hit'),
        cue('cue-002-dialogue', 'dialogue', 0.6, hookEnd, '你听见了吗？它在叫我的名字。', 'protagonist', 'startled whisper'),
        cue('cue-003-subtitle', 'subtitle', 0.6, hookEnd, '你听见了吗？它在叫我的名字。'),
      ],
    },
    {
      shotId: 'shot-002-escalation',
      startSeconds: hookEnd,
      endSeconds: midEnd,
      visualIntent: 'Reveal the goal, obstacle, and cost with readable staging.',
      camera: 'medium shot to over-the-shoulder, slight handheld drift',
      action: 'The protagonist chooses between leaving safely and chasing the clue.',
      promptRefs: ['anime/prompts/episode-001-video-prompts.yaml#shot-002-escalation'],
      audioCues: [
        cue('cue-004-music', 'music', hookEnd, midEnd, 'low pulsing synth with rising strings'),
        cue('cue-005-dialogue', 'dialogue', hookEnd + 1, midEnd - 1, '如果现在不追，它就会永远消失。', 'protagonist', 'resolved'),
      ],
    },
    {
      shotId: 'shot-003-ending-pull',
      startSeconds: midEnd,
      endSeconds: finalEnd,
      visualIntent: 'End on a concrete unanswered question or emotional reversal.',
      camera: 'cut to extreme close-up, hold, then smash cut to black',
      action: 'The clue reveals a second voice that should not exist.',
      promptRefs: ['anime/prompts/episode-001-video-prompts.yaml#shot-003-ending-pull'],
      audioCues: [
        cue('cue-006-silence', 'silence', midEnd, midEnd + 0.5, 'breath pause'),
        cue('cue-007-dialogue', 'dialogue', midEnd + 0.5, finalEnd - 0.5, '别相信她。真正失踪的人，是你。', 'mystery_voice', 'calm and intimate'),
        cue('cue-008-sfx', 'sfx', finalEnd - 0.5, finalEnd, 'hard cut glitch'),
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
    contract('image', 'image_generation_adapter', ['anime/prompts/episode-001-image-prompts.yaml'], ['anime/assets/images/**'], ['promptRef', 'aspectRatio', 'styleRef', 'characterRefs'], ['apiKey', 'api_key', 'token', 'cookie', 'secret']),
    contract('video', 'image_to_video_adapter', ['anime/prompts/episode-001-video-prompts.yaml', 'anime/assets/images/**'], ['anime/assets/video/**'], ['promptRef', 'firstFrame', 'durationSeconds', 'camera'], ['apiKey', 'api_key', 'token', 'cookie', 'secret']),
    contract('tts', 'tts_adapter', ['anime/scripts/episode-001-dialogue.md', 'anime/audio/episode-001-timeline.yaml'], ['anime/assets/audio/voice/**'], ['speaker', 'text', 'emotion', 'language'], ['apiKey', 'api_key', 'token', 'cookie', 'secret']),
    contract('sfx', 'sfx_adapter', ['anime/audio/episode-001-timeline.yaml'], ['anime/assets/audio/sfx/**'], ['cue', 'durationSeconds', 'intensity'], ['apiKey', 'api_key', 'token', 'cookie', 'secret']),
    contract('assembly', 'assembly_adapter', ['anime/assembly/episode-001-assembly.json'], ['anime/final/**'], ['clips', 'audio', 'subtitles', 'timeline'], ['apiKey', 'api_key', 'token', 'cookie', 'secret']),
  ];
}

function contract(
  kind: ProviderContract['kind'],
  adapterSlot: string,
  inputArtifacts: string[],
  outputArtifacts: string[],
  requiredFields: string[],
  forbiddenFields: string[]
): ProviderContract {
  return { kind, adapterSlot, inputArtifacts, outputArtifacts, requiredFields, forbiddenFields };
}

function createGenerationJobs(
  target: AnimeDramaTarget,
  timeline: ShotTimeline[]
): GenerationJobSpec[] {
  const firstShot = timeline[0];
  const dialogueCue = firstShot.audioCues.find((cueItem) => cueItem.kind === 'dialogue');

  return [
    {
      jobId: 'job-image-shot-001-keyframe',
      kind: 'image',
      provider: 'unassigned',
      adapterSlot: 'image_generation_adapter',
      input: {
        promptRef: firstShot.promptRefs[0],
        aspectRatio: target.aspectRatio,
        styleRef: 'anime/bible/style-bible.md',
        characterRefs: ['anime/bible/characters.md'],
      },
      output: {
        expectedPath: 'anime/assets/images/shot-001-keyframe.png',
        format: 'png',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: false,
      },
    },
    {
      jobId: 'job-video-shot-001',
      kind: 'video',
      provider: 'unassigned',
      adapterSlot: 'image_to_video_adapter',
      input: {
        promptRef: 'anime/prompts/episode-001-video-prompts.yaml#shot-001-hook',
        firstFrame: 'anime/assets/images/shot-001-keyframe.png',
        durationSeconds: firstShot.endSeconds - firstShot.startSeconds,
        camera: firstShot.camera,
      },
      output: {
        expectedPath: 'anime/assets/video/shot-001.mp4',
        format: 'mp4',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
    {
      jobId: 'job-tts-shot-001-dialogue',
      kind: 'tts',
      provider: 'unassigned',
      adapterSlot: 'tts_adapter',
      input: {
        speaker: dialogueCue?.speaker || 'protagonist',
        text: dialogueCue?.text || '',
        emotion: dialogueCue?.emotion || 'neutral',
        language: target.language,
      },
      output: {
        expectedPath: 'anime/assets/audio/voice/shot-001-dialogue.wav',
        format: 'wav',
      },
      safety: {
        storesSecrets: false,
        requiresHumanApproval: true,
      },
    },
  ];
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
