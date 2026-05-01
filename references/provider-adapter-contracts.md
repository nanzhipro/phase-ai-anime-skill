# Provider Adapter Contracts

Provider adapter contracts describe how provider-neutral generation jobs can later be translated into concrete API, CLI, or manual tool calls. This phase defines contracts only. It does not call any provider.

## Boundary

- Jobs stay `provider: unassigned` until a human chooses a provider.
- Adapter slots are stable names such as `image_generation_adapter`, `image_to_video_adapter`, `tts_adapter`, `sfx_adapter`, `music_adapter`, and `assembly_adapter`.
- Secrets never belong in job specs. Do not write API keys, tokens, cookies, bearer headers, passwords, local private paths, or account-specific configuration into the repository.
- A real call requires explicit human confirmation of provider, authentication method, estimated cost, input assets, output storage, and content boundary.

## Contract Shape

Each `ProviderContract` declares:

- `kind`: image, video, tts, sfx, music, assembly, or review.
- `adapterSlot`: the replaceable slot name consumed by a future adapter.
- `inputArtifacts`: files the adapter may read.
- `outputArtifacts`: files the adapter is expected to create.
- `requiredFields`: fields that must be present in `GenerationJobSpec.input`.
- `forbiddenFields`: field names that must never appear in the job payload.

Each `GenerationJobSpec` declares:

- `jobId`: stable job identifier.
- `kind`: same domain as the matching contract.
- `provider`: always `unassigned` in the MVP.
- `adapterSlot`: must match a contract for the same kind.
- `input`: provider-neutral parameters and artifact references.
- `output.expectedPath`: expected output location.
- `safety.storesSecrets`: always false.
- `safety.requiresHumanApproval`: true for jobs that would create external media or final outputs.

## Validation Rules

`validateGenerationJobsAgainstContracts` checks:

- every job has a matching `kind + adapterSlot` contract;
- every job remains `provider: unassigned`;
- job kind and adapter slot match the selected contract;
- required input fields are present;
- forbidden fields such as `apiKey`, `api_key`, `token`, `cookie`, `secret`, `password`, `credential`, `authorization`, and private local paths are absent.

## Future Adapter Implementation

A future provider-specific adapter should be a replaceable edge node, not part of the core workflow builder. It should:

1. Read a validated `GenerationJobSpec`.
2. Resolve credentials from environment variables or a secure runtime store outside the repository.
3. Translate neutral fields to provider-specific request fields.
4. Write outputs to `output.expectedPath` or a documented artifact path.
5. Write a small run report with provider name, model/version, duration, cost estimate, and output checks.
6. Never mutate story, storyboard, audio timeline, or prompt source files during a provider call.

## Adapter Agent Rules

An `AdapterAgent` is the independent-agent form of a provider adapter contract. It is allowed to translate a validated neutral job into a concrete provider call only after human approval. It must declare:

- `role: adapter` and the stable `adapterSlot` it serves.
- `inputs`: validated job specs plus the neutral artifacts it may read.
- `outputs`: generated media or run reports, usually under `anime/assets/**` or `anime/final/**`.
- `qualityGates`: job validation, output existence, run report, and sync/format checks.
- `forbiddenActions`: writing credentials, mutating source story artifacts, uploading private assets without approval, or changing `provider: unassigned` inside source job specs.
- `humanApprovalGates`: provider/model, authentication method, cost, upload scope, output retention, reuse rights, and commercial-use boundary.

Adapter-specific request schemas belong inside the adapter implementation or run report. They must not be smuggled into provider-neutral `GenerationJobSpec.input` fields.

## Human Confirmation Gate

Before any real call, ask the user to confirm:

- provider and model family;
- authentication mechanism;
- estimated cost or quota impact;
- exact input artifacts to upload;
- output retention policy;
- whether generated outputs may be reused, published, or used commercially.
