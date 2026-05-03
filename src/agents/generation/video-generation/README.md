# Video-generation Agent

This agent converts locked still-image inputs and shot timing into a short-form video package.

## Inputs

- `shotPlanPath`
- `imageManifestPath`
- `durationSeconds`
- `aspectRatio`
- `outputDir`
- `videoManifestPath`
- `finalVideoPath`

Required protocol artifacts:

- `artifact:video-shot-plan`
- `artifact:image-manifest`

Optional collaboration artifact:

- `artifact:audio-manifest`

## Outputs

- `artifact:video-manifest`
- `artifact:rendered-video`

## CLI

- `phase-ai-anime-video-generation-agent --describe`
- `phase-ai-anime-video-generation-agent --example`
- `phase-ai-anime-video-generation-agent --input ./video-generation-request.json`

## Limits

- Does not synthesize audio.
- Assumes shot ids are already locked and traceable.