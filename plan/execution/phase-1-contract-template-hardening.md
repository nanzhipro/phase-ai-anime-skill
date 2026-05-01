# Phase 1 执行包

本文件不能单独使用。执行 Phase 1 时，必须同时携带完整的 `plan/common.md` 和 `plan/phases/phase-1-contract-template-hardening.md`。

## 必带上下文

- `plan/common.md`
- `plan/phases/phase-1-contract-template-hardening.md`

## 执行目标

- 硬化 AI 漫剧生成项目的 manifest、common、phase、execution、workflow 和 handoff 模板。
- 让 profile/overlay 示例能帮助新手理解“按制作链路拆 phase”和“节点可插拔”。
- 对入口文档做必要同步，但不把 README 改成冗长手册。

## 本次允许改动

- `references/**`
- `profiles/**`
- `SKILL.md`
- `README.md`
- `README_en.md`
- `plan/**`

## 本次禁止改动

- 不得改动 `src/**` 或 `tests/**`，除非发现模板文档必须引用已经存在的 API 名称并需要极小同步；若发生，先重新评估是否应留给 phase-2。
- 不得新增真实 provider adapter、真实 API 调用、密钥字段或本地私密素材路径。
- 不得创建完整 examples smoke project。
- 不得运行会提交或推送的 git 命令。

## 交付检查

- `references/templates.md`、`references/phase-templates.md`、`references/workflow-template.md` 均能独立指导生成项目合同。
- `profiles/examples.md` 至少有两个 profile + overlay 展开示例。
- `SKILL.md`、`README.md`、`README_en.md` 与模板中的 phase/overlay 名称一致。
- 旧小说术语扫描完成；仅允许保留迁移说明或 Ruby 兼容测试中的 legacy fixture。
- `ruby scripts/planctl.rb advance --strict` 通过，并指向本 phase 的 `ACTION: implement` 或后续 phase。

## 执行裁决规则

- 若发现需要新增 TypeScript adapter API，停止该改动并记录到 phase-2。
- 若模板要求真实模型调用，改成 provider-neutral job spec 或人工确认门禁。
- 若文档变得过长，把细节放进 `references/**`，README 只保留入口和链接。
