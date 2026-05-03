import {
  AdapterHttpRequest,
  AdapterHttpResponse,
  AdapterRegistryEntry,
  AdapterTransport,
  AdapterValidationIssue,
  AdapterValidationResult,
  BuiltInProvider,
  CustomHttpAudioExecutionOptions,
  GenerationJobSpec,
  ProviderExecutionOutput,
  ProviderExecutionPlan,
  ProviderExecutionResult,
  ProviderContract,
  VolcengineImageExecutionOptions,
  VolcengineOpenSpeechTtsExecutionOptions,
  VolcengineSeedanceExecutionOptions,
  VolcengineVideoAudioInput,
  VolcengineVideoImageInput,
  VolcengineVideoVideoInput,
} from './types';
import {
  assertVolcengineRuntimeEnvironmentReady,
  resolveVolcengineRuntimeApiKey,
} from './runtime-env';

const DEFAULT_FORBIDDEN_FIELD_NAMES = [
  'apiKey',
  'api_key',
  'token',
  'cookie',
  'secret',
  'password',
  'credential',
  'authorization',
  'privatePath',
  'localPrivatePath',
];

const BUILT_IN_PROVIDER_SLOTS: Record<BuiltInProvider, string> = {
  'volcengine-seedream': 'image_generation_adapter',
  'volcengine-seedance': 'video_generation_adapter',
  'volcengine-openspeech-tts': 'tts_generation_adapter',
  'custom-http-sfx': 'sfx_generation_adapter',
  'custom-http-music': 'music_generation_adapter',
};

const DEFAULT_VOLCENGINE_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_VOLCENGINE_IMAGE_MODEL = 'doubao-seedream-5-0-260128';
const DEFAULT_VOLCENGINE_VIDEO_MODEL = 'doubao-seedance-2-0-260128';
const DEFAULT_IMAGE_RESPONSE_FORMAT = 'url';
const DEFAULT_VIDEO_RESOLUTION = '720p';
const DEFAULT_VIDEO_RATIO = '9:16';
const DEFAULT_VIDEO_POLL_INTERVAL_MS = 3000;
const DEFAULT_VIDEO_MAX_POLL_ATTEMPTS = 40;
const DEFAULT_TTS_BASE_URL = 'https://openspeech.bytedance.com';
const DEFAULT_TTS_FORMAT = 'mp3';
const DEFAULT_TTS_POLL_INTERVAL_MS = 3000;
const DEFAULT_TTS_MAX_POLL_ATTEMPTS = 120;
const DEFAULT_TTS_ACCESS_TOKEN_ENV_VAR = 'VOLCENGINE_TTS_ACCESS_TOKEN';
const DEFAULT_CUSTOM_SFX_API_KEY_ENV_VAR = 'CUSTOM_SFX_API_KEY';
const DEFAULT_CUSTOM_MUSIC_API_KEY_ENV_VAR = 'CUSTOM_MUSIC_API_KEY';
const DEFAULT_CUSTOM_AUDIO_POLL_INTERVAL_MS = 3000;
const DEFAULT_CUSTOM_AUDIO_MAX_POLL_ATTEMPTS = 40;

export function createAdapterRegistry(
  contracts: ProviderContract[]
): AdapterRegistryEntry[] {
  return contracts.map((contract) => ({
    kind: contract.kind,
    adapterSlot: contract.adapterSlot,
    status: hasBuiltInRuntime(contract) ? 'available' : 'contract-only',
    inputArtifacts: contract.inputArtifacts,
    outputArtifacts: contract.outputArtifacts,
    trackingManifest: contract.trackingManifest,
    requiredFields: contract.requiredFields,
    forbiddenFields: uniqueStrings([
      ...DEFAULT_FORBIDDEN_FIELD_NAMES,
      ...contract.forbiddenFields,
    ]),
    recommendedProviders: contract.recommendedProviders,
  }));
}
export function createVolcengineImageGenerationPlan(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: VolcengineImageExecutionOptions
): ProviderExecutionPlan {
  ensureExecutableJob(job, contract, 'image', 'image_generation_adapter');

  const apiKey = resolveApiKey(options.apiKey, options.apiKeyEnvVar);
  const model = options.model || DEFAULT_VOLCENGINE_IMAGE_MODEL;
  const size = options.size || suggestVolcengineImageSize(readStringInput(job, 'aspectRatio'));
  const responseFormat = options.responseFormat || DEFAULT_IMAGE_RESPONSE_FORMAT;
  const body: Record<string, unknown> = {
    model,
    prompt: options.prompt.trim(),
    size,
    response_format: responseFormat,
    watermark: options.watermark ?? false,
  };

  if (options.outputFormat) {
    body.output_format = options.outputFormat;
  }
  if (options.sequentialImageGeneration) {
    body.sequential_image_generation = options.sequentialImageGeneration;
  }
  if (options.sequentialImageGeneration === 'auto' && options.maxImages) {
    body.sequential_image_generation_options = { max_images: options.maxImages };
  }

  return {
    provider: 'volcengine-seedream',
    model,
    jobId: job.jobId,
    adapterSlot: job.adapterSlot,
    request: {
      method: 'POST',
      url: `${normalizeBaseUrl(options.baseUrl)}/images/generations`,
      headers: buildJsonHeaders(apiKey),
      body: JSON.stringify(body),
    },
    notes: [
      'Volcengine image generation is synchronous and returns image URLs or base64 payloads immediately.',
      'Returned URLs expire after 24 hours; persist them to your own storage before downstream use.',
    ],
  };
}

