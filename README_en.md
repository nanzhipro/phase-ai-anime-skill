# phase-ai-anime-skill

**About**: A workflow Skill for AI anime drama, manga-motion, and storyboard-to-video projects. The default path now focuses on a 15-second single-video MVP: turn an idea into a shootable screenplay, derive categorized prompts and manifests, generate images, then generate one video so the whole production loop works before expanding to longer videos.

> _"Put the story, shots, and sound on disk before asking models to generate."_

[![install](https://img.shields.io/badge/install-npx%20skills%20add-informational?logo=npm)](https://www.npmjs.com/package/skills)
[![Copilot](https://img.shields.io/badge/GitHub%20Copilot-supported-24292e?logo=github)](./references/agent-instructions-template.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-d97757)](./references/agent-instructions-template.md)
[![Codex](https://img.shields.io/badge/Codex-supported-10a37f)](./references/agent-instructions-template.md)

**English** · [中文](./README.md)

## What It Does

AI anime drama production often fails between tools: the screenplay no longer matches the shots, prompt packs get lost, generated assets cannot be reused, and the next model stage no longer knows which inputs were approved. This Skill externalizes that state into files and lets `planctl` enforce phase order, confirmation gates, recovery, and completion.

The MVP does not force real provider calls up front. It creates a provider-neutral 15-second single-video blueprint first:

- A 15-second design brief, shootable screenplay, and script manifest.
- Categorized character, world, and scene prompt packs plus a prompt manifest.
- Provider-neutral image jobs, an image manifest, and reusable image asset paths.
- A provider-neutral video job, a video manifest, and the final delivery path.
- Phase/Node/Adapter agent contracts so every phase, creative node, and provider edge can be handed off independently.
- Explicit user confirmation after each stage before the next stage consumes its manifest.
- Provider-neutral adapters with recommended first integrations such as Volcengine image and Volcengine Seedance video.

## Best Fit

- **15-second vertical AI drama MVPs**: get one short video working end to end before scaling up.
- **Cinematic pilot episodes**: stronger shot grammar, emotional continuity, and audiovisual pacing.
- **Webtoon motion**: convert panels into shots, camera moves, subtitles, and voice cues.
- **Character IP shorts**: lock voice, visual anchors, expressions, catchphrases, and repeatable behavior.
- **Multi-model pipelines**: replace image or video nodes first, then expand to audio and longer-form delivery once the short loop is stable.

## Quick Start

Tell the Agent:

```text
Use phase-ai-anime-skill to build a 15-second vertical AI anime drama from this idea: <your premise>
```

Once a plan exists:

```bash
ruby scripts/planctl advance --strict
ruby scripts/planctl complete <phase-id> --summary "..." --next-focus "..." --continue
ruby scripts/planctl finalize
```

If the user explicitly says "reset phase", "restart from phase 0", or equivalent wording, run:

```bash
ruby scripts/planctl reset --summary "Restart from phase-0"
ruby scripts/planctl advance --strict
```

`reset` only clears the phase ledger, handoff snapshot, and finalized state. It does not delete generated assets; review, reuse, or regenerate them during phase-0.

Use the TypeScript MVP directly:

```ts
import { buildAnimeDramaWorkflow } from 'phase-ai-anime-skill';

const workflow = buildAnimeDramaWorkflow({
  title: 'The Cat-Eared Detective at the Rainy Convenience Store',
  premise: 'A water-fearing cat-eared detective must recover a missing talking earbud during a storm.',
  targetPlatform: 'vertical-short',
  episodeDurationSeconds: 15,
});
```

If an `animeSkillHandler` query starts with `reset phase:`, `restart from phase 0:`, or equivalent wording, the handler marks the blueprint as a phase-0 restart and returns the reset guidance via `phaseFlow` and `nextSteps`.

The default next step chain is: confirm the screenplay package, confirm the prompt package, confirm the image manifest, then run video generation for one 15-second clip.

## Main Phase Chain

| Phase | Output | Purpose |
| --- | --- | --- |
| 0. Screenplay Design | design brief, screenplay, script manifest | Turn the idea into a shootable 15-second script package |
| 1. Prompt Package | character/world/scene prompts, prompt manifest | Prepare categorized prompts and bridge data for generation |
| 2. Image Generation | image jobs, image manifest, image assets | Generate the image foundation for one approved video |
| 3. Video Generation | video job, video manifest, final mp4, delivery review | Generate one 15-second deliverable clip |

## Pluggable Agents

`workflow.agents` splits the chain into three independent handoff units: Phase Agents own phase contracts, confirmation gates, and handoff; Node Agents own creative node inputs, outputs, and manifest updates; Adapter Agents own provider connections after human approval. Inserting a workflow node requires a matching Node Agent contract.

## Development

```bash
npm run build
npm test
npm run lint
```

## Documentation

- [SKILL.md](./SKILL.md) - full Skill procedure and quality gates
- [references/methodology.md](./references/methodology.md) - AI anime drama methodology
- [references/glossary.md](./references/glossary.md) - glossary
- [references/templates.md](./references/templates.md) - plan templates
- [references/phase-templates.md](./references/phase-templates.md) - phase, execution, and agent contract patterns
- [references/provider-adapter-contracts.md](./references/provider-adapter-contracts.md) - provider adapter and Adapter Agent contracts
- [profiles/README.md](./profiles/README.md) - profile layer
- [profiles/examples.md](./profiles/examples.md) - profile and overlay expansion examples
- [examples/rainy-convenience-store](./examples/rainy-convenience-store) - complete offline 60-second vertical example package

## License

This repository inherits the license of the parent Agent Skill library. `scripts/planctl.rb` has no external dependencies and can be copied into generated projects.
