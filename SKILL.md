---
name: phase-ai-anime-skill
description: "Set up a disk-backed Phase-AI-Anime workflow for AI anime drama and manga-motion video projects. Use when the user wants to create, plan, continue, reset, or revise AI 漫剧, AI 动漫短剧, webtoon-to-video, anime short drama, storyboard-to-video, image/video/TTS generation pipelines, shot lists, dialogue scripts, asset prompts, audio-video timelines, or final assembly manifests across many sessions. Triggers: 'AI 漫剧', 'AI 动漫视频', '动漫短剧', '漫剧工作流', '分镜脚本', '音画同步', '生图到视频', 'AI drama pipeline', 'anime video workflow', 'storyboard to video', 'image to video', 'TTS timeline', 'phase-ai-anime', 'reset phase', '重置 phase', '从 0 开始'. Scaffolds plan/manifest.yaml, plan/common.md, phase and execution contracts, planctl, profiles, generation job specs, and synchronized agent instruction files so production state survives context compression across Copilot, Claude Code, and Codex."
argument-hint: "(optional) target project path, one-line anime drama premise, target platform, episode duration"
---

# Phase-AI-Anime Skill（AI 漫剧长线制作工作流脚手架）

把 AI 漫剧从“灵感 prompt”变成一条可续跑、可审计、可替换模型节点的制作合同链：剧情承诺、角色风格、台词、镜头、分镜、素材 prompt、音频 cue、视频生成任务、合成清单和质检都落盘，而不是留在聊天记忆里。

完整方法论见 [references/methodology.md](./references/methodology.md)。术语表见 [references/glossary.md](./references/glossary.md)。

## When to Use

**适用**：

- 从 0 到 1 做一条 AI 漫剧、AI 动漫短剧、动态漫画、webtoon-motion 或角色 IP 短片。
- 已有故事点子，但不知道如何拆成剧作、台词、分镜、prompt、音频、视频和合成步骤。
- 想让 AI 生成可交给生图、图生视频、TTS、音乐/SFX、剪辑工具的稳定任务规格。
- 需要多集连载、角色一致性、风格一致性、音画同步和跨会话续跑。
- 想保留在流程中插入、删除、替换工作流节点的能力，而不是被固定模板锁死。
- 用户明确要求把当前 phase 流程“reset phase”或“从 0 开始”，需要清空 ledger 后重新从 phase-0 启动。

**不要用**：

- 只要一张图、一个单镜头 prompt 或一次性短文案。
- 尚未能说清主角、目标、冲突、受众和成片形式的纯探索闲聊。
- 已经决定要直接进某个具体商用工具的封闭流程，且不需要外部状态管理。

## MVP 目标

本 Skill 的 MVP 不直接调用外部模型，也不要求用户准备 API key。它先生成一套离线可运行的生产蓝图：

- 剧情承诺和目标受众。
- 角色/场景/风格 bible。
- 单集 beat sheet、台词稿和镜头清单。
- 镜头级 image prompt、video prompt、negative prompt、参考图占位和 seed 策略。
- TTS、SFX、音乐和字幕 cue 的统一时间轴。
- provider-agnostic generation job specs，后续可替换为 OpenAI、Gemini/Veo、Runway、Luma、Kling、Pika、ElevenLabs、本地 ComfyUI/AnimateDiff/FFmpeg 等适配器。
- Phase/Node/Adapter agent 合同，保证每个 phase、创作节点和 provider 接入点都能独立交接。
- final assembly manifest，供人工或工具链合成最终 AI 动漫视频。

## Core Principles