export async function executeVolcengineImageGeneration(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: VolcengineImageExecutionOptions
): Promise<ProviderExecutionResult> {
  assertVolcengineRuntimeEnvironmentReady({
    apiKeyEnvVar: options.apiKeyEnvVar,
    explicitApiKey: options.apiKey,
  });
  const plan = createVolcengineImageGenerationPlan(job, contract, options);
  const response = await getTransport(options.transport)(plan.request);
  const payload = ensureSuccessfulResponse(response, `Volcengine image generation for ${job.jobId}`);
  const data = readArray(payload, 'data');
  const outputs = data.map((entry, index) => buildImageOutput(job, entry, index, data.length));

  return {
    provider: plan.provider,
    model: plan.model,
    jobId: job.jobId,
    adapterSlot: job.adapterSlot,
    status: 'succeeded',
    manifestPath: job.manifestPath,
    outputs,
    manifestPatch: {
      provider: plan.provider,
      model: plan.model,
      status: 'succeeded',
      jobId: job.jobId,
      manifestPath: job.manifestPath,
      requestUrl: plan.request.url,
      outputPaths: outputs.map((output) => output.expectedPath),
      outputUrls: outputs.map((output) => output.url).filter((value): value is string => Boolean(value)),
      usage: readObject(payload, 'usage'),
      created: readNumber(payload, 'created'),
    },
    response: payload,
  };
}

export function createVolcengineSeedanceVideoPlan(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: VolcengineSeedanceExecutionOptions
): ProviderExecutionPlan {
  ensureExecutableJob(job, contract, 'video', 'video_generation_adapter');

  const apiKey = resolveApiKey(options.apiKey, options.apiKeyEnvVar);
  const model = options.model || DEFAULT_VOLCENGINE_VIDEO_MODEL;
  const content = buildSeedanceContent(options);
  if (content.length === 0) {
    throw new Error(`Seedance execution for ${job.jobId} requires at least one prompt or media input.`);
  }

  const duration = options.duration ?? readNumberInput(job, 'durationSeconds');
  const ratio = options.ratio || normalizeVideoRatio(readStringInput(job, 'aspectRatio'));
  const body: Record<string, unknown> = {
    model,
    content,
    generate_audio: options.generateAudio ?? false,
    resolution: options.resolution || DEFAULT_VIDEO_RESOLUTION,
    ratio,
    duration,
    watermark: options.watermark ?? false,
  };

  if (typeof options.returnLastFrame === 'boolean') {
    body.return_last_frame = options.returnLastFrame;
  }
  if (options.serviceTier) {
    body.service_tier = options.serviceTier;
  }
  if (typeof options.executionExpiresAfter === 'number') {
    body.execution_expires_after = options.executionExpiresAfter;
  }
  if (typeof options.seed === 'number') {
    body.seed = options.seed;
  }
  if (options.safetyIdentifier) {
    body.safety_identifier = options.safetyIdentifier;
  }

  return {
    provider: 'volcengine-seedance',
    model,
    jobId: job.jobId,
    adapterSlot: job.adapterSlot,
    request: {
      method: 'POST',
      url: `${normalizeBaseUrl(options.baseUrl)}/contents/generations/tasks`,
      headers: buildJsonHeaders(apiKey),
      body: JSON.stringify(body),
    },
    poll: {
      method: 'GET',
      urlTemplate: `${normalizeBaseUrl(options.baseUrl)}/contents/generations/tasks/{id}`,
      headers: buildJsonHeaders(apiKey),
    },
    notes: [
      'Seedance video generation is asynchronous: submit first, then poll task status until succeeded or failed.',
      'Returned video URLs expire after 24 hours; persist them to durable storage before later assembly or publication.',
    ],
  };
}

