# phase-ai-anime-skill 执行流程

本仓库使用 Phase-Contract 方式推进 AI 漫剧 Skill 改造。

## 恢复方式

```bash
ruby scripts/planctl.rb resume --strict
```

或按固定顺序：

1. 读取 `plan/manifest.yaml`
2. 读取 `plan/handoff.md`
3. 运行 `ruby scripts/planctl.rb advance --strict`

## Golden Loop

```bash
ruby scripts/planctl.rb advance --strict
# 读取输出中的 required_context 三份文件
# 在 execution 允许路径内实施当前 phase
ruby scripts/planctl.rb complete <phase-id> --summary "<本轮完成内容>" --next-focus "<下一轮焦点>" --continue
```

本环境中除非用户明确要求提交，遵循上层开发规约不主动运行会产生 git commit/push 的 `complete`。

## 当前改造主线

1. 先完成 AI 漫剧 Skill 的核心文档、profiles 和 TypeScript MVP。
2. 再硬化生成项目的合同模板与例子。
3. 再补 provider adapter contract。
4. 再添加一个小型生成项目 smoke example。
5. 最后做术语清理、测试和 release readiness review。
