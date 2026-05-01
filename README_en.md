# phase-ai-anime-skill

**About**: A long-running workflow Skill for AI anime drama, manga-motion, and storyboard-to-video projects. It turns story design, dialogue, shot planning, image prompts, video prompts, TTS, sound, subtitles, generation jobs, and final assembly into disk-backed phases that can survive context compression and model handoffs.

> _"Put the story, shots, and sound on disk before asking models to generate."_

[![install](https://img.shields.io/badge/install-npx%20skills%20add-informational?logo=npm)](https://www.npmjs.com/package/skills)
[![Copilot](https://img.shields.io/badge/GitHub%20Copilot-supported-24292e?logo=github)](./references/agent-instructions-template.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-d97757)](./references/agent-instructions-template.md)
[![Codex](https://img.shields.io/badge/Codex-supported-10a37f)](./references/agent-instructions-template.md)

**English** · [中文](./README.md)

## What It Does

AI anime drama production often fails between tools: character drift, style drift, weak shot continuity, dialogue that does not match timing, sound cues that miss actions, and model outputs that cannot be assembled. This Skill externalizes production state into files and lets `planctl` enforce phase order, recovery, and completion.

The MVP does not call external model APIs. It creates a provider-neutral production blueprint first:

- Series promise, audience, aspect ratio, duration, and non-goals.
- Character, scene, and style bible for consistency.
- Episode beat sheet, dialogue script, subtitle strategy, and voice direction.
- Shot-level storyboard, image prompts, video prompts, negative prompts, reference placeholders, and seed strategy.
- Unified audio-video timeline covering shots, action, dialogue, SFX, music, silence, and subtitles.
- Phase/Node/Adapter agent contracts so every phase, creative node, and provider edge can be handed off independently.
- Generation job specs that can later connect to OpenAI, Gemini/Veo, Runway, Luma, Kling, Pika, ElevenLabs, local ComfyUI, FFmpeg, or custom adapters.
- Final assembly manifest for editing, QA, and publishing.

## Best Fit

- **Vertical AI drama shorts**: 45-90 second episodes with a three-second hook and a strong ending pull.
- **Cinematic pilot episodes**: stronger shot grammar, emotional continuity, and audiovisual pacing.
- **Webtoon motion**: convert panels into shots, camera moves, subtitles, and voice cues.
- **Character IP shorts**: lock voice, visual anchors, expressions, catchphrases, and repeatable behavior.
- **Multi-model pipelines**: replace image, video, voice, SFX, music, or assembly nodes without changing the whole plan.

## Quick Start

Tell the Agent:

```text
Use phase-ai-anime-skill to build a 60-second vertical AI anime drama from this idea: <your premise>
```

Once a plan exists:

```bash
ruby scripts/planctl advance --strict
ruby scripts/planctl complete <phase-id> --summary "..." --next-focus "..." --continue
ruby scripts/planctl finalize
```

Use the TypeScript MVP directly:

```ts
import { buildAnimeDramaWorkflow } from 'phase-ai-anime-skill';

const workflow = buildAnimeDramaWorkflow({
  title: 'The Cat-Eared Detective at the Rainy Convenience Store',
  premise: 'A water-fearing cat-eared detective must recover a missing talking earbud during a storm.',
  targetPlatform: 'vertical-short',
  episodeDurationSeconds: 75,
});
```

## Main Phase Chain

| Phase | Output | Purpose |
| --- | --- | --- |
| 0. Concept Promise | Promise, audience, aspect ratio, duration, boundaries | Decide why viewers watch |
| 1. Cast Style Bible | Characters, settings, style, camera language | Protect consistency |
| 2. Episode Beat Sheet | Hook, beats, escalation, ending pull | Shape retention |
| 3. Dialogue Voice Script | Dialogue, narration, subtitles, voice direction | Make characters speak |
| 4. Shot Storyboard | Shot list, framing, action, transitions | Make scenes executable |
| 5. Visual Prompt Pack | Image/video prompts, seeds, references | Feed generation models |
| 6. Audio Timeline | TTS, SFX, music, captions, pauses | Synchronize audio and picture |
| 7. Generation Job Specs | Provider-neutral jobs | Enable adapters |
| 8. Assembly QC | Assembly manifest, QA, release package | Build the final video structure |

## Pluggable Agents

`workflow.agents` splits the chain into three independent handoff units: Phase Agents own phase contracts and handoff, Node Agents own creative node inputs, outputs, and quality gates, and Adapter Agents own provider connections after human approval. Inserting a workflow node requires a matching Node Agent contract.

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