export async function executeVolcengineSeedanceVideoGeneration(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: VolcengineSeedanceExecutionOptions
): Promise<ProviderExecutionResult> {
  assertVolcengineRuntimeEnvironmentReady({
    apiKeyEnvVar: options.apiKeyEnvVar,
    explicitApiKey: options.apiKey,
  });
  const plan = createVolcengineSeedanceVideoPlan(job, contract, options);
  const transport = getTransport(options.transport);
  const createResponse = await transport(plan.request);
  const createPayload = ensureSuccessfulResponse(createResponse, `Seedance task creation for ${job.jobId}`);
  const taskId = readString(createPayload, 'id');

  if (!taskId) {
    throw new Error(`Seedance task creation for ${job.jobId} did not return a task id.`);
  }

  const autoPoll = options.autoPoll ?? true;
  if (!autoPoll) {
    return {
      provider: plan.provider,
      model: plan.model,
      jobId: job.jobId,
      adapterSlot: job.adapterSlot,
      status: 'submitted',
      taskId,
      manifestPath: job.manifestPath,
      outputs: [],
      manifestPatch: {
        provider: plan.provider,
        model: plan.model,
        status: 'submitted',
        jobId: job.jobId,
        taskId,
        manifestPath: job.manifestPath,
        pollUrl: plan.poll?.urlTemplate.replace('{id}', taskId),
      },
      response: createPayload,
    };
  }

  const pollUrl = plan.poll?.urlTemplate.replace('{id}', taskId);
  if (!pollUrl || !plan.poll) {
    throw new Error(`Seedance plan for ${job.jobId} is missing polling metadata.`);
  }

  const maxPollAttempts = options.maxPollAttempts || DEFAULT_VIDEO_MAX_POLL_ATTEMPTS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_VIDEO_POLL_INTERVAL_MS;
  const wait = options.waiter || defaultWaiter;

  for (let attempt = 1; attempt <= maxPollAttempts; attempt += 1) {
    const pollResponse = await transport({
      method: plan.poll.method,
      url: pollUrl,
      headers: plan.poll.headers,
    });
    const pollPayload = ensureSuccessfulResponse(pollResponse, `Seedance task polling for ${job.jobId}`);
    const status = readString(pollPayload, 'status');

    if (status === 'succeeded') {
      const content = readObject(pollPayload, 'content');
      const videoUrl = readString(content, 'video_url');
      if (!videoUrl) {
        throw new Error(`Seedance task ${taskId} succeeded without a video_url.`);
      }

      const outputs: ProviderExecutionOutput[] = [
        {
          expectedPath: job.output.expectedPath,
          format: job.output.format,
          url: videoUrl,
        },
      ];

      return {
        provider: plan.provider,
        model: plan.model,
        jobId: job.jobId,
        adapterSlot: job.adapterSlot,
        status: 'succeeded',
        taskId,
        manifestPath: job.manifestPath,
        outputs,
        manifestPatch: {
          provider: plan.provider,
          model: plan.model,
          status,
          jobId: job.jobId,
          taskId,
          manifestPath: job.manifestPath,
          outputPaths: outputs.map((output) => output.expectedPath),
          outputUrls: [videoUrl],
          usage: readObject(pollPayload, 'usage'),
          createdAt: readNumber(pollPayload, 'created_at'),
          updatedAt: readNumber(pollPayload, 'updated_at'),
          ratio: readString(pollPayload, 'ratio'),
          duration: readNumber(pollPayload, 'duration'),
          resolution: readString(pollPayload, 'resolution'),
          generateAudio: readBoolean(pollPayload, 'generate_audio'),
        },
        response: pollPayload,
        pollAttempts: attempt,
      };
    }

    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      const error = readObject(pollPayload, 'error');
      const message = readString(error, 'message') || `Seedance task ${taskId} ended with status ${status}.`;
      throw new Error(message);
    }

    if (attempt < maxPollAttempts) {
      await wait(pollIntervalMs);
    }
  }

  throw new Error(`Seedance task ${taskId} did not finish after ${maxPollAttempts} polling attempts.`);
}

export function createVolcengineOpenSpeechTtsPlan(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: VolcengineOpenSpeechTtsExecutionOptions
): ProviderExecutionPlan {
  ensureExecutableJob(job, contract, 'tts', 'tts_generation_adapter');

  const accessToken = resolveApiKey(
    options.apiKey,
    options.apiKeyEnvVar || DEFAULT_TTS_ACCESS_TOKEN_ENV_VAR
  );
  const model = options.voiceType;
  const baseUrl = normalizeBaseUrl(options.baseUrl || DEFAULT_TTS_BASE_URL);
  const body: Record<string, unknown> = {
    appid: options.appId,
    reqid: buildExecutionRequestId(job.jobId),
    text: options.text.trim(),
    format: options.audioFormat || DEFAULT_TTS_FORMAT,
    voice_type: options.voiceType,
    language: options.language || readStringInput(job, 'language'),
  };

  if (options.voice) {
    body.voice = options.voice;
  }
  if (typeof options.sampleRate === 'number') {
    body.sample_rate = options.sampleRate;
  }
  if (typeof options.volume === 'number') {
    body.volume = options.volume;
  }
  if (typeof options.speed === 'number') {
    body.speed = options.speed;
  }
  if (typeof options.pitch === 'number') {
    body.pitch = options.pitch;
  }
  if (typeof options.enableSubtitle === 'number') {
    body.enable_subtitle = options.enableSubtitle;
  }
  if (typeof options.sentenceInterval === 'number') {
    body.sentence_interval = options.sentenceInterval;
  }
  if (options.style) {
    body.style = options.style;
  }
  if (options.callbackUrl) {
    body.callback_url = options.callbackUrl;
  }

  const submitPath = options.emotionPrediction
    ? '/api/v1/tts_async_with_emotion/submit'
    : '/api/v1/tts_async/submit';
  const queryPath = options.emotionPrediction
    ? '/api/v1/tts_async_with_emotion/query'
    : '/api/v1/tts_async/query';

  return {
    provider: 'volcengine-openspeech-tts',
    model,
    jobId: job.jobId,
    adapterSlot: job.adapterSlot,
    request: {
      method: 'POST',
      url: `${baseUrl}${submitPath}`,
      headers: buildVolcengineSpeechHeaders(accessToken, options.resourceId),
      body: JSON.stringify(body),
    },
    poll: {
      method: 'GET',
      urlTemplate: `${baseUrl}${queryPath}?appid=${encodeURIComponent(options.appId)}&task_id={id}`,
      headers: buildVolcengineSpeechHeaders(accessToken, options.resourceId),
    },
    notes: [
      'Volcengine OpenSpeech long-text TTS is asynchronous: submit first, then poll for task_status until 1 or 2.',
      'audio_url values expire quickly and should be downloaded or copied to durable storage before later assembly.',
    ],
  };
}

