# Runtime Environment Setup

真实调用 provider runtime 之前，必须先准备本地运行时密钥。

## Runtime Keys

- `ARK_API_KEY` 用于内建的 Volcengine 图片生成和 Seedance 视频生成。
- `VOLCENGINE_TTS_ACCESS_TOKEN` 可用于内建的 Volcengine OpenSpeech TTS；同时还需要显式提供 `appId` 和 `resourceId`。
- `CUSTOM_SFX_API_KEY` 和 `CUSTOM_MUSIC_API_KEY` 是默认的 custom HTTP 音频 runtime token 变量名；也可以在执行时显式传入 `apiKey`。
- 如果 key 缺失、过期或无权限，真实 provider 调用不会进入有效执行阶段。

## Local Setup

在仓库根目录执行：

```bash
cp .env.example .env
```

然后编辑 `.env`，把占位值替换成真实 key：

```dotenv
ARK_API_KEY=<your-real-ark-api-key>
VOLCENGINE_TTS_ACCESS_TOKEN=<your-real-volcengine-tts-access-token>
CUSTOM_SFX_API_KEY=<your-real-sfx-provider-token>
CUSTOM_MUSIC_API_KEY=<your-real-music-provider-token>
```

`.env` 只用于本地运行时，不允许提交到 GitHub。本仓库已经通过 `.gitignore` 忽略 `.env`。

## Preflight Check

如果你只检查图片/视频运行前置条件，先执行：

```bash
npm run check:env
```

这会检查：

- 当前 shell 的 `ARK_API_KEY`；
- 或仓库根目录下的 `.env`；
- `.env` 是否仍是占位值；
- 缺 key 时是否应该从 `.env.example` 复制模板。

TTS 和 custom HTTP 音频 runtime 会在真正调用前，按各自的 env var 名称再做一次运行时预检。检查失败时，不要继续跑真实 provider 流程；先修正 key。

## Runtime Behavior

- 内建 runtime 会优先读取显式传入的 `apiKey`。
- 如果没有显式传入，则按各自的 env var 名称读取 `process.env`，再回退到仓库根目录 `.env`。
- 如果仍然找不到合法 key，会直接报错并停止 provider 调用。
- `executeVolcengineImageGeneration` 和 `executeVolcengineSeedanceVideoGeneration` 默认检查 `ARK_API_KEY`。
- `executeVolcengineOpenSpeechTts` 默认检查 `VOLCENGINE_TTS_ACCESS_TOKEN`，同时要求显式提供 `appId` 和 `resourceId`。
- `executeCustomHttpSfxGeneration` 和 `executeCustomHttpMusicGeneration` 默认分别检查 `CUSTOM_SFX_API_KEY` 和 `CUSTOM_MUSIC_API_KEY`；如果你显式传入 `apiKey`，则不会再依赖 env 中的 token。

## Team Rules

- 不要把任何 provider token 写进 manifest、jobs、prompt 文件或测试夹具。
- 不要把 `.env` 提交到 GitHub。
- 不要在日志里打印完整 Authorization 头或原始 key。
- 建议按环境拆分 key，例如 dev、staging、prod 分开管理。