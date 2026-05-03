# Music-generation Agent

This agent converts an approved score brief into a music stem plus a timing manifest.

## Inputs

- `musicBriefPath`
- `outputDir`
- `audioManifestPath`
- `musicStemPath`

Collaborative mode also requires `timingMapPath`.

Required protocol artifacts:

- `artifact:music-brief`

## Outputs

- `artifact:audio-manifest`
- `artifact:music-stem`

## CLI

- `phase-ai-anime-music-generation-agent --describe`
- `phase-ai-anime-music-generation-agent --example`
- `phase-ai-anime-music-generation-agent --input ./music-generation-request.json`

## Limits

- Does not compose from raw story text.
- Produces an isolated score stem only.