# Profile + Overlay 展开示例

本文件展示 profile 与 overlay 如何合并成 AI 漫剧项目的 phase 链。示例只生成合同和任务规格，不真实调用图像、视频、TTS 或音乐模型。

## 示例一：竖屏短剧 + 留存 + 音画同步

**用户输入**：60 秒竖屏悬疑喜剧，一个猫耳侦探在雨夜便利店追踪会说话的耳机。

**选择**：

- profile: `vertical-short`
- overlays: `short-form-retention`, `character-consistency`, `audio-lipsync`, `provider-jobs`
- target: 9:16, 45-90 秒, 8-18 镜头

**基础 phase 链**：

1. `phase-0-concept-promise`
2. `phase-1-cast-style-bible`
3. `phase-2-episode-beat-sheet`
4. `phase-3-dialogue-voice-script`
5. `phase-4-shot-storyboard`
6. `phase-5-visual-prompt-pack`
7. `phase-6-audio-timeline`
8. `phase-7-generation-job-specs`
9. `phase-8-assembly-qc`

**overlay 结果**：

- `short-form-retention` 要求 `phase-2-episode-beat-sheet` 明确 0-3 秒钩子、每 6-10 秒信息变化和尾部牵引。
- `character-consistency` 强化 `phase-1-cast-style-bible`，新增 `anime/bible/character-anchors.yaml`。
- `audio-lipsync` 强化 `phase-6-audio-timeline`，新增 `anime/audio/lipsync-notes.yaml`。
- `provider-jobs` 强化 `phase-7-generation-job-specs`，新增 `anime/jobs/provider-map.yaml`。

**最小制品**：

- `anime/bible/concept.md`
- `anime/bible/characters.md`
- `anime/bible/style-bible.md`
- `anime/storyboard/episode-001-shots.yaml`
- `anime/audio/episode-001-timeline.yaml`
- `anime/jobs/episode-001-generation-jobs.json`
- `anime/assembly/episode-001-assembly.json`
- `anime/review/episode-001-qc.md`

**验收重点**：

- 每个镜头都能追溯到 beat、角色、动作、音频 cue 和 prompt refs。
- timeline 覆盖 storyboard 中所有 `shot_id`。
- generation jobs 全部 `provider: unassigned`，不含 `api_key`、`token`、`cookie`、`secret`。

## 示例二：Webtoon Motion + 本地化 + 人工审片

**用户输入**：把 8 格条漫改成 90 秒动态漫画视频，计划中英双语发布。

**选择**：

- profile: `webtoon-motion`
- overlays: `audio-lipsync`, `provider-jobs`, `localization-pack`, `human-review-gate`
- target: 9:16 或 4:5, 60-120 秒, 8-16 镜头/分格

**基础 phase 链**：

1. `phase-0-concept-promise`
2. `phase-1-panel-style-bible`
3. `phase-2-episode-beat-sheet`
4. `phase-3-dialogue-voice-script`
5. `phase-4-shot-storyboard`
6. `phase-5-visual-prompt-pack`
7. `phase-6-audio-timeline`
8. `phase-7-generation-job-specs`
9. `phase-8-assembly-qc`

**overlay 插入/强化结果**：

- `audio-lipsync` 要求 `phase-6-audio-timeline` 把对白、字幕、SFX、停顿和画面文字换行写进同一条时间轴。
- `provider-jobs` 要求 `phase-7-generation-job-specs` 输出补图、轻运动、TTS、字幕和合成 job specs。
- `localization-pack` 在 `phase-6-audio-timeline` 后插入可选 `phase-6b-localization-pack`，产出 `anime/localization/subtitle-map.yaml`。
- `human-review-gate` 在 `phase-8-assembly-qc` 后插入可选 `phase-9-human-release-review`，产出 `anime/review/human-release-checklist.md`。

**最终 phase 链**：

1. `phase-0-concept-promise`
2. `phase-1-panel-style-bible`
3. `phase-2-episode-beat-sheet`
4. `phase-3-dialogue-voice-script`
5. `phase-4-shot-storyboard`
6. `phase-5-visual-prompt-pack`
7. `phase-6-audio-timeline`
8. `phase-6b-localization-pack`（optional）
9. `phase-7-generation-job-specs`
10. `phase-8-assembly-qc`
11. `phase-9-human-release-review`（optional）

**验收重点**：

- `anime/storyboard/panel-to-shot-map.yaml` 能说明每个原始分格如何变成镜头。
- 字幕、本地化梗、画面文字替换不破坏角色声口和镜头节奏。
- 人工审片节点只决定是否发布，不替代前面的 timeline、job specs 和 assembly manifest。

## 示例三：角色 IP + 批量化短循环

**用户输入**：打造一个固定角色账号，每天一条 30-45 秒角色反应短内容。

**选择**：

- profile: `character-ip`
- overlays: `character-consistency`, `short-form-retention`, `provider-jobs`, `human-review-gate`

**关键变化**：

- `phase-1-character-ip-bible` 取代通用 cast bible，重点是外观、声口、口头禅和禁区。
- `phase-2-repeatable-bit-engine` 取代普通 beat sheet，重点是可复用梗结构。
- `phase-5-voice-loop-system` 取代普通 audio timeline，重点是固定节奏、TTS 风格和 SFX 模板。
- `phase-6-generation-job-specs` 输出批量 job specs，但仍然不真实调用 provider。

**验收重点**：

- 每集结构可重复但不机械。
- 角色一眼可识别，不能为追求单条效果破坏 IP 锚点。
- 批量任务中仍不得出现真实密钥或不可审计的本地私密路径。