export async function executeVolcengineOpenSpeechTts(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: VolcengineOpenSpeechTtsExecutionOptions
): Promise<ProviderExecutionResult> {
  assertVolcengineRuntimeEnvironmentReady({
    apiKeyEnvVar: options.apiKeyEnvVar || DEFAULT_TTS_ACCESS_TOKEN_ENV_VAR,
    explicitApiKey: options.apiKey,
  });
  const plan = createVolcengineOpenSpeechTtsPlan(job, contract, options);
  const transport = getTransport(options.transport);
  const createResponse = await transport(plan.request);
  const createPayload = ensureSuccessfulResponse(createResponse, `Volcengine TTS task creation for ${job.jobId}`);
  ensureSuccessfulProviderPayload(createPayload, `Volcengine TTS task creation for ${job.jobId}`);
  const taskId = readString(createPayload, 'task_id');

  if (!taskId) {
    throw new Error(`Volcengine TTS task creation for ${job.jobId} did not return a task_id.`);
  }

  const autoPoll = options.autoPoll ?? true;
  if (!autoPoll) {
    return {
      provider: plan.provider,
      model: plan.model,
      jobId: job.jobId,
      adapterSlot: job.adapterSlot,
      status: 'submitted',
      taskId,
      manifestPath: job.manifestPath,
      outputs: [],
      manifestPatch: {
        provider: plan.provider,
        model: plan.model,
        status: 'submitted',
        jobId: job.jobId,
        taskId,
        manifestPath: job.manifestPath,
        pollUrl: plan.poll?.urlTemplate.replace('{id}', taskId),
      },
      response: createPayload,
    };
  }

  const pollUrl = plan.poll?.urlTemplate.replace('{id}', taskId);
  if (!pollUrl || !plan.poll) {
    throw new Error(`Volcengine TTS plan for ${job.jobId} is missing polling metadata.`);
  }

  const maxPollAttempts = options.maxPollAttempts || DEFAULT_TTS_MAX_POLL_ATTEMPTS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_TTS_POLL_INTERVAL_MS;
  const wait = options.waiter || defaultWaiter;

  for (let attempt = 1; attempt <= maxPollAttempts; attempt += 1) {
    const pollResponse = await transport({
      method: plan.poll.method,
      url: pollUrl,
      headers: plan.poll.headers,
    });
    const pollPayload = ensureSuccessfulResponse(pollResponse, `Volcengine TTS task polling for ${job.jobId}`);
    ensureSuccessfulProviderPayload(pollPayload, `Volcengine TTS task polling for ${job.jobId}`);
    const taskStatus = readNumber(pollPayload, 'task_status');

    if (taskStatus === 1) {
      const audioUrl = readString(pollPayload, 'audio_url');
      if (!audioUrl) {
        throw new Error(`Volcengine TTS task ${taskId} succeeded without an audio_url.`);
      }

      const outputs: ProviderExecutionOutput[] = [
        {
          expectedPath: job.output.expectedPath,
          format: job.output.format,
          url: audioUrl,
        },
      ];

      return {
        provider: plan.provider,
        model: plan.model,
        jobId: job.jobId,
        adapterSlot: job.adapterSlot,
        status: 'succeeded',
        taskId,
        manifestPath: job.manifestPath,
        outputs,
        manifestPatch: {
          provider: plan.provider,
          model: plan.model,
          status: 'succeeded',
          jobId: job.jobId,
          taskId,
          manifestPath: job.manifestPath,
          outputPaths: outputs.map((output) => output.expectedPath),
          outputUrls: [audioUrl],
          textLength: readNumber(pollPayload, 'text_length'),
          urlExpireTime: readNumber(pollPayload, 'url_expire_time'),
          sentences: readArray(pollPayload, 'sentences'),
        },
        response: pollPayload,
        pollAttempts: attempt,
      };
    }

    if (taskStatus === 2) {
      const message = readString(pollPayload, 'message') || `Volcengine TTS task ${taskId} failed.`;
      throw new Error(message);
    }

    if (attempt < maxPollAttempts) {
      await wait(pollIntervalMs);
    }
  }

  throw new Error(`Volcengine TTS task ${taskId} did not finish after ${maxPollAttempts} polling attempts.`);
}

