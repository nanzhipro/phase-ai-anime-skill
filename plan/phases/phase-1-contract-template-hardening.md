# Phase 1: Contract Template Hardening

## 阶段定位

把 phase-0 的 AI 漫剧 MVP 进一步固化成可复用、可生成项目、可被新手理解的合同模板层。重点不是新增 provider 代码，而是让 `references/**`、`profiles/**` 和入口文档中的生成项目规则更稳定、更客观、更少旧小说残留。

## 必带上下文

- `plan/common.md`
- `plan/phases/phase-0-research-mvp-frame.md` 的完成事实：核心 AI 漫剧文档、profiles、TypeScript MVP、plan 轨道和测试已经落地。

## 阶段目标

- `references/templates.md` 的 manifest/common/state/handoff 模板能覆盖 AI 漫剧项目的时长、镜头、音画时间轴、生成任务、合成和 QA 路径。
- `references/phase-templates.md` 的定位合同与执行合同模板包含音画同步、provider-neutral job specs、节点插拔和真实模型调用确认规则。
- `references/workflow-template.md` 清楚说明 placeholder promotion、Golden Loop、节点增删和 finalize 后的人类决策边界。
- `profiles/examples.md` 提供至少两个从 profile + overlays 派生 phase 图的例子，且不要求真实模型调用。
- `SKILL.md`、`README.md`、`README_en.md` 的使用说明与模板规则保持一致，不过度堆叠实现细节。
- 搜索并处理不必要的旧小说术语；如果旧术语只作为“迁移来源”或 Ruby 兼容测试存在，必须在最终说明里标注。

## 实施范围

- `references/**`
- `profiles/**`
- `SKILL.md`
- `README.md`
- `README_en.md`
- `plan/**`

## 本阶段产出

- 更完整的 AI 漫剧生成项目模板。
- 更客观的 phase/execution 合同模板。
- 更清晰的 profile/overlay 展开示例。
- 与模板一致的入口文档说明。
- 当前 phase 的 handoff 和 state 更新。

## 明确不做

- 不新增真实 provider adapter 代码；adapter 接口属于 phase-2。
- 不创建 examples 目录下的完整 smoke project；样例项目属于 phase-3。
- 不运行真实图像、视频、TTS、音乐或剪辑模型。
- 不提交、推送、打 tag、发布或归档。

## 完成判定

- `references/templates.md` 包含 AI 漫剧项目 manifest 模板，并明确 `target_runtime_seconds`、`target_shots`、`delivery_paths`、音画 timeline、job specs 与 assembly 路径。
- `references/phase-templates.md` 至少给出一个可复制的 objective artifact check 示例，覆盖 storyboard、audio timeline 和 generation jobs。
- `references/workflow-template.md` 明确节点新增/删除前必须更新合同并验证下游依赖。
- `profiles/examples.md` 至少包含两个 profile + overlay 展开示例，且列出 phase 增删结果。
- `SKILL.md` 与 README 中的 phase 名称、overlay 名称、MVP 边界不互相矛盾。
- `ruby scripts/planctl.rb advance --strict` 返回下一步可继续执行，且不再把本 phase 识别为 placeholder。

## 依赖关系

- `phase-0-research-mvp-frame`
