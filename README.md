# phase-ai-anime-skill

**简介**：一套面向 AI 漫剧、AI 动漫短剧和动态漫画视频的制作工作流 Skill。当前默认链路先聚焦 15 秒单视频 MVP：先把点子写成可拍的编剧本，再沉淀角色/世界/场景 prompts 和 manifests，再做生图，最后做视频生成，让整条链路能先跑通再扩展成长视频。

> _"先让故事、镜头和声音落盘，再让模型去生成。"_

[![install](https://img.shields.io/badge/install-npx%20skills%20add-informational?logo=npm)](https://www.npmjs.com/package/skills)
[![Copilot](https://img.shields.io/badge/GitHub%20Copilot-supported-24292e?logo=github)](./references/agent-instructions-template.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-d97757)](./references/agent-instructions-template.md)
[![Codex](https://img.shields.io/badge/Codex-supported-10a37f)](./references/agent-instructions-template.md)

[English](./README_en.md) · **中文**

## 这个 Skill 解决什么

AI 漫剧最容易崩的不是某一个 prompt，而是跨步骤失控：剧本和镜头脱节、角色提示词丢失、上一步生成结果无法衔接下一步、不同模型的输入输出记录不完整。这个项目把这些关键状态外部化为文件，再用 `planctl` 保证 phase 顺序、确认点和恢复协议。

MVP 先不强绑真实 provider，而是输出一套围绕 15 秒单视频的生产蓝图：

- 15 秒单视频的 design brief、shootable screenplay 和 script manifest。
- 角色、世界观、场景三类 prompts，以及负责衔接的 prompt manifest。
- provider-neutral 的 image jobs、image manifest 和图像资产目录。
- provider-neutral 的 video job、video manifest 和最终交付视频路径。
- 一层显式的 generation capability 架构，把文生图、视频生成、TTS、SFX、音乐拆成独立 Agent 能力，再通过 manifest 协作。
- Phase/Node/Adapter agent 合同，让每个阶段、创作节点和模型接入点都能独立交接。
- 每个阶段默认都停下来给用户确认，再继续消耗上一步 manifest。
- adapter 合同保持 provider-neutral，但默认推荐先接火山生图模型和火山引擎 Seedance 视频模型。

## 推荐场景

- **15 秒竖屏 AI 漫剧 MVP**：先跑通单视频、单任务、阶段确认和 manifest 衔接。
- **横屏 pilot / 番剧样片**：更重视镜头语言、情绪铺垫和视听连续性。
- **动态漫画 / webtoon-motion**：从条漫分格转成镜头、推拉摇移、字幕和配音。
- **角色 IP 短内容**：先稳角色声口、表情、口头禅和视觉锚点，再批量生成。
- **多模型工作流**：同一个项目里可替换生图和视频节点，先把单视频闭环跑通，再扩到音频和长链路。

## 快速开始

在 Agent 里直接说：

```text
用 phase-ai-anime-skill 从 0 到 1 做一条 15 秒竖屏 AI 漫剧：<你的点子>
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

如果要真实调用 Volcengine 图片或 Seedance 视频 provider，先在仓库根目录把 `.env.example` 复制成 `.env`，配置 `ARK_API_KEY`，再执行：

```bash
cp .env.example .env
npm run check:env
```

`ARK_API_KEY` 是必要条件；如果缺失、仍是占位值，或真实调用时认证失败，流程无法运行。`.env` 只允许本地保留，不允许提交到 GitHub。详细说明见 [references/runtime-env.md](./references/runtime-env.md)。

TypeScript MVP 可以直接生成离线蓝图：

```ts
import { buildAnimeDramaWorkflow } from 'phase-ai-anime-skill';

const workflow = buildAnimeDramaWorkflow({
  title: '雨夜便利店的猫耳侦探',
  premise: '一个怕水的猫耳侦探必须在暴雨夜找回会说话的失踪耳机。',
  targetPlatform: 'vertical-short',
  episodeDurationSeconds: 15,
});
```

如果 `animeSkillHandler` 的 query 以 `reset phase:`、`重置 phase:` 或类似“从 0 开始”指令开头，它会把这次请求标记为从 phase-0 重启，并在 `phaseFlow` / `nextSteps` 中返回对应的 reset 指引。

蓝图的默认下一步是：先确认 screenplay package，再确认 prompt package，再确认 image manifest，最后再跑 video generation。整条链路默认只处理一个 15 秒视频。

## 工作流主链路

| Phase | 产出 | 说明 |
| --- | --- | --- |
| 0. Screenplay Design | design brief、screenplay、script manifest | 把点子变成可拍的 15 秒编剧本 |
| 1. Prompt Package | character/world/scene prompts、prompt manifest | 为下游模型准备分类提示词和桥接数据 |
| 2. Image Generation | image jobs、image manifest、图片资产 | 基于 prompt package 产出可确认的图片基础素材 |
| 3. Video Generation | video job、video manifest、最终 mp4、delivery review | 用已确认图片生成单条 15 秒视频成果物 |

## 节点可插拔

`workflow.nodes` 每个节点都有 `inputs`、`outputs`、`requiredArtifacts`、`replaceableBy` 和 tracking manifest。你可以插入真人审片、替换生图/视频 provider，或增加本地工作站节点，只要输入输出契约和 manifest 衔接不破坏，下游 phase 就能继续。

`workflow.agents` 把这条链路拆成三类独立 Agent：Phase Agent 负责阶段合同、确认点和 handoff，Node Agent 负责创作节点的输入输出与 manifest 更新，Adapter Agent 负责人工确认后的 provider 接入。插入新节点时必须同步声明对应 Node Agent。

现在生成链还多了一层显式 capability：`text-to-image-capability`、`video-generation-capability`、`tts-generation-capability`、`sfx-generation-capability` 和 `music-generation-capability`。这些能力既能独立工作，也能通过 image/audio/video manifest 协作；provider adapter 只是挂在 capability 下面的可替换执行边，不再等于整个能力本身。

## 文档索引

- [SKILL.md](./SKILL.md) — Skill 触发、流程和质量门禁
- [references/methodology.md](./references/methodology.md) — AI 漫剧方法论
- [references/glossary.md](./references/glossary.md) — 术语表
- [references/templates.md](./references/templates.md) — plan 模板
- [references/phase-templates.md](./references/phase-templates.md) — phase/execution 合同模板
- [references/provider-adapter-contracts.md](./references/provider-adapter-contracts.md) — provider/adapter 与 Adapter Agent 合同
- [references/generation-capability-architecture.md](./references/generation-capability-architecture.md) — 文生图、视频、TTS、SFX、音乐 capability 分层与协作架构
- [references/runtime-env.md](./references/runtime-env.md) — `.env`、`ARK_API_KEY` 与运行前检查
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
