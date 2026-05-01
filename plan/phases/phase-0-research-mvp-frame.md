# Phase 0: Research and MVP Frame

## 阶段定位

把本仓库从长篇小说工作流 Skill 改造成 AI 漫剧制作 Skill 的核心 MVP：文档定位、方法论、profile 层、TypeScript 工作流编排器、基础测试和当前 plan 轨道。

## 必带上下文

- `plan/common.md`

## 阶段目标

- 公开入口文档改为 AI 漫剧工作流，清楚说明 MVP 不真实调用模型。
- references 层提供 AI 漫剧方法论、术语、模板、phase 合同和 workflow 模板。
- profiles 层提供至少三个 AI 漫剧制作 profile，并支持 overlay 插入/强化节点。
- `src` 提供可运行的离线工作流构建器，输出 phase、节点、制品、时间轴和 provider-neutral job specs。
- 测试覆盖 handler、蓝图构建、provider-neutral 约束和节点插入/删除。
- 当前仓库有可被 `planctl` 解析的 `plan/manifest.yaml`、`plan/common.md`、`plan/handoff.md` 和本 phase 合同。

## 实施范围

- `SKILL.md`
- `README.md`
- `README_en.md`
- `CHANGELOG.md`
- `references/**`
- `profiles/**`
- `src/**`
- `tests/**`
- `scripts/planctl.rb`
- `.github/copilot-instructions.md`
- `CLAUDE.md`
- `AGENTS.md`
- `plan/**`

## 本阶段产出

- AI 漫剧 Skill 入口文档。
- AI 漫剧方法论文档与模板。
- AI 漫剧 profile 与 overlay 目录。
- TypeScript MVP workflow builder。
- 当前仓库 phase-contract plan。

## 明确不做

- 不真实调用任何生图、视频、TTS、音乐或剪辑 provider。
- 不创建 release tag，不发布，不归档 plan。
- 不把所有 future phase 写成正式合同。
- 不承诺生成最终公开视频。

## 完成判定

- `SKILL.md` frontmatter name 为 `phase-ai-anime-skill`。
- `README.md` 和 `README_en.md` 均描述 AI 漫剧 MVP 与 TypeScript 使用方式。
- `references/methodology.md` 包含音画同步、角色一致性、provider-neutral job specs 和节点可插拔原则。
- `profiles/vertical-short/profile.yaml`、`profiles/episodic-cinematic/profile.yaml`、`profiles/webtoon-motion/profile.yaml`、`profiles/character-ip/profile.yaml` 存在。
- `src/workflow.ts` 导出 workflow builder、验证函数和节点插入/删除函数。
- `npm test`、`npm run build`、`npm run lint` 通过。
- `ruby scripts/planctl.rb doctor` 和 `ruby scripts/planctl.rb advance --strict` 通过。

## 依赖关系

- 无。
