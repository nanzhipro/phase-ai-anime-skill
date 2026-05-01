# Phase 2 执行包

本文件不能单独使用。执行 Phase 2 时，必须同时携带完整的 `plan/common.md` 和 `plan/phases/phase-2-provider-adapter-contracts.md`。

## 必带上下文

- `plan/common.md`
- `plan/phases/phase-2-provider-adapter-contracts.md`

## 执行目标

- 在 `src` 中新增或扩展 provider adapter contract 类型与离线 validation helper。
- 增加 Jest 测试，验证 provider-neutral job specs 与 adapter contract 的安全边界。
- 增加 references 文档，解释未来如何接真实 provider，但本阶段不接。

## 本次允许改动

- `src/**`
- `tests/**`
- `references/**`
- `plan/**`

## 本次禁止改动

- 不得真实调用任何图像、视频、TTS、音乐、SFX 或剪辑 provider。
- 不得新增 API key、token、cookie、secret、私密路径样例。
- 不得引入运行时依赖或 provider SDK。
- 不得创建 `examples/**` smoke project。
- 不得运行会提交或推送的 git 命令。

## 交付检查

- `src` 中 adapter contract helper 可被 `src/index.ts` 导出。
- Jest 测试覆盖合法与非法 job contract。
- `references/provider-adapter-contracts.md` 说明 adapter slot、输入输出、禁写字段和真实调用确认门禁。
- `npm test` 通过。
- `npm run build` 通过。
- `npm run lint` 通过。
- `ruby scripts/planctl.rb advance --strict` 通过。

## 执行裁决规则

- 若实现需要真实 provider SDK，停止并改为纯接口或文档说明。
- 若测试需要网络或外部命令，改为离线 fixture。
- 若发现 job specs 与 workflow builder 类型不一致，优先修类型和测试，不扩大到 examples。
