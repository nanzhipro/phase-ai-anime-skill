# Rainy Convenience Store

A tiny offline smoke example for `phase-ai-anime-skill`. It demonstrates how a 60-second vertical AI anime drama can move from premise to storyboard, audio timeline, provider-neutral jobs, assembly manifest, and QC without calling any model.

## Premise

A water-fearing cat-eared detective must recover a missing talking earbud during a storm, but the earbud claims the real missing person is the detective.

## How To Read

1. Start with `plan/common.md` for production constraints.
2. Read `anime/bible/concept.md` for promise, audience, and style.
3. Inspect `anime/storyboard/episode-001-shots.yaml` and match every `shot_id` to `anime/audio/episode-001-timeline.yaml`.
4. Inspect `anime/jobs/episode-001-generation-jobs.json`; every job stays `provider: unassigned`.
5. Inspect `anime/assembly/episode-001-assembly.json` to see how expected assets would be assembled after real generation.

## Boundary

This example contains no real model outputs, no provider credentials, no private local paths, and no commercial release decision.
