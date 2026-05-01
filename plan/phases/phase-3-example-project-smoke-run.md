# Phase 3: Example Project Smoke Run

## 阶段定位

添加一个小型、完全离线的 AI 漫剧生成项目示例，让用户能看到从 concept、storyboard、audio timeline、generation jobs 到 assembly manifest 的最小可运行链路。这个阶段验证模板是否真的能“从 0 到 1 跑通”，但不真实调用任何模型。

## 必带上下文

- `plan/common.md`
- `phase-1-contract-template-hardening` 的完成事实：生成项目模板和 overlay 示例已硬化。
- `phase-2-provider-adapter-contracts` 的完成事实：adapter contract 与离线验证 helper 已落地。

## 阶段目标

- 在 `examples/**` 下新增一个小型 AI 漫剧项目示例。
- 示例包含 plan 骨架和 `anime/**` 最小制品：concept、storyboard、audio timeline、generation jobs、assembly、QC。
- generation jobs 保持 `provider: unassigned`，并且不含密钥字段或私密路径。
- 增加 smoke test，检查示例关键文件、shot/timeline/job 追溯关系和 secret-free 约束。
- README/README_en 增加轻量示例链接，不扩写成完整手册。

## 实施范围

- `examples/**`
- `README.md`
- `README_en.md`
- `tests/**`
- `plan/**`

## 本阶段产出

- 一个可读的示例项目目录。
- 一个离线 smoke test。
- 文档入口链接。
- 当前 phase 的 handoff 和 state 更新。

## 明确不做

- 不调用图像、视频、TTS、音乐或剪辑 provider。
- 不生成真实图片、音频或视频素材。
- 不引入依赖或 provider SDK。
- 不发布、打 tag、归档或提交。

## 完成判定

- `examples/rainy-convenience-store/README.md` 存在并说明如何阅读示例。
- 示例中存在 `anime/storyboard/episode-001-shots.yaml`、`anime/audio/episode-001-timeline.yaml`、`anime/jobs/episode-001-generation-jobs.json`、`anime/assembly/episode-001-assembly.json`。
- smoke test 能验证 storyboard shot ids、timeline shot ids 和 job ids 的基本追溯关系。
- smoke test 能验证 jobs 不包含 `api_key`、`token`、`cookie`、`secret`。
- README 和 README_en 链接到示例。
- `ruby tests/example_smoke_test.rb` 通过。
- `ruby scripts/planctl.rb advance --strict` 返回下一步可继续执行，且不再把本 phase 识别为 placeholder。

## 依赖关系

- `phase-2-provider-adapter-contracts`
