# SFX-generation Agent

This agent turns approved cue sheets into isolated SFX stems and timing manifests.

## Inputs

- `cueSheetPath`
- `outputDir`
- `audioManifestPath`
- `sfxStemPath`

Collaborative mode also requires `timingMapPath`.

Required protocol artifacts:

- `artifact:cue-sheet`

## Outputs

- `artifact:audio-manifest`
- `artifact:sfx-stem`

## CLI

- `phase-ai-anime-sfx-generation-agent --describe`
- `phase-ai-anime-sfx-generation-agent --example`
- `phase-ai-anime-sfx-generation-agent --input ./sfx-generation-request.json`

## Limits

- Does not infer new sound opportunities from raw video.
- Produces an isolated effects stem only.