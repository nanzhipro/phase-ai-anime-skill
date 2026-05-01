# Phase-AI-Anime 执行流程说明

本文件说明 AI 漫剧项目如何按 phase 顺序执行，以及在上下文压缩或换会话后如何恢复。

## 目标

- 让剧情、台词、分镜、prompt、音频、生成任务和合成步骤按顺序落盘。
- 防止 AI 在一个窗口里同时改剧作、画面、声音和剪辑。
- 保留工作流节点插入、删除和替换能力。
- 在真实调用模型前，先生成可审查的 provider-neutral job specs。

## 核心文件

| 文件 | 作用 |
| --- | --- |
| `plan/manifest.yaml` | phase 顺序、依赖、上下文和恢复规则 |
| `plan/common.md` | 全局制作约束：受众、画幅、角色、风格、音画同步、模型边界 |
| `plan/phases/*` | 当前阶段要解决什么 |
| `plan/execution/*` | 当前阶段允许改哪些路径 |
| `plan/state.yaml` | 已完成 phase ledger |
| `plan/handoff.md` | 压缩恢复锚点 |
| `anime/**` | 实际制作产物 |
| `scripts/planctl` | 调度脚本 |

## Golden Loop

```bash
ruby scripts/planctl advance --strict
# 按输出读取 required_context 三份文件
# 在 execution 白名单内完成当前制作层级
ruby scripts/planctl complete <phase-id> --summary "<本轮完成内容>" --next-focus "<下一轮焦点>" --continue
```

若输出 `ACTION: promote_placeholder`，先把该 phase 的定位合同和执行合同升级成正式合同，再重跑 `advance --strict`。

若输出 `ACTION: finalize`，运行：

```bash
ruby scripts/planctl finalize
```

## 工作流节点

AI 漫剧节点以输入输出契约连接，而不是以模型品牌连接。推荐节点：

1. `concept_intake`
2. `cast_style_bible`
3. `episode_beats`
4. `dialogue_script`
5. `shot_storyboard`
6. `visual_prompt_pack`
7. `audio_timeline`
8. `generation_job_specs`
9. `assembly_manifest`
10. `human_qc`

新增或删除节点前，必须更新受影响 phase 的合同，并确认下游依赖仍满足。

## 节点变更协议

新增节点时：

1. 找到 anchor node，确认它的 `outputs` 能满足新节点 `inputs`。
2. 在 `plan/manifest.yaml` 中为受影响 phase 增加 allowed paths 和 required context（如果需要）。
3. 在对应 `plan/phases/*` 写清新增节点的产物、非目标和完成判定。
4. 在对应 `plan/execution/*` 写清本轮允许改动路径和交付检查。
5. 重跑 `ruby scripts/planctl advance --strict`，只有 ACTION 为 `implement` 才实施。

删除节点时：

1. 先搜索下游 phase、workflow node 和 artifact 是否依赖该节点输出。
2. 若存在依赖，先替换依赖或保留节点；不要直接删除。
3. 若无依赖，更新受影响合同并记录为何删除。
4. 删除后至少检查 storyboard、audio timeline、generation jobs、assembly manifest 仍能互相追溯。

替换 provider 时，只替换 adapter contract，不改剧作、分镜或音频时间轴；真实调用仍必须由人类确认 provider、鉴权、成本和素材边界。

## Finalize 边界

`finalize` 只生成执行 dashboard 和人类下一步建议。它不代表自动发布、自动打 tag、自动归档或自动商用授权。发布、公开、归档和素材授权都必须由人类决定。

## 压缩恢复

新会话恢复顺序固定：

1. 读取 `plan/manifest.yaml`
2. 读取 `plan/handoff.md`
3. 运行 `ruby scripts/planctl advance --strict`

不要一次性加载全部 phase 文档。
