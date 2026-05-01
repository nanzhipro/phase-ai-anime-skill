# Phase 4 执行包

本文件不能单独使用。执行 Phase 4 时，必须同时携带完整的 `plan/common.md` 和 `plan/phases/phase-4-final-quality-gates.md`。

## 必带上下文

- `plan/common.md`
- `plan/phases/phase-4-final-quality-gates.md`

## 执行目标

- 做最终术语扫描和必要清理。
- 跑完整测试/构建/lint/doctor/advance/finalize 链路。
- 记录仍保留的 legacy 术语位置和理由。

## 本次允许改动

- `**/*`

## 本次禁止改动

- 不得调用真实外部模型或 provider。
- 不得写入 API key、token、cookie、secret 或私密素材路径。
- 不得自动 git commit/push/tag。
- 不得发布、归档或公开成片。

## 交付检查

- 旧术语扫描完成。
- 所有 Node/Ruby 测试与 planctl doctor 通过。
- Agent 指令三份字节一致。
- 忽略规则确认 `node_modules/` 和 `dist/` 未进入待提交变更。
- 完成 phase 后运行 `finalize` 并获取 dashboard。

## 执行裁决规则

- 若发现真实 provider 调用需求，停止并标注为未来任务。
- 若发现测试失败，先修本次引入或本仓库相关问题，不修无关外部环境。
- 若 finalize 给出发布、打 tag、归档建议，只转述为人类下一步，不替用户执行。
