# PROJECT_NAME Phase-AI-Anime 执行规约

> 本文件同时作为 Copilot、Claude Code、Codex / 通用 Agent 的会话级强制约束。三份文件必须保持字节一致。

当用户请求涉及 AI 漫剧 phase、制作计划、持续推进、恢复执行、分镜、prompt、音画时间轴、生成任务或合成收尾时，本规约生效。生效后，必须把 `plan/manifest.yaml` 视为执行契约，而不是参考文档。

## 一、解释优先级

1. 当前应执行哪个 phase，以 `plan/manifest.yaml`、`plan/state.yaml` 和 `scripts/planctl` 的结果为准。
2. 全局制作约束，以 `plan/common.md` 为准。
3. 当前 phase 的实施边界，以对应 `plan/execution/*.md` 为准。
4. 当前 phase 的目标与范围，以对应 `plan/phases/*.md` 为准。
5. 压缩恢复，以 `plan/handoff.md` 为准。
6. `plan/workflow.md` 仅用于说明。

## 二、开始前强制步骤

0. 在项目根执行 `git rev-parse --is-inside-work-tree`，必须返回 `true`，除非已显式设置 `PHASE_CONTRACT_ALLOW_NON_GIT=1` 且 `plan/common.md` 记录风险。
1. 读取 `plan/manifest.yaml`。
2. 若是连续推进，读取 `plan/handoff.md`，再运行 `ruby scripts/planctl advance --strict`。
3. 若用户指定 phase，运行 `ruby scripts/planctl resolve <phase-id> --format prompt --strict`。
4. 只按 resolver 输出的 `required_context` 顺序读取上下文。

## 三、执行边界

- 当前窗口只允许一个 active phase。
- 不得一次性加载全部 phase 文档。
- 不得把未来 phase 的目标、交付或实现提前混入当前 phase。
- 当前 phase 的 execution 白名单是硬边界。
- 真实调用外部模型前，必须确认 provider、鉴权方式、成本和输入素材边界。
- 不得把 API key、token、cookie、私密素材路径写进仓库。

## 四、完成与推进

只有当前 phase 真实完成后，才能运行：

```bash
ruby scripts/planctl complete <phase-id> --summary "<summary>" --next-focus "<next-focus>" --continue
```

真实完成至少意味着：

- execution 的交付检查全部满足。
- phase 的完成判定全部可客观勾选。
- 没有违反本次禁止项。
- 若产生临时模型输出或缓存，已经在 `.gitignore` 中处理，真实交付物没有被误忽略。

`ACTION: promote_placeholder` 不是用户确认点；先升级当前 phase 的两份合同，再重跑 `advance --strict`。

## 五、AI 漫剧专项要求

- 剧情、台词、分镜、prompt、音频和合成不得混成一个 phase。
- 每个镜头必须能追溯到 beat、角色、动作、音频 cue 和 prompt 入口。
- 每个 active phase 和创作节点若存在 AgentSpec / agent map，必须按对应 Agent 的 inputs、outputs、quality gates 和 handoff artifacts 执行。
- 音画同步必须落在 timeline 文件里，不得只写在自然语言说明中。
- generation job specs 必须 provider-neutral；具体 adapter 是可替换节点。
- 角色一致性和风格一致性优先于单镜头“惊艳”。
- 发布、打 tag、归档、对外公开、商用素材授权由人类决定。

## 六、Finalization

当 `advance --strict` 或 `complete --continue` 输出 `ACTION: finalize` 时，必须运行：

```bash
ruby scripts/planctl finalize
```

拿到 dashboard 后，必须人工化解读风险与下一步，不得直接替用户上线、发版、打 tag、归档 `plan/` 或发布视频。

## 七、独立 Agent 裁剪规则

- PhaseAgent 负责 phase 目标、execution 边界、allowed paths、完成判定和 handoff，不直接做真实 provider 调用。
- NodeAgent 负责单个创作节点的输入输出、质量门禁和下游交接；插入或删除节点前必须检查 AgentSpec 是否同步。
- AdapterAgent 只消费已验证的 provider-neutral job specs；真实调用前必须确认 provider、鉴权、成本、素材边界和输出用途。
- 一个 phase 可以包含多个 NodeAgent；不要把 phase 与 workflow node 简单等同。
