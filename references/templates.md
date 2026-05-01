# Phase-AI-Anime Plan Templates

本文件提供生成 AI 漫剧项目时的基础模板。占位符用尖括号标注。

## `plan/manifest.yaml`

```yaml
version: 1
kind: phase-ai-anime-plan-manifest
project: <project-name>
entrypoints:
  overview: README.md
  common: plan/common.md
  workflow: plan/workflow.md
  handoff: plan/handoff.md
workflow_profile:
  profile: <vertical-short|episodic-cinematic|webtoon-motion|character-ip|custom>
  engine: <hook-driven|cinematic-emotion|panel-motion|character-loop|custom>
  overlays:
    - character-consistency
    - audio-lipsync
project_profile:
  form: <vertical-short|pilot-episode|webtoon-motion|series-package>
  delivery_tier: <animatic-mvp|episode-package|final-video>
  target_runtime_seconds:
    min: <45>
    max: <90>
  target_shots:
    min: <8>
    max: <18>
  target_shot_pattern: '^shot_id:'
  timeline_paths:
    - anime/audio/**/*timeline*.yaml
  job_spec_paths:
    - anime/jobs/**/*.json
  assembly_paths:
    - anime/assembly/**/*.json
  delivery_paths:
    - anime/storyboard/**/*.yaml
    - anime/audio/**/*.yaml
    - anime/jobs/**/*.json
    - anime/assembly/**/*.json
    - anime/final/**/*
repo_policy:
  mode: standalone
  protected_branches:
    - main
    - master
execution_rule:
  description: >-
    执行任一 AI 漫剧制作 phase 时，必须同时携带 common、当前 phase 定位合同和当前 execution 合同。
  resolver: scripts/planctl
  state_file: plan/state.yaml
  handoff_file: plan/handoff.md
  repo_instructions:
    - .github/copilot-instructions.md
    - CLAUDE.md
    - AGENTS.md
  continuous_execution:
    next_command: ruby scripts/planctl advance --strict
    completion_command: >-
      ruby scripts/planctl complete <phase-id> --summary "<summary>" --next-focus "<next-focus>" --continue
  continuation:
    mode: autonomous
    stop_only_on:
      - dependency_missing
      - missing_context
      - required_gate_failed
      - git_conflict
      - destructive_operation_required
      - all_phases_completed
    non_stop_actions:
      - phase_completed
      - next_phase_ready
      - placeholder_contract_promotion
      - optional_check_failed
      - no_remote_configured
  enforcement:
    dependency_check: true
    stop_on_missing_context: true
    require_execution_file: true
  enforce_allowed_paths: false
  compression_control:
    enabled: true
    max_completion_history: 3
    resume_read_order:
      - plan/manifest.yaml
      - plan/handoff.md
      - next.phase.required_context
    rules:
      - 永远不要一次性加载所有 phase 文档。
      - 当前窗口只读取 plan/common.md、当前 phase plan 和当前 phase execution。
      - 每完成一个 phase 后更新 handoff，再进入下一 phase。
  read_order:
    - plan/common.md
    - phase.plan_file
    - phase.execution_file
  required_context:
    - plan/common.md
phases:
  - id: phase-0-concept-promise
    title: Lock the anime drama promise and production constraints
    plan_file: plan/phases/phase-0-concept-promise.md
    execution_file: plan/execution/phase-0-concept-promise.md
    required_context:
      - plan/common.md
      - plan/phases/phase-0-concept-promise.md
      - plan/execution/phase-0-concept-promise.md
    depends_on: []
    allowed_paths:
      - anime/bible/concept.md
      - anime/bible/production-constraints.md
      - plan/**
    artifact_checks:
      - type: file_exists
        path: anime/bible/concept.md
      - type: min_chars
        path: anime/bible/concept.md
        min: 600
      - type: no_placeholder_tokens
        path: anime/bible/concept.md
  - id: phase-1-cast-style-bible
    title: Build character, scene, and style bible
    plan_file: plan/phases/phase-1-cast-style-bible.md
    execution_file: plan/execution/phase-1-cast-style-bible.md
    required_context:
      - plan/common.md
      - plan/phases/phase-1-cast-style-bible.md
      - plan/execution/phase-1-cast-style-bible.md
    depends_on:
      - phase-0-concept-promise
    allowed_paths:
      - anime/bible/**
    artifact_checks:
      - type: file_exists
        path: anime/bible/characters.md
      - type: file_exists
        path: anime/bible/style-bible.md
      - type: no_placeholder_tokens
        path: anime/bible/characters.md
  - id: phase-2-episode-beat-sheet
    title: Design episode beats and retention rhythm
    plan_file: plan/phases/phase-2-episode-beat-sheet.md
    execution_file: plan/execution/phase-2-episode-beat-sheet.md
    required_context:
      - plan/common.md
      - plan/phases/phase-2-episode-beat-sheet.md
      - plan/execution/phase-2-episode-beat-sheet.md
    depends_on:
      - phase-1-cast-style-bible
    allowed_paths:
      - anime/scripts/episode-001-beats.md
      - anime/scripts/retention-map.md
      - plan/**
  - id: phase-3-dialogue-voice-script
    title: Write dialogue, subtitle, and voice direction
    plan_file: plan/phases/phase-3-dialogue-voice-script.md
    execution_file: plan/execution/phase-3-dialogue-voice-script.md
    required_context:
      - plan/common.md
      - plan/phases/phase-3-dialogue-voice-script.md
      - plan/execution/phase-3-dialogue-voice-script.md
    depends_on:
      - phase-2-episode-beat-sheet
    allowed_paths:
      - anime/scripts/episode-001-dialogue.md
      - anime/scripts/subtitle-style.md
      - plan/**
  - id: phase-4-shot-storyboard
    title: Translate beats into shot storyboard
    plan_file: plan/phases/phase-4-shot-storyboard.md
    execution_file: plan/execution/phase-4-shot-storyboard.md
    required_context:
      - plan/common.md
      - plan/phases/phase-4-shot-storyboard.md
      - plan/execution/phase-4-shot-storyboard.md
    depends_on:
      - phase-3-dialogue-voice-script
    allowed_paths:
      - anime/storyboard/**
      - plan/**
    artifact_checks:
      - type: file_exists
        path: anime/storyboard/episode-001-shots.yaml
      - type: regex_count
        path: anime/storyboard/episode-001-shots.yaml
        pattern: '^\s*shot_id:'
        min: 8
      - type: no_placeholder_tokens
        path: anime/storyboard/episode-001-shots.yaml
  - id: phase-5-visual-prompt-pack
    title: Create image and video prompt pack
    plan_file: plan/phases/phase-5-visual-prompt-pack.md
    execution_file: plan/execution/phase-5-visual-prompt-pack.md
    required_context:
      - plan/common.md
      - plan/phases/phase-5-visual-prompt-pack.md
      - plan/execution/phase-5-visual-prompt-pack.md
    depends_on:
      - phase-4-shot-storyboard
    allowed_paths:
      - anime/prompts/**
      - anime/bible/character-anchors.yaml
      - plan/**
  - id: phase-6-audio-timeline
    title: Build audio, subtitle, and lip-sync timeline
    plan_file: plan/phases/phase-6-audio-timeline.md
    execution_file: plan/execution/phase-6-audio-timeline.md
    required_context:
      - plan/common.md
      - plan/phases/phase-6-audio-timeline.md
      - plan/execution/phase-6-audio-timeline.md
    depends_on:
      - phase-5-visual-prompt-pack
    allowed_paths:
      - anime/audio/**
      - plan/**
    artifact_checks:
      - type: file_exists
        path: anime/audio/episode-001-timeline.yaml
      - type: regex_count
        path: anime/audio/episode-001-timeline.yaml
        pattern: '^\s*shot_id:'
        min: 8
      - type: no_placeholder_tokens
        path: anime/audio/episode-001-timeline.yaml
  - id: phase-7-generation-job-specs
    title: Export provider-neutral generation job specs
    plan_file: plan/phases/phase-7-generation-job-specs.md
    execution_file: plan/execution/phase-7-generation-job-specs.md
    required_context:
      - plan/common.md
      - plan/phases/phase-7-generation-job-specs.md
      - plan/execution/phase-7-generation-job-specs.md
    depends_on:
      - phase-6-audio-timeline
    allowed_paths:
      - anime/jobs/**
      - plan/**
    artifact_checks:
      - type: file_exists
        path: anime/jobs/episode-001-generation-jobs.json
      - type: no_placeholder_tokens
        path: anime/jobs/episode-001-generation-jobs.json
        tokens:
          - api_key
          - token
          - cookie
          - secret
  - id: phase-8-assembly-qc
    title: Create final assembly manifest and QA checklist
    plan_file: plan/phases/phase-8-assembly-qc.md
    execution_file: plan/execution/phase-8-assembly-qc.md
    required_context:
      - plan/common.md
      - plan/phases/phase-8-assembly-qc.md
      - plan/execution/phase-8-assembly-qc.md
    depends_on:
      - phase-7-generation-job-specs
    allowed_paths:
      - anime/assembly/**
      - anime/review/**
      - anime/final/**
      - plan/**
    artifact_checks:
      - type: file_exists
        path: anime/assembly/episode-001-assembly.json
      - type: file_exists
        path: anime/review/episode-001-qc.md
```

