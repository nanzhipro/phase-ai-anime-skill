# Phase 3 执行包

本文件不能单独使用。执行 Phase 3 时，必须同时携带完整的 `plan/common.md` 和 `plan/phases/phase-3-example-project-smoke-run.md`。

## 必带上下文

- `plan/common.md`
- `plan/phases/phase-3-example-project-smoke-run.md`

## 执行目标

- 新增一个小型离线示例项目，展示 AI 漫剧 MVP 制品链路。
- 新增 smoke test，验证示例的追溯关系和 secret-free 约束。
- 在 README 中加示例入口链接。

## 本次允许改动

- `examples/**`
- `README.md`
- `README_en.md`
- `tests/**`
- `plan/**`

## 本次禁止改动

- 不得真实生成或提交图片、视频、音频素材。
- 不得接入 provider SDK 或真实 API 调用。
- 不得写入真实 API key、token、cookie、secret 或本机私密路径。
- 不得改动 `src/**`；若示例暴露 API 缺口，记录到后续计划而不是在本 phase 扩大范围。
- 不得运行会提交或推送的 git 命令。

## 交付检查

- 示例项目关键文件存在。
- `ruby tests/example_smoke_test.rb` 通过。
- README / README_en 包含示例链接。
- `ruby scripts/planctl.rb advance --strict` 通过。

## 执行裁决规则

- 若 smoke test 需要解析复杂 YAML/JSON，优先用 Ruby 标准库 `yaml`/`json`，不引入依赖。
- 若示例需要真实素材路径，一律改为相对占位路径。
- 若发现模板和示例冲突，优先修示例或 references，不改 TypeScript API。
