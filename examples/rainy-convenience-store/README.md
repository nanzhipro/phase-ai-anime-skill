# Rainy Convenience Store

A complete offline 60-second vertical example for `phase-ai-anime-skill`. It demonstrates how an AI anime drama can move from premise to beat sheet, dialogue, storyboard, audio timeline, provider-neutral jobs, assembly manifest, and QC without calling any model.

## Premise

A water-fearing cat-eared detective must recover a missing talking earbud during a storm, but the earbud claims the real missing person is the detective.

## How To Read

1. Start with `plan/common.md` for production constraints.
2. Read `anime/bible/concept.md` for promise, audience, and style.
3. Read `anime/scripts/episode-001-dialogue.md` for beat structure, dialogue, subtitles, and voice direction.
4. Inspect `anime/storyboard/episode-001-shots.yaml` and match every `shot_id` to `anime/audio/episode-001-timeline.yaml`.
5. Inspect `anime/agents/episode-001-agent-map.yaml` to see which phase, node, and adapter agents own each handoff.
6. Inspect `anime/jobs/episode-001-generation-jobs.json`; every job stays `provider: unassigned`.
7. Inspect `anime/assembly/episode-001-assembly.json` to see how expected assets would be assembled after real generation.

## Boundary

This example contains no real model outputs, no provider credentials, no private local paths, and no commercial release decision. Real generation still requires human approval of provider, authentication, cost, input upload boundaries, and output rights.