export function createCustomHttpSfxGenerationPlan(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: CustomHttpAudioExecutionOptions
): ProviderExecutionPlan {
  return createCustomHttpAudioPlan(
    job,
    contract,
    'sfx',
    'sfx_generation_adapter',
    'custom-http-sfx',
    options,
    DEFAULT_CUSTOM_SFX_API_KEY_ENV_VAR
  );
}

export async function executeCustomHttpSfxGeneration(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: CustomHttpAudioExecutionOptions
): Promise<ProviderExecutionResult> {
  return executeCustomHttpAudioGeneration(
    job,
    contract,
    'sfx',
    'sfx_generation_adapter',
    'custom-http-sfx',
    options,
    DEFAULT_CUSTOM_SFX_API_KEY_ENV_VAR
  );
}

export function createCustomHttpMusicGenerationPlan(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: CustomHttpAudioExecutionOptions
): ProviderExecutionPlan {
  return createCustomHttpAudioPlan(
    job,
    contract,
    'music',
    'music_generation_adapter',
    'custom-http-music',
    options,
    DEFAULT_CUSTOM_MUSIC_API_KEY_ENV_VAR
  );
}

export async function executeCustomHttpMusicGeneration(
  job: GenerationJobSpec,
  contract: ProviderContract,
  options: CustomHttpAudioExecutionOptions
): Promise<ProviderExecutionResult> {
  return executeCustomHttpAudioGeneration(
    job,
    contract,
    'music',
    'music_generation_adapter',
    'custom-http-music',
    options,
    DEFAULT_CUSTOM_MUSIC_API_KEY_ENV_VAR
  );
}

export function validateGenerationJobsAgainstContracts(
  jobs: GenerationJobSpec[],
  contracts: ProviderContract[]
): AdapterValidationResult {
  return mergeValidationResults(
    jobs.map((job) => {
      const contract = contracts.find(
        (candidate) =>
          candidate.kind === job.kind && candidate.adapterSlot === job.adapterSlot
      );

      if (!contract) {
        return {
          valid: false,
          issues: [
            issue(
              job.jobId,
              'missing_contract',
              `No provider contract found for ${job.kind}:${job.adapterSlot}`
            ),
          ],
        };
      }

      return validateGenerationJobAgainstContract(job, contract);
    })
  );
}

export function validateGenerationJobAgainstContract(
  job: GenerationJobSpec,
  contract: ProviderContract
): AdapterValidationResult {
  const issues: AdapterValidationIssue[] = [];

  if (job.provider !== 'unassigned') {
    issues.push(
      issue(job.jobId, 'provider_bound', 'MVP jobs must keep provider as unassigned')
    );
  }

  if (job.kind !== contract.kind) {
    issues.push(
      issue(
        job.jobId,
        'kind_mismatch',
        `Job kind ${job.kind} does not match contract kind ${contract.kind}`
      )
    );
  }

  if (job.adapterSlot !== contract.adapterSlot) {
    issues.push(
      issue(
        job.jobId,
        'adapter_slot_mismatch',
        `Job adapter slot ${job.adapterSlot} does not match contract slot ${contract.adapterSlot}`
      )
    );
  }

  contract.requiredFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(job.input, field)) {
      issues.push(
        issue(job.jobId, 'missing_required_field', `Missing input field: ${field}`)
      );
    }
  });

  const forbiddenFields = uniqueStrings([
    ...DEFAULT_FORBIDDEN_FIELD_NAMES,
    ...contract.forbiddenFields,
  ]);
  const forbiddenHits = findForbiddenKeys(job, forbiddenFields);
  forbiddenHits.forEach((fieldPath) => {
    issues.push(
      issue(job.jobId, 'forbidden_field', `Forbidden field present: ${fieldPath}`)
    );
  });

  const privatePathHits = findPrivatePathValues(job);
  privatePathHits.forEach((fieldPath) => {
    issues.push(
      issue(job.jobId, 'private_path', `Private local path present: ${fieldPath}`)
    );
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

function mergeValidationResults(
  results: AdapterValidationResult[]
): AdapterValidationResult {
  const issues = results.flatMap((result) => result.issues);

  return {
    valid: issues.length === 0,
    issues,
  };
}

function findForbiddenKeys(value: unknown, forbiddenFields: string[]): string[] {
  const forbidden = new Set(forbiddenFields.map(normalizeFieldName));
  const hits: string[] = [];
  visit(value, [], (path, entry) => {
    if (path.length === 0) {
      return;
    }

    const fieldName = path[path.length - 1];
    if (forbidden.has(normalizeFieldName(fieldName))) {
      hits.push(path.join('.'));
    }

    if (typeof entry === 'string' && looksLikeSecret(entry)) {
      hits.push(path.join('.'));
    }
  });

  return uniqueStrings(hits);
}

function findPrivatePathValues(value: unknown): string[] {
  const hits: string[] = [];
  visit(value, [], (path, entry) => {
    if (typeof entry === 'string' && looksLikePrivatePath(entry)) {
      hits.push(path.join('.'));
    }
  });

  return uniqueStrings(hits);
}

function visit(
  value: unknown,
  path: string[],
  visitor: (path: string[], value: unknown) => void
): void {
  visitor(path, value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => visit(entry, [...path, String(index)], visitor));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      visit(entry, [...path, key], visitor);
    });
  }
}

