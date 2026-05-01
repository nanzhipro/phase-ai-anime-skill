# Phase 0 执行包

本文件不能单独使用。执行 Phase 0 时，必须同时携带完整的 `plan/common.md` 和 `plan/phases/phase-0-research-mvp-frame.md`。

## 必带上下文

- `plan/common.md`
- `plan/phases/phase-0-research-mvp-frame.md`

## 执行目标

- 完成 AI 漫剧 Skill 的核心文档、方法论、profiles 和 TypeScript MVP。
- 验证调度器、TypeScript build/test/lint 和三份 agent 指令一致性。

## 本次允许改动

- `SKILL.md`
- `README.md`
- `README_en.md`
- `CHANGELOG.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.github/**`
- `references/**`
- `profiles/**`
- `src/**`
- `tests/**`
- `scripts/planctl.rb`
- `plan/**`

## 本次禁止改动

- 不得写入真实 provider 密钥、token、cookie 或私密素材路径。
- 不得真实调用外部图像、视频、TTS、音乐或剪辑模型。
- 不得提前实现 future phase 的样例项目或 adapter 代码。
- 不得运行会提交或推送的 git 收尾命令，除非用户明确要求。

## 交付检查

- `npm test` 通过。
- `npm run build` 通过。
- `npm run lint` 通过。
- `ruby scripts/planctl.rb doctor` 通过。
- `ruby scripts/planctl.rb advance --strict` 返回 `ACTION: implement` 且 phase 为 `phase-0-research-mvp-frame`。
- `.github/copilot-instructions.md`、`CLAUDE.md`、`AGENTS.md` 字节一致。

## 执行裁决规则

- 若真实模型调用变成必要步骤，立即停止并向用户确认 provider、鉴权、成本和素材边界。
- 若测试失败，先修当前 phase 涉及的文件，不跳到 future phase。
- 若出现与当前白名单无关的脏文件，不回退也不改动，只在最终说明里提示。
