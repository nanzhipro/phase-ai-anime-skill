# Generation Capability Architecture

本文档定义文生图能力与视频生成能力的分层架构。目标不是把它们简单拆成两个 provider adapter，而是把它们提升为两个可独立运行、也可通过 manifest 协作的 Agent 能力层。

## 设计目标

- 文生图能力与视频生成能力必须能独立工作。
- 两个能力也必须能通过 manifest 和 handoff 进行协作，而不是隐式耦合。
- 可复用的通用能力应沉淀在 capability 层，而不是散落在具体 provider adapter 里。
- provider-specific 逻辑只负责把 provider-neutral job 翻译成真实请求，不反向吞并上层能力。

## 四层结构

### 1. Reusable Foundation Layer

这一层是两个能力都复用的共性基础：

- provider-neutral job validation
- runtime preflight and approval gate handling
- manifest update and lineage recording
- output verification and quality gate reporting
- secret safety boundary and forbidden-field enforcement

这层不关心是图片还是视频，也不关心具体 provider。

### 2. Capability Layer

这一层定义五个独立 Agent 能力：

- `text-to-image-capability`
- `video-generation-capability`
- `tts-generation-capability`
- `sfx-generation-capability`
- `music-generation-capability`

它们都是 `standalone-or-collaborative`：

- standalone：上游输入已经齐备时，可以单独工作。
- collaborative：通过 manifest 与另一个能力协作工作。

### 3. Collaboration Layer

这些能力不直接共享临时内存或 provider 内部对象，而是通过稳定 handoff 产物协作：

- 文生图能力把确认后的结果落到 `anime/manifests/episode-001-image-manifest.json`
- TTS / SFX / 音乐能力把确认后的结果汇总到 `anime/manifests/episode-001-audio-manifest.json`
- 视频生成能力消费 image manifest，并把最终状态落到 `anime/manifests/episode-001-video-manifest.json`

这使得二者既可以串联，也可以在中间插入人工复核、本地替代器、第三方工具或额外 review 节点。

### 4. Provider Adapter Layer

provider adapter 不再等于“整个能力”，而是能力下面的可替换执行边：

- `image_generation_adapter` 归属于 `text-to-image-capability`
- `video_generation_adapter` 归属于 `video-generation-capability`
- `tts_generation_adapter` 归属于 `tts-generation-capability`
- `sfx_generation_adapter` 归属于 `sfx-generation-capability`
- `music_generation_adapter` 归属于 `music-generation-capability`

它们负责：

- 读取已验证的 provider-neutral jobs
- 读取运行时密钥和环境检查结果
- 生成 provider request plan
- 执行真实请求并写回 run report / manifest patch

它们不负责：

- 改写剧本、prompt 或 storyboard
- 吞并 reusable foundation 逻辑
- 决定整体协作拓扑

## 两个能力的边界

先前的两项视觉能力仍然保留；下面新增音频能力边界。

### Text-to-Image Capability

独立输入：

- character/world/scene prompts
- prompt manifest

独立输出：

- image manifest
- image assets

可复用能力：

- job validation
- runtime preflight
- manifest lineage
- asset path normalization

特有能力：

- prompt-to-image request planning
- aspect-ratio to image-size mapping
- anchor frame and scene still generation
- image batch orchestration

### Video Generation Capability

独立输入：

- screenplay
- scene prompts
- prepared image manifest or other approved media inputs

独立输出：

- video manifest
- final mp4

可复用能力：

- job validation
- runtime preflight
- manifest lineage
- delivery verification

特有能力：

- image-to-video / text-conditioned video planning
- async submit-and-poll orchestration
- duration, resolution, ratio, and delivery control
- final clip handoff and delivery review

### TTS Capability

独立输入：

- screenplay
- script manifest

独立输出：

- audio manifest
- dialogue assets

可复用能力：

- job validation
- runtime preflight
- manifest lineage
- asset path normalization

特有能力：

- script-to-voice planning
- speaker, pacing, and emotion mapping
- dialogue asset packaging and approval handoff

### SFX Capability

独立输入：

- screenplay
- script manifest

独立输出：

- audio manifest
- sfx assets

可复用能力：

- job validation
- runtime preflight
- manifest lineage
- asset path normalization

特有能力：

- cue-sheet to effect planning
- impact, ambience, and transition sound design
- sound-effect stem packaging and approval handoff

### Music Capability

独立输入：

- screenplay
- script manifest

独立输出：

- audio manifest
- music stems

可复用能力：

- job validation
- runtime preflight
- manifest lineage
- asset path normalization

特有能力：

- score brief and motif planning
- energy-arc, loop, and transition control
- music stem packaging and approval handoff

## 协作方式

### 文生图 / 音频 -> 视频生成

这是当前统一多模态协作模式：

1. 文生图能力根据 prompt package 生成图片资产。
2. TTS / SFX / 音乐能力根据 screenplay 和 script manifest 生成音频资产，并汇总到 audio manifest。
3. 图片资产和 lineage 被确认后写入 image manifest。
4. 视频生成能力消费 image manifest 和 audio manifest，发起视频生成或后续合成。

### 视频生成独立工作

视频生成能力不要求必须由文生图能力产出图片；它也可以消费：

- 预先存在且已确认的 image manifest
- 外部批准导入的首帧/参考图
- 文本提示词与现成素材组合

### 文生图独立工作

文生图能力也可以单独运行，只输出可复用的 still assets 和 image manifest，不必立即触发视频阶段。

### TTS / SFX / 音乐独立工作

三个音频能力也都可以单独运行，只输出各自音频资产和 audio manifest，不必立即进入最终视频阶段。

## 代码映射

- 类型层：`GenerationCapabilitySpec`、`AgentSpec.capabilityId`、`AgentSpec.capabilityKind`
- 蓝图层：`AnimeDramaBlueprint.generationCapabilities`
- 组装层：`createGenerationCapabilities`、`createCapabilityAgent`
- 执行层：adapter runtime 通过 `capabilityId` 挂到对应能力，而不是直接代表整个创作能力

## 设计收益

- 允许文生图、视频生成、TTS、SFX、音乐独立演进
- 允许共享运行前检查、manifest 规则和安全边界
- 让 provider adapter 变薄，降低未来替换成本
- 让协作关系显式化，便于插入 review、人机混合节点和多 provider 实验