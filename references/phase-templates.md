# AI 漫剧 Phase 双层合同模板

每个 phase 需要两份文档：定位合同和执行合同。前者回答“做什么”，后者回答“这轮能碰什么”。

## 定位合同：`plan/phases/phase-X-<slug>.md`

```markdown
# Phase X: <标题>

## 阶段定位

<这个阶段在 AI 漫剧制作链路里解决什么问题，一句话>

## 必带上下文

- `plan/common.md`
- <前置 phase 的完成事实>

## 阶段目标

- <可验证目标 1>
- <可验证目标 2>
- <可验证目标 3>

## 实施范围

- <允许涉及的制作层，例如 anime/bible 或 anime/storyboard>

## 本阶段产出

- <具体文件 1>
- <具体文件 2>

## 明确不做

- <容易越界的事 1>
- <容易越界的事 2>

## 完成判定

- <客观检查 1>
- <客观检查 2>
- <客观检查 3>

## 依赖关系

- <依赖 phase>
```

完成判定要写成客观检查，不要写“更有网感”“更高级”“更像大师”。可以写：

- `anime/storyboard/episode-001-shots.yaml` 中每个镜头都有 `shot_id`、`duration_seconds`、`framing`、`action`、`audio_cues` 和 `prompt_refs`。
- `anime/audio/episode-001-timeline.yaml` 覆盖 storyboard 中全部 `shot_id`。
- `anime/jobs/episode-001-generation-jobs.json` 不包含 `api_key`、`secret`、`token` 字段。

## 可复制 Artifact Gate 示例

以下检查使用 `planctl` 已支持的通用类型，适合直接放进 manifest 某个 phase 的 `artifact_checks` 中：

```yaml
artifact_checks:
  - type: file_exists
    path: anime/storyboard/episode-001-shots.yaml
  - type: regex_count
    path: anime/storyboard/episode-001-shots.yaml
    pattern: '^\s*shot_id:'
    min: 8
  - type: regex_count
    path: anime/storyboard/episode-001-shots.yaml
    pattern: '^\s*audio_cues:'
    min: 8
  - type: file_exists
    path: anime/audio/episode-001-timeline.yaml
  - type: regex_count
    path: anime/audio/episode-001-timeline.yaml
    pattern: '^\s*shot_id:'
    min: 8
  - type: file_exists
    path: anime/jobs/episode-001-generation-jobs.json
  - type: no_placeholder_tokens
    path: anime/jobs/episode-001-generation-jobs.json
    tokens:
      - api_key
      - token
      - cookie
      - secret
```

这些 gate 不是为了证明成片好看，而是证明当前 phase 的基础制品存在、可追溯、没有占位符和密钥污染。更细的结构校验可以在后续 adapter 或 smoke project 阶段追加。

## Agent Implementation Pattern

每个正式 phase 都应该能派生一个 `PhaseAgent`，每个创作节点都应该能派生一个 `NodeAgent`。它们不是替代 phase/execution 合同，而是把合同变成可交给独立 Agent 接手的最小执行单元。

### PhaseAgent 字段

- `id`: `<phase-id>-agent`
- `role`: `phase`
- `ownerPhaseId`: 对应 phase id
- `inputs`: 前置 phase 的 `requiredArtifacts`
- `outputs`: 当前 phase 的 `requiredArtifacts`
- `allowedPaths`: 来自 execution 白名单或当前 phase 产出路径
- `qualityGates`: 当前 phase 的完成判定
- `handoffArtifacts`: 下游恢复必须读取的制品
- `forbiddenActions`: 本 phase 明确不做与全局禁止项
- `humanApprovalGates`: 真实 provider 调用、发布、商用、打 tag、归档等人工决策

### NodeAgent 字段

- `id`: `<workflow-node-id>-agent`
- `role`: `node`
- `nodeId`: 对应 workflow node id
- `ownerPhaseId`: 产出该节点制品的 phase id
- `inputs`: 上游节点输出的 artifacts
- `outputs`: 本节点负责生成的 artifacts
- `requiredArtifacts`: 下游继续执行前必须存在的 artifacts
- `qualityGates`: 节点级结构检查，例如 shot id、audio cue、prompt ref、job id 是否可追溯
- `handoffArtifacts`: 下一个节点 Agent 需要读取的文件

### 调度规则

- 一个 phase 可以包含多个 NodeAgent；不要把 phase 和 node 简单一一等同。
- 插入 workflow node 时必须同步声明新的 NodeAgent，或明确复用已有 AgentSpec。
- 删除 workflow node 前必须检查下游 Agent 的 `inputs` 是否仍能由其他节点或 artifact 满足。
- Overlay 若新增 phase 或 artifact，也必须补充或调整相关 AgentSpec。

## 执行合同：`plan/execution/phase-X-<slug>.md`

```markdown
# Phase X 执行包

本文件不能单独使用。执行 Phase X 时，必须同时携带完整的 `plan/common.md` 和 `plan/phases/phase-X-<slug>.md`。

## 必带上下文

- `plan/common.md`
- `plan/phases/phase-X-<slug>.md`

## 执行目标

- <本轮实际要完成的目标 1>
- <本轮实际要完成的目标 2>

## 本次允许改动

- `anime/<path>/**`
- `plan/**`（仅当本 phase 需要更新契约或 handoff）

## 本次禁止改动

- <不属于当前 phase 的路径>
- <真实 provider 密钥或本地私密配置>

## 交付检查

- <文件存在检查>
- <字段完整检查>
- <音画/镜头覆盖检查>

## 执行裁决规则

- 若需要真实调用外部模型但用户尚未确认 provider 和鉴权方式，停止并询问。
- 若新增节点会破坏下游输入输出契约，停止并先更新 workflow contract。
- 若发现角色/风格/时间轴冲突，先修当前 phase 产物，不要跳到后续合成。
```

## 占位合同模板

future phase 未轮到当前时，使用成对占位文件：

```markdown
# PHASE_CONTRACT_PLACEHOLDER

当前文件只是占位合同，禁止开始实施。

当 `ruby scripts/planctl advance --strict` 返回 `ACTION: promote_placeholder` 且指向本 phase 时，先把 `plan/phases/...` 与 `plan/execution/...` 同步升级成正式合同，再重跑 `advance --strict`。
```
