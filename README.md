# phase-ai-anime-skill

**简介**：一套面向 AI 漫剧、AI 动漫短剧和动态漫画视频的长线制作工作流 Skill。它把剧作、台词、分镜、生图、图生视频、TTS、音效、音乐、字幕和最终合成拆成可续跑的 phase，让小白也能从 0 到 1 搭起稳定的 AI 漫剧生产线。

> _"先让故事、镜头和声音落盘，再让模型去生成。"_

[![install](https://img.shields.io/badge/install-npx%20skills%20add-informational?logo=npm)](https://www.npmjs.com/package/skills)
[![Copilot](https://img.shields.io/badge/GitHub%20Copilot-supported-24292e?logo=github)](./references/agent-instructions-template.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-d97757)](./references/agent-instructions-template.md)
[![Codex](https://img.shields.io/badge/Codex-supported-10a37f)](./references/agent-instructions-template.md)

[English](./README_en.md) · **中文**

## 这个 Skill 解决什么

AI 漫剧最容易崩的不是某一个 prompt，而是跨步骤失控：角色变脸、风格漂移、镜头不连续、台词和口型对不上、音效和动作错拍、不同模型输出不能合成。这个项目把制作状态外部化为文件，再用 `planctl` 保证 phase 顺序和恢复协议。

MVP 先不真实调用模型，而是输出一套可以交给任何 provider 的生产蓝图：

- 剧集承诺、目标受众、画幅、时长和非目标。
- 角色/场景/风格 bible，保护角色和画风一致性。
- 单集 beat sheet、台词稿、字幕策略和 TTS 方向。
- 镜头级 storyboard、image prompt、video prompt、negative prompt、参考图占位。
- 音画统一时间轴：镜头、动作、台词、SFX、音乐、字幕都在同一条 timeline 上。
- Phase/Node/Adapter agent 合同，让每个阶段、创作节点和模型接入点都能独立交接。
- provider-agnostic generation job specs，后续可接 OpenAI、Gemini/Veo、Runway、Luma、Kling、Pika、ElevenLabs、本地 ComfyUI/FFmpeg 等。
- final assembly manifest，用于剪辑、质检和发布包整理。

## 推荐场景

- **竖屏 AI 漫剧**：45-90 秒一集，前三秒强钩子，尾部留牵引。
- **横屏 pilot / 番剧样片**：更重视镜头语言、情绪铺垫和视听连续性。
- **动态漫画 / webtoon-motion**：从条漫分格转成镜头、推拉摇移、字幕和配音。
- **角色 IP 短内容**：先稳角色声口、表情、口头禅和视觉锚点，再批量生成。
- **多模型工作流**：同一个项目里可替换生图、视频、TTS、SFX、音乐和剪辑节点。

## 快速开始

在 Agent 里直接说：

```text
用 phase-ai-anime-skill 从 0 到 1 做一条 60 秒竖屏 AI 漫剧：<你的点子>
```

如果目标项目已经生成 plan，日常推进使用：

```bash
ruby scripts/planctl advance --strict
ruby scripts/planctl complete <phase-id> --summary "..." --next-focus "..." --continue
ruby scripts/planctl finalize
```

如果用户明确说“reset phase”“重置 phase”或“从 0 开始”，先执行：

```bash
ruby scripts/planctl reset --summary "从 phase-0 重新开始"
ruby scripts/planctl advance --strict
```

`reset` 只会清空 phase ledger、handoff 和 finalized 状态，不会删除已经生成的素材文件；这些文件需要在 phase-0 里人工复核、复用或重做。

TypeScript MVP 可以直接生成离线蓝图：

```ts
import { buildAnimeDramaWorkflow } from 'phase-ai-anime-skill';

const workflow = buildAnimeDramaWorkflow({
  title: '雨夜便利店的猫耳侦探',
  premise: '一个怕水的猫耳侦探必须在暴雨夜找回会说话的失踪耳机。',
  targetPlatform: 'vertical-short',
  episodeDurationSeconds: 75,
});
```

如果 `animeSkillHandler` 的 query 以 `reset phase:`、`重置 phase:` 或类似“从 0 开始”指令开头，它会把这次请求标记为从 phase-0 重启，并在 `phaseFlow` / `nextSteps` 中返回对应的 reset 指引。

## 工作流主链路

| Phase | 产出 | 说明 |
| --- | --- | --- |
| 0. Concept Promise | 剧集承诺、受众、画幅、时长、边界 | 先决定观众为什么看 |
| 1. Cast Style Bible | 角色、场景、风格、镜头语言 | 保护一致性 |
| 2. Episode Beat Sheet | 单集结构、冲突升级、钩子 | 控制传播与留存 |
| 3. Dialogue Voice Script | 台词、旁白、字幕、TTS 方向 | 让角色会说话 |
| 4. Shot Storyboard | 镜头清单、构图、动作、转场 | 让模型有可执行画面 |
| 5. Visual Prompt Pack | 生图/视频 prompt、seed、参考图 | 给模型调用入口 |
| 6. Audio Timeline | TTS、SFX、音乐、字幕、停顿 | 音画同步 |
| 7. Generation Job Specs | provider-neutral jobs | 后续接任意模型 |
| 8. Assembly QC | 合成 manifest、质检、发布包 | 形成最终视频结构 |

## 节点可插拔

`workflow.nodes` 每个节点都有 `inputs`、`outputs`、`requiredArtifacts` 和 `replaceableBy`。你可以插入真人审片、替换 TTS provider、删除音乐节点或增加本地 ComfyUI 节点，只要输入输出契约不破坏，下游 phase 就能继续。

`workflow.agents` 把这条链路拆成三类独立 Agent：Phase Agent 负责阶段合同与 handoff，Node Agent 负责创作节点的输入输出和质量门禁，Adapter Agent 负责人工确认后的 provider 接入。插入新节点时必须同步声明对应 Node Agent。

## 文档索引

- [SKILL.md](./SKILL.md) — Skill 触发、流程和质量门禁
- [references/methodology.md](./references/methodology.md) — AI 漫剧方法论
- [references/glossary.md](./references/glossary.md) — 术语表
- [references/templates.md](./references/templates.md) — plan 模板
- [references/phase-templates.md](./references/phase-templates.md) — phase/execution 合同模板
- [references/provider-adapter-contracts.md](./references/provider-adapter-contracts.md) — provider/adapter 与 Adapter Agent 合同
- [references/workflow-template.md](./references/workflow-template.md) — 生成项目的 workflow 说明
- [profiles/README.md](./profiles/README.md) — profile 层说明
- [profiles/examples.md](./profiles/examples.md) — profile + overlay 展开示例
- [profiles/overlays.yaml](./profiles/overlays.yaml) — 可插拔 overlay
- [examples/rainy-convenience-store](./examples/rainy-convenience-store) — 完整离线 60 秒竖屏样片包

## 安装

```bash
npx skills add nanzhipro/phase-ai-anime-skill
npx skills update phase-ai-anime-skill -g
```

## 开发

```bash
npm run build
npm test
npm run lint
```

## 许可证

本仓库继承上层 Agent Skill 库的许可证；`scripts/planctl.rb` 无外部依赖，可复制到生成项目中使用。