| #   | 原则           | 落地动作                                                                   |
| --- | -------------- | -------------------------------------------------------------------------- |
| P1  | 状态外部化     | 角色、风格、镜头、音频、生成任务和质检结论都写入项目文件                   |
| P2  | 小颗粒 phase   | 每个 phase 只解决一个制作层级，避免剧情、画面、音频、剪辑混写              |
| P3  | 音画同轴       | 每个镜头必须有时间码、画面动作、台词/音效/音乐 cue 和字幕关系              |
| P4  | 角色与风格锚定 | 角色外观、服装、表情、镜头语言和色彩风格先成 bible，再下游生成             |
| P5  | 模型无关       | Skill 产出稳定 job specs，不把工作流绑死到某一家模型                       |
| P6  | 节点可插拔     | workflow nodes 可以 insert/delete/replace，但必须保留输入输出契约          |
| P7  | 先预演再生成   | 先出文字 animatic 和任务清单，再决定是否真实调用模型                       |
| P8  | 完成可验证     | 完成判定写成文件存在、字段完整、镜头数量、时间轴覆盖等客观检查             |
| P9  | 显式收尾       | 全 phase 完成后必须 `finalize`，再由人类决定发布、打 tag、归档或进入下一轮 |

## Procedure

### Step 0: 前置检查

1. 在目标项目根目录执行 `git rev-parse --is-inside-work-tree`，必须返回 `true`。
2. 本地需要 Ruby 2.6+，用于运行 `scripts/planctl`。
3. 若不是 git 工作区，停止，不生成文件。先让用户建立 baseline。

### Step 1: 收集输入

若用户未指定，使用 ask-questions 收集，不要猜：

1. **项目根目录路径**。
2. **一句话剧集承诺**：主角 + 目标 + 冲突 + 反差/危险。
3. **目标平台与画幅**：竖屏短剧、横屏番剧、B 站/YouTube、抖音/快手/小红书、内部样片等。
4. **单集时长与集数目标**：例如 45-90 秒 MVP、3 分钟 pilot、12 集连载。
5. **基础 profile**：`vertical-short`、`episodic-cinematic`、`webtoon-motion`、`character-ip`、`custom`。
6. **可选 overlays**：`short-form-retention`、`character-consistency`、`audio-lipsync`、`provider-jobs`、`localization-pack`、`human-review-gate`。
7. **视觉方向**：二次元、国漫、赛博、治愈、悬疑、儿童向、品牌向等；若用户不确定，先生成 2-3 个候选风格，不直接锁死。
8. **模型调用深度**：MVP 默认只导出 job specs；只有用户确认 provider 和鉴权后才真实调用模型。
9. **硬约束**：受众年龄、内容边界、禁用题材、版权/肖像/商标限制、角色一致性要求、发布语言。

### Step 1.5: 从 profile 派生 phase 图

基础 profile 决定主生产链路，overlay 只做局部插入或强化。默认按“制作层次/链路”切分：

1. `phase-0-concept-promise`：锁定剧集承诺、受众、画幅、时长和非目标。
2. `phase-1-cast-style-bible`：角色、场景、风格、镜头语言和一致性锚点。
3. `phase-2-episode-beat-sheet`：单集 beat、冲突升级、钩子和结尾牵引。
4. `phase-3-dialogue-voice-script`：台词、旁白、潜台词、字幕口径和 TTS 方向。
5. `phase-4-shot-storyboard`：镜头清单、构图、动作、转场、镜头时长。
6. `phase-5-visual-prompt-pack`：生图、图生视频、参考图、seed 和 negative prompts。
7. `phase-6-audio-timeline`：配音、音效、音乐、停顿、字幕和口型/动作同步。
8. `phase-7-generation-job-specs`：image/video/audio provider job specs 和可替换适配器入口。
9. `phase-8-assembly-qc`：最终合成 manifest、质检表、发布包和下一轮修订建议。

每个 phase 派生一个 Phase Agent；每个 workflow 创作节点派生一个 Node Agent；每个 provider adapter slot 派生一个 Adapter Agent。Agent 只扩展交接与验证语义，不绕过 phase-contract 和 provider-neutral 边界。

future phase 先生成成对占位合同；只有当前 phase 和准备立即执行的 phase 写正式合同。

### Step 2: 生成骨架文件

目标项目至少生成：

