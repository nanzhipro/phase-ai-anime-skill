# AI 漫剧 Profiles

Profile 层表达“不同 AI 漫剧形态的默认制作链路”。底层 `planctl` 不关心题材和模型品牌；profile 只负责默认 phase、必带制品、补充问卷和质量焦点。

## 三层边界

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 通用内核 | `scripts/planctl.rb`、`references/*` | 状态机、双层合同、恢复协议、ledger、finalize |
| Profile 层 | `profiles/*/profile.yaml`、`profiles/overlays.yaml` | 制作形态默认值、phase catalog、质量焦点 |
| 项目实例层 | 生成项目中的 `plan/**`、`anime/**` | 某条 AI 漫剧自己的角色、分镜、prompt、音频、合成 |

## 内置 profile

- [vertical-short](./vertical-short/profile.yaml)：竖屏短剧，强调三秒钩子、强反差和尾部牵引。
- [episodic-cinematic](./episodic-cinematic/profile.yaml)：横屏/pilot，强调镜头语言、情绪连续和电影感。
- [webtoon-motion](./webtoon-motion/profile.yaml)：条漫/漫画转动态视频，强调分格、推拉摇移、字幕和配音。
- [character-ip](./character-ip/profile.yaml)：角色 IP 短内容，强调可重复角色、口头禅和批量化节点。

## 最小 schema

见 [profile-template.yaml](./profile-template.yaml)。

## 展开示例

见 [examples.md](./examples.md)，其中展示了竖屏短剧和动态漫画两个 profile 如何叠加 overlay，并形成最终 phase 链。

## Overlay

共享 overlay 见 [overlays.yaml](./overlays.yaml)，用于插入或强化：角色一致性、短剧留存、音画同步、provider jobs、本地化、人类审片等。
