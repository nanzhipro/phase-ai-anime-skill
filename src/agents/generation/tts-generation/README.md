# TTS-generation Agent

This agent converts locked dialogue scripts into dialogue stems plus a timing manifest.

## Inputs

- `dialogueScriptPath`
- `language`
- `outputDir`
- `audioManifestPath`
- `dialogueStemPath`

Collaborative mode also requires `artifact:voice-casting-sheet`.

Required protocol artifacts:

- `artifact:dialogue-script`

## Outputs

- `artifact:audio-manifest`
- `artifact:dialogue-stem`

## CLI

- `phase-ai-anime-tts-generation-agent --describe`
- `phase-ai-anime-tts-generation-agent --example`
- `phase-ai-anime-tts-generation-agent --input ./tts-generation-request.json`

## Limits

- Does not mix SFX or music.
- Expects dialogue ids and voice decisions to be stable before synthesis.