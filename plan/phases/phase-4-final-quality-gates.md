# Phase 4: Final Quality Gates

## 阶段定位

对整个 AI 漫剧 Skill 改造做最终质量门禁：术语一致性、旧小说残留审查、测试矩阵、planctl 状态、示例完整性、release readiness 和 finalize 前风险说明。这个阶段不新增大功能，只做收口和必要的用户可见清理。

## 必带上下文

- `plan/common.md`
- 前四个 phase 的完成事实：核心 MVP、模板硬化、adapter contract、smoke example 均已落地并验证。

## 阶段目标

- 搜索旧小说/fiction/draft/chapter 术语，移除不必要的用户可见残留；保留的 legacy fixture 必须有明确理由。
- 将 `planctl` 面向 AI 漫剧的用户可见门禁文案从 draft/chapter 调整为 delivery/unit 语义，尽量保留旧 manifest 兼容能力。
- 跑全量验证：Jest、TypeScript build、ESLint、Ruby planctl tests、example smoke test、planctl doctor、advance。
- 检查 Agent 指令三份字节一致。
- 检查 `node_modules/`、`dist/` 等生成物仍被忽略。
- 完成 phase-4 后允许运行 `finalize`，但仍不得自动提交、推送、打 tag、发布或归档。

## 实施范围

- `**/*`

## 本阶段产出

- 术语清理和必要测试更新。
- 全量验证结果。
- 更新后的 `plan/state.yaml` / `plan/handoff.md`。
- `finalize` dashboard。

## 明确不做

- 不新增真实 provider adapter 或真实模型调用。
- 不发布、打 tag、归档、公开传播或商用授权。
- 不主动 git commit/push。
- 不重构无关模块。

## 完成判定

- 用户可见文档和当前模板不再把本 Skill 描述成小说工作流。
- 旧小说术语仅保留在迁移说明、方法论对比句、legacy 兼容 warning 或测试 fixture 中。
- `npm test -- --runInBand`、`npm run build`、`npm run lint` 通过。
- `ruby tests/planctl_autonomous_test.rb` 和 `ruby tests/example_smoke_test.rb` 通过。
- `ruby scripts/planctl.rb doctor` 通过。
- `ruby scripts/planctl.rb advance --strict` 在完成本 phase 前返回 `ACTION: implement`，完成后返回 `ACTION: finalize`。
- `ruby scripts/planctl.rb finalize` 能输出 final dashboard；任何发布/归档/tag 建议只作为人类决策点。

## 依赖关系

- `phase-3-example-project-smoke-run`
