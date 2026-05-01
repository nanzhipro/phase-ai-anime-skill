# AI 漫剧术语表 / Glossary

| 名词 | 英文 | 含义 |
| --- | --- | --- |
| AI 漫剧 | AI Anime Drama | 用生成式图像、视频、语音、音乐和剪辑工具制作的动漫/漫画风格短剧或剧集。 |
| 制作合同链 | Production Contract Chain | 把剧作、角色、分镜、prompt、音频、生成任务和合成拆成有序 phase。 |
| Phase | Phase | 一段可独立验收、可回退、可落盘的制作工作。 |
| 定位合同 | Positioning Contract | `plan/phases/*`，回答这个阶段是什么、产出什么、做到哪儿算完成。 |
| 执行合同 | Execution Contract | `plan/execution/*`，回答本轮能改哪些路径、不能做什么、交付检查是什么。 |
| 剧集承诺 | Episode Promise | 观众在开头得到的观看契约：这条视频会提供什么冲突、情绪或答案。 |
| 三秒钩子 | Three-Second Hook | 开场三秒内让观众理解角色处境、反差和问题的设计。 |
| 角色锚点 | Character Anchor | 保持角色一致性的外观、服装、表情、动作、声口和代表色。 |
| 风格 bible | Style Bible | 画面风格、色彩、线条、光线、镜头语言、禁用风格的权威文档。 |
| 镜头卡 | Shot Card | 包含 `shot_id`、时长、构图、动作、台词、音频 cue、prompt 入口的镜头规格。 |
| 首尾帧 | First/Last Frame | 用来控制视频镜头开始和结束画面的参考帧。 |
| 图生视频 | Image-to-Video | 以参考图或关键帧为输入生成动态视频片段。 |
| Provider Job Spec | Provider Job Spec | 不绑定模型厂商的生成任务规格，后续由 adapter 转成具体 API/CLI 调用。 |
| 音画时间轴 | Audio-Video Timeline | 统一管理镜头、动作、台词、SFX、音乐、字幕、停顿和转场的时间结构。 |
| TTS Cue | TTS Cue | 配音生成任务的角色、文本、情绪、语速、时间范围和 voice id 占位。 |
| SFX Cue | Sound Effect Cue | 声音事件，如敲门、雨声、脚步、闪白、转场冲击。 |
| Assembly Manifest | Assembly Manifest | 最终合成所需的视频片段、音频、字幕、时长、缺口和质检状态清单。 |
| 节点可插拔 | Node Pluggability | 工作流节点可插入、删除或替换，只要输入输出契约保持兼容。 |
| Animatic | Animatic | 用文字、静帧、占位音频或低保真片段组成的预演版本。 |
| 口型同步 | Lip Sync | 配音、口型、面部动作和字幕在时间上对齐。 |
| 连续性账本 | Continuity Ledger | 记录角色外观、道具、空间、事件、伏笔和生成决策的外部清单。 |

## Golden Loop

```text
advance --strict
→ 读取 common + 当前 phase + 当前 execution
→ 在边界内完成当前制作层级
→ 自检镜头/音频/任务规格
→ complete <id> --continue
```

## 相邻概念

| 概念 | 与本工作流的关系 |
| --- | --- |
| Prompt Engineering | 只改善单次生成，不能替代制作状态管理。 |
| Storyboard | 是核心产物之一，但不包含完整的 phase 调度、音频和生成任务。 |
| Video Editor Project | 是 assembly 的下游消费对象，不是上游创作合同。 |
| Agent Framework | 可以执行节点，但 Phase-AI-Anime 定义的是制作秩序和产物契约。 |
