# Text-to-image Agent

This agent turns approved prompt refs into reusable still-image assets.

## Inputs

- `promptManifestPath`
- `promptRefs`
- `aspectRatio`
- `outputDir`
- `imageManifestPath`

Required protocol artifacts:

- `artifact:shot-plan`
- `artifact:image-prompt-manifest`

## Outputs

- `artifact:image-manifest`
- `artifact:rendered-image-batch`

## Collaboration

Collaborative mode adds `artifact:continuity-profile` and returns image-manifest entries keyed by stable shot ids for `video-generation`.

## CLI

- `phase-ai-anime-text-to-image-agent --describe`
- `phase-ai-anime-text-to-image-agent --example`
- `phase-ai-anime-text-to-image-agent --input ./text-to-image-request.json`

## Limits

- Does not author prompts from raw story text.
- Does not execute a provider directly; adapters remain the execution layer.