```text
<anime-project>/
├── .github/copilot-instructions.md
├── CLAUDE.md
├── AGENTS.md
├── plan/
│   ├── manifest.yaml
│   ├── common.md
│   ├── workflow.md
│   ├── state.yaml
│   ├── handoff.md
│   ├── phases/phase-0-*.md
│   └── execution/phase-0-*.md
├── scripts/planctl
└── anime/
    ├── bible/
    ├── scripts/
    ├── storyboard/
    ├── prompts/
    ├── audio/
    ├── agents/
    ├── jobs/
    ├── assembly/
    └── final/
```

### Step 3: 安装 planctl

把 [scripts/planctl.rb](./scripts/planctl.rb) 复制到目标项目 `scripts/planctl`，加可执行位，然后运行：

```bash
ruby scripts/planctl status
ruby scripts/planctl doctor
ruby scripts/planctl advance --strict
```

### Step 4: 使用 src MVP 生成生产蓝图

本仓库提供 TypeScript MVP，可在集成层调用：

```ts
import {
  animeSkillHandler,
  buildAnimeDramaWorkflow,
} from "phase-ai-anime-skill";

const blueprint = buildAnimeDramaWorkflow({
  title: "雨夜便利店的猫耳侦探",
  premise: "一个怕水的猫耳侦探必须在暴雨夜找回会说话的失踪耳机。",
  targetPlatform: "vertical-short",
  episodeDurationSeconds: 75,
});
```

`buildAnimeDramaWorkflow` 不调用外部模型，只返回 phase、node graph、artifact plan、provider job contract 和 sample timeline，方便先跑通 0 到 1。

蓝图同时包含 `agents`：Phase Agent 负责阶段合同与 handoff，Node Agent 负责创作节点输入输出，Adapter Agent 负责人工确认后的 provider 接入。

### Step 5: Golden Loop

```bash
ruby scripts/planctl advance --strict
ruby scripts/planctl complete <phase-id> --summary "<本轮完成内容>" --next-focus "<下一轮焦点>" --continue
ruby scripts/planctl finalize
```

如果用户明确说“reset phase”“重置 phase”或“从 0 开始”，先执行：

```bash
ruby scripts/planctl reset --summary "<重置原因>"
ruby scripts/planctl advance --strict
```

`reset` 只清 phase ledger、handoff 和 finalized 状态，不自动删除已经生成的分镜、prompt、素材或导出文件；phase-0 需要重新确认哪些制品保留、复用或重做。

`ACTION: promote_placeholder` 不是用户确认点，而是内部待办：先把当前 phase 的 plan/execution 升级成正式合同，再重跑 `advance --strict`。

## Quality Gates

- [ ] `manifest.yaml` 每个 phase 的 `required_context` 恰好三项。
- [ ] 当前 phase 的 execution 使用路径白名单。
- [ ] `phase-0` 至少落地受众、画幅、时长、剧集承诺、非目标和模型调用深度。
- [ ] 分镜 phase 每个镜头都有 `shot_id`、时长、构图、动作、台词/音频 cue、视觉 prompt 入口。
- [ ] 音频 phase 覆盖 TTS、SFX、音乐、字幕和 silence/pause。
- [ ] generation job specs 不包含真实密钥，不绑定单一 provider。
- [ ] 每个 phase、workflow node 和 adapter slot 都有对应 AgentSpec 或 agent map 条目。
- [ ] final assembly manifest 能从镜头、音频、字幕、视频片段路径重建成片结构。
- [ ] `.github/copilot-instructions.md`、`CLAUDE.md`、`AGENTS.md` 三份字节一致。
- [ ] `src` 的 build/test 通过。

## References

- [AI 漫剧方法论](./references/methodology.md)
- [术语表](./references/glossary.md)
- [基础模板](./references/templates.md)
- [Phase 合同模板](./references/phase-templates.md)
- [执行流程模板](./references/workflow-template.md)
- [Agent 强制层模板](./references/agent-instructions-template.md)
- [Profiles 层](./profiles/README.md)
