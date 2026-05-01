# Phase 2: Provider Adapter Contracts

## 阶段定位

在不真实调用任何外部模型的前提下，把 phase-0 MVP 里的 provider-neutral job specs 固化成 TypeScript adapter contract。目标是让后续生图、图生视频、TTS、SFX、音乐和合成节点都有稳定输入输出接口，同时保持密钥和 provider 细节在仓库外部。

## 必带上下文

- `plan/common.md`
- `phase-0-research-mvp-frame` 的完成事实：`src` 已能生成蓝图、timeline 和 provider-neutral jobs。
- `phase-1-contract-template-hardening` 的完成事实：模板已明确 provider-neutral job specs、节点插拔和真实调用确认边界。

## 阶段目标

- 在 `src` 中提供 adapter contract 类型、adapter registry 类型和离线 job validation helper。
- 将现有 `ProviderContract` / `GenerationJobSpec` 与 adapter contract 对齐，避免真实 provider 代码混入核心 workflow。
- 增加测试覆盖：合法 job 通过，含密钥字段或错误 adapter slot 的 job 被拒绝。
- 在 `references/**` 中记录 adapter contract 的设计边界、字段约定和未来接入步骤。
- 保持所有 adapter 输出 provider-neutral，不写入 API key、token、cookie、私密路径。

## 实施范围

- `src/**`
- `tests/**`
- `references/**`
- `plan/**`

## 本阶段产出

- TypeScript provider adapter contract 定义。
- Offline adapter validation helper。
- 单元测试。
- Adapter contract 参考文档。
- 当前 phase 的 handoff 和 state 更新。

## 明确不做

- 不真实调用 OpenAI、Gemini/Veo、Runway、Luma、Kling、Pika、ElevenLabs、ComfyUI、FFmpeg 或任何外部命令/API。
- 不读取、写入或提示用户提供 API key、token、cookie。
- 不实现 provider-specific adapter。
- 不创建完整 example project；这属于 phase-3。

## 完成判定

- `src` 导出 adapter contract 相关类型或 helper。
- helper 能验证 `GenerationJobSpec` 与 `ProviderContract` 的 adapter slot、kind、必填字段和禁写字段。
- 测试覆盖 provider-neutral job、secret-like 字段拒绝、adapter slot mismatch。
- `references/provider-adapter-contracts.md` 存在，并说明真实 provider 调用必须等用户确认 provider、鉴权、成本和素材边界。
- `npm test`、`npm run build`、`npm run lint` 通过。
- `ruby scripts/planctl.rb advance --strict` 返回下一步可继续执行，且不再把本 phase 识别为 placeholder。

## 依赖关系

- `phase-1-contract-template-hardening`