function normalizeFieldName(value: string): string {
  return value.replace(/[-_]/g, '').toLowerCase();
}

function looksLikeSecret(value: string): boolean {
  return /(?:api[_-]?key|bearer\s+|secret|token=|password=)/i.test(value);
}

function looksLikePrivatePath(value: string): boolean {
  return /^\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(value);
}

function issue(
  jobId: string,
  code: AdapterValidationIssue['code'],
  message: string
): AdapterValidationIssue {
  return { jobId, code, message };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function hasBuiltInRuntime(contract: ProviderContract): boolean {
  return contract.recommendedProviders.some(
    (provider) => BUILT_IN_PROVIDER_SLOTS[provider as BuiltInProvider] === contract.adapterSlot
  );
}

function ensureExecutableJob(
  job: GenerationJobSpec,
  contract: ProviderContract,
  expectedKind: ProviderContract['kind'],
  expectedAdapterSlot: string
): void {
  const validation = validateGenerationJobAgainstContract(job, contract);
  if (!validation.valid) {
    throw new Error(
      `Cannot execute ${job.jobId}: ${validation.issues.map((issueItem) => issueItem.message).join('; ')}`
    );
  }

  if (job.kind !== expectedKind || job.adapterSlot !== expectedAdapterSlot) {
    throw new Error(
      `Job ${job.jobId} must be ${expectedKind}:${expectedAdapterSlot}, received ${job.kind}:${job.adapterSlot}.`
    );
  }
}

function resolveApiKey(apiKey?: string, envVar = 'ARK_API_KEY'): string {
  return resolveVolcengineRuntimeApiKey(apiKey, { apiKeyEnvVar: envVar });
}

function normalizeBaseUrl(baseUrl?: string): string {
  const resolved = (baseUrl || DEFAULT_VOLCENGINE_BASE_URL).trim();
  return resolved.endsWith('/') ? resolved.slice(0, -1) : resolved;
}

function buildJsonHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

function buildVolcengineSpeechHeaders(
  accessToken: string,
  resourceId: string
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer;${accessToken}`,
    'Resource-Id': resourceId,
  };
}

function buildCustomHttpAudioHeaders(
  apiKey: string,
  options: CustomHttpAudioExecutionOptions
): Record<string, string> {
  const authHeaderName = options.authHeaderName || 'Authorization';
  const authValue = options.authScheme === 'plain' ? apiKey : `Bearer ${apiKey}`;
  return {
    'Content-Type': 'application/json',
    [authHeaderName]: authValue,
  };
}

function getTransport(transport?: AdapterTransport): AdapterTransport {
  return transport || defaultTransport;
}

async function defaultTransport(
  request: AdapterHttpRequest
): Promise<AdapterHttpResponse> {
  const fetchLike = (globalThis as {
    fetch?: (
      input: string,
      init?: { method?: string; headers?: Record<string, string>; body?: string }
    ) => Promise<{
      ok: boolean;
      status: number;
      text: () => Promise<string>;
    }>;
  }).fetch;

  if (!fetchLike) {
    throw new Error('No adapter transport provided and global fetch is unavailable.');
  }

  const response = await fetchLike(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  const rawText = await response.text();
  let json: unknown = {};
  if (rawText) {
    json = tryParseJson(rawText);
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
  };
}

function ensureSuccessfulResponse(
  response: AdapterHttpResponse,
  context: string
): Record<string, unknown> {
  const payload = asRecord(response.json);
  if (!response.ok) {
    const error = readObject(payload, 'error');
    const message = readString(error, 'message') || `${context} failed with status ${response.status}.`;
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `${context} failed with status ${response.status}. Check ARK_API_KEY in process.env or .env before running. Without a valid API key the provider flow cannot run.${message ? ` Provider message: ${message}` : ''}`
      );
    }
    throw new Error(message);
  }

  return payload;
}

function buildImageOutput(
  job: GenerationJobSpec,
  entry: unknown,
  index: number,
  total: number
): ProviderExecutionOutput {
  const outputRecord = asRecord(entry);

  return {
    expectedPath: deriveExpectedPath(job.output.expectedPath, index, total),
    format: job.output.format,
    url: readString(outputRecord, 'url'),
    b64Json: readString(outputRecord, 'b64_json'),
    size: readString(outputRecord, 'size'),
  };
}

function deriveExpectedPath(basePath: string, index: number, total: number): string {
  if (total <= 1 || index === 0) {
    return basePath;
  }

  const extensionIndex = basePath.lastIndexOf('.');
  if (extensionIndex < 0) {
    return `${basePath}-${index + 1}`;
  }

  return `${basePath.slice(0, extensionIndex)}-${index + 1}${basePath.slice(extensionIndex)}`;
}

function suggestVolcengineImageSize(aspectRatio?: string): string {
  switch (aspectRatio) {
    case '1:1':
      return '2048x2048';
    case '4:3':
      return '2304x1728';
    case '3:4':
      return '1728x2304';
    case '16:9':
      return '2848x1600';
    case '9:16':
      return '1600x2848';
    case '21:9':
      return '3136x1344';
    default:
      return '2K';
  }
}

function buildSeedanceContent(
  options: VolcengineSeedanceExecutionOptions
): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [];
  if (options.prompt && options.prompt.trim()) {
    content.push({
      type: 'text',
      text: options.prompt.trim(),
    });
  }

  normalizeVideoImages(options.images).forEach((image, index) => {
    const inferredRole = image.role || (index === 0 ? 'first_frame' : 'reference_image');
    content.push({
      type: 'image_url',
      image_url: { url: image.url },
      role: inferredRole,
    });
  });

  normalizeVideoVideos(options.videos).forEach((video) => {
    content.push({
      type: 'video_url',
      video_url: { url: video.url },
      role: video.role || 'reference_video',
    });
  });

  normalizeVideoAudios(options.audios).forEach((audio) => {
    content.push({
      type: 'audio_url',
      audio_url: { url: audio.url },
      role: audio.role || 'reference_audio',
    });
  });

  return content;
}

function normalizeVideoImages(
  images?: Array<string | VolcengineVideoImageInput>
): VolcengineVideoImageInput[] {
  return (images || []).map((image) =>
    typeof image === 'string' ? { url: image } : image
  );
}

function normalizeVideoVideos(
  videos?: Array<string | VolcengineVideoVideoInput>
): VolcengineVideoVideoInput[] {
  return (videos || []).map((video) =>
    typeof video === 'string' ? { url: video } : video
  );
}

function normalizeVideoAudios(
  audios?: Array<string | VolcengineVideoAudioInput>
): VolcengineVideoAudioInput[] {
  return (audios || []).map((audio) =>
    typeof audio === 'string' ? { url: audio } : audio
  );
}

function normalizeVideoRatio(ratio?: string): string {
  if (
    ratio === '16:9' ||
    ratio === '4:3' ||
    ratio === '1:1' ||
    ratio === '3:4' ||
    ratio === '9:16' ||
    ratio === '21:9' ||
    ratio === 'adaptive'
  ) {
    return ratio;
  }

  return DEFAULT_VIDEO_RATIO;
}

function readStringInput(job: GenerationJobSpec, key: string): string | undefined {
  const value = job.input[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readNumberInput(job: GenerationJobSpec, key: string): number | undefined {
  const value = job.input[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readObject(
  value: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  return asRecord(value[key]);
}

function readArray(
  value: Record<string, unknown>,
  key: string
): unknown[] {
  return Array.isArray(value[key]) ? (value[key] as unknown[]) : [];
}

function readString(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined;
}

function readNumber(
  value: Record<string, unknown>,
  key: string
): number | undefined {
  const candidate = value[key];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined;
}

function readBoolean(
  value: Record<string, unknown>,
  key: string
): boolean | undefined {
  const candidate = value[key];
  return typeof candidate === 'boolean' ? candidate : undefined;
}

function readNestedString(
  value: Record<string, unknown>,
  path: string[]
): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    current = asRecord(current)[key];
  }

  return typeof current === 'string' && current.length > 0 ? current : undefined;
}

function ensureSuccessfulProviderPayload(
  payload: Record<string, unknown>,
  context: string
): void {
  const code = readNumber(payload, 'code');
  if (typeof code === 'number' && code !== 0) {
    const message = readString(payload, 'message') || `${context} failed with code ${code}.`;
    throw new Error(message);
  }
}

function createCustomHttpAudioPlan(
  job: GenerationJobSpec,
  contract: ProviderContract,
  expectedKind: ProviderContract['kind'],
  expectedAdapterSlot: string,
  provider: BuiltInProvider,
  options: CustomHttpAudioExecutionOptions,
  defaultEnvVar: string
): ProviderExecutionPlan {
  ensureExecutableJob(job, contract, expectedKind, expectedAdapterSlot);

  const apiKey = resolveApiKey(options.apiKey, options.apiKeyEnvVar || defaultEnvVar);
  const body: Record<string, unknown> = {
    model: options.model,
    prompt: options.prompt.trim(),
    format: options.format || job.output.format,
    duration_seconds: options.durationSeconds,
    ...(options.requestBody || {}),
  };

  return {
    provider,
    model: options.model,
    jobId: job.jobId,
    adapterSlot: job.adapterSlot,
    request: {
      method: 'POST',
      url: options.submitUrl,
      headers: buildCustomHttpAudioHeaders(apiKey, options),
      body: JSON.stringify(stripUndefinedFields(body)),
    },
    poll: {
      method: 'GET',
      urlTemplate: options.queryUrlTemplate,
      headers: buildCustomHttpAudioHeaders(apiKey, options),
    },
    notes: [
      'Custom HTTP audio generation is modeled as an async submit-and-poll flow.',
      'Confirm the provider returns an id/task_id and an audio_url-compatible field before enabling unattended execution.',
    ],
  };
}

async function executeCustomHttpAudioGeneration(
  job: GenerationJobSpec,
  contract: ProviderContract,
  expectedKind: ProviderContract['kind'],
  expectedAdapterSlot: string,
  provider: BuiltInProvider,
  options: CustomHttpAudioExecutionOptions,
  defaultEnvVar: string
): Promise<ProviderExecutionResult> {
  assertVolcengineRuntimeEnvironmentReady({
    apiKeyEnvVar: options.apiKeyEnvVar || defaultEnvVar,
    explicitApiKey: options.apiKey,
  });

  const plan = createCustomHttpAudioPlan(
    job,
    contract,
    expectedKind,
    expectedAdapterSlot,
    provider,
    options,
    defaultEnvVar
  );
  const transport = getTransport(options.transport);
  const createResponse = await transport(plan.request);
  const createPayload = ensureSuccessfulResponse(createResponse, `Audio task creation for ${job.jobId}`);
  ensureSuccessfulProviderPayload(createPayload, `Audio task creation for ${job.jobId}`);
  const taskId = readString(createPayload, 'task_id') || readString(createPayload, 'id');

  if (!taskId) {
    throw new Error(`Audio task creation for ${job.jobId} did not return an id or task_id.`);
  }

  const autoPoll = options.autoPoll ?? true;
  if (!autoPoll) {
    return {
      provider: plan.provider,
      model: plan.model,
      jobId: job.jobId,
      adapterSlot: job.adapterSlot,
      status: 'submitted',
      taskId,
      manifestPath: job.manifestPath,
      outputs: [],
      manifestPatch: {
        provider: plan.provider,
        model: plan.model,
        status: 'submitted',
        jobId: job.jobId,
        taskId,
        manifestPath: job.manifestPath,
        pollUrl: plan.poll?.urlTemplate.replace('{id}', taskId),
      },
      response: createPayload,
    };
  }

  const pollUrl = plan.poll?.urlTemplate.replace('{id}', taskId);
  if (!pollUrl || !plan.poll) {
    throw new Error(`Audio plan for ${job.jobId} is missing polling metadata.`);
  }

  const maxPollAttempts = options.maxPollAttempts || DEFAULT_CUSTOM_AUDIO_MAX_POLL_ATTEMPTS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_CUSTOM_AUDIO_POLL_INTERVAL_MS;
  const wait = options.waiter || defaultWaiter;

  for (let attempt = 1; attempt <= maxPollAttempts; attempt += 1) {
    const pollResponse = await transport({
      method: plan.poll.method,
      url: pollUrl,
      headers: plan.poll.headers,
    });
    const pollPayload = ensureSuccessfulResponse(pollResponse, `Audio task polling for ${job.jobId}`);
    ensureSuccessfulProviderPayload(pollPayload, `Audio task polling for ${job.jobId}`);
    const status = readString(pollPayload, 'status') || readNumber(pollPayload, 'task_status');

    if (status === 'succeeded' || status === 'success' || status === 1) {
      const audioUrl =
        readString(pollPayload, 'audio_url') ||
        readNestedString(pollPayload, ['content', 'audio_url']) ||
        readNestedString(pollPayload, ['output', 'audio_url']) ||
        readNestedString(pollPayload, ['result', 'audio_url']);
      if (!audioUrl) {
        throw new Error(`Audio task ${taskId} succeeded without an audio_url.`);
      }

      const outputs: ProviderExecutionOutput[] = [
        {
          expectedPath: job.output.expectedPath,
          format: job.output.format,
          url: audioUrl,
        },
      ];

      return {
        provider: plan.provider,
        model: plan.model,
        jobId: job.jobId,
        adapterSlot: job.adapterSlot,
        status: 'succeeded',
        taskId,
        manifestPath: job.manifestPath,
        outputs,
        manifestPatch: {
          provider: plan.provider,
          model: plan.model,
          status: 'succeeded',
          jobId: job.jobId,
          taskId,
          manifestPath: job.manifestPath,
          outputPaths: outputs.map((output) => output.expectedPath),
          outputUrls: [audioUrl],
        },
        response: pollPayload,
        pollAttempts: attempt,
      };
    }

    if (status === 'failed' || status === 'cancelled' || status === 'expired' || status === 2) {
      const message = readString(pollPayload, 'message') || `Audio task ${taskId} ended with status ${String(status)}.`;
      throw new Error(message);
    }

    if (attempt < maxPollAttempts) {
      await wait(pollIntervalMs);
    }
  }

  throw new Error(`Audio task ${taskId} did not finish after ${maxPollAttempts} polling attempts.`);
}

function buildExecutionRequestId(jobId: string): string {
  const base = jobId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const padded = `${base}requestidstage`;
  return padded.slice(0, Math.max(20, Math.min(64, padded.length)));
}

function stripUndefinedFields(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry !== 'undefined')
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return { rawText: value };
  }
}

async function defaultWaiter(ms: number): Promise<void> {
  const timeoutLike = (globalThis as {
    setTimeout?: (callback: () => void, timeout?: number) => unknown;
  }).setTimeout;

  if (!timeoutLike || ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    timeoutLike(() => resolve(), ms);
  });
}