## `plan/common.md`

```markdown
# <project-name> 通用制作约束

## 结论

<一句话说明 AI 漫剧定位，例如：这是一条 60 秒竖屏悬疑喜剧，核心快感是反差侦探和雨夜谜题。>

## 目标成片

- 平台/画幅：<vertical 9:16 / horizontal 16:9 / square 1:1>
- 单集时长：<min-max 秒>
- 目标镜头数：<min-max 个镜头>
- 语言：<中文/英文/双语>
- MVP 深度：默认只导出 job specs，不真实调用模型。

## 长期硬约束

- 角色一致性：<核心角色必须保留的外观/服装/声口>
- 视觉风格：<风格锚点>
- 音画同步：每个镜头必须有时间码、台词/音效/音乐 cue 和字幕关系。
- Provider 安全：不得把 API key 写进仓库。
- 合成路径：storyboard、audio timeline、generation jobs 和 assembly manifest 必须能互相追溯。

## 非目标

- <不做的题材、平台、风格或技术调用>
```

## `plan/state.yaml`

```yaml
version: 1
completed_phases: []
completion_log: []
```

## `plan/handoff.md`

```markdown
# Phase-AI-Anime Execution Handoff

尚未开始任何 phase。

恢复顺序：

1. 读取 `plan/manifest.yaml`
2. 读取 `plan/handoff.md`
3. 运行 `ruby scripts/planctl advance --strict`
```
