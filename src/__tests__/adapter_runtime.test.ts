import {
  buildAnimeDramaWorkflow,
  createAdapterRegistry,
  createCustomHttpSfxGenerationPlan,
  createVolcengineImageGenerationPlan,
  createVolcengineOpenSpeechTtsPlan,
  createVolcengineSeedanceVideoPlan,
  executeCustomHttpMusicGeneration,
  executeCustomHttpSfxGeneration,
  executeVolcengineImageGeneration,
  executeVolcengineOpenSpeechTts,
  executeVolcengineSeedanceVideoGeneration,
  GenerationJobSpec,
  ProviderContract,
} from '../index';

describe('built-in provider adapter runtimes', () => {
  it('marks built-in volcengine adapters as available in the registry', () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '雨夜里的猫耳侦探要在 15 秒内找回会说话的耳机。',
    });

    const registry = createAdapterRegistry(blueprint.providerContracts);

    expect(registry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adapterSlot: 'image_generation_adapter',
          status: 'available',
          recommendedProviders: ['volcengine-seedream'],
        }),
        expect.objectContaining({
          adapterSlot: 'video_generation_adapter',
          status: 'available',
          recommendedProviders: ['volcengine-seedance'],
        }),
      ])
    );

    expect(
      registry.filter((entry) =>
        ['tts_generation_adapter', 'sfx_generation_adapter', 'music_generation_adapter'].includes(
          entry.adapterSlot
        )
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adapterSlot: 'tts_generation_adapter',
          status: 'available',
          recommendedProviders: ['volcengine-openspeech-tts'],
        }),
        expect.objectContaining({
          adapterSlot: 'sfx_generation_adapter',
          status: 'available',
          recommendedProviders: ['custom-http-sfx'],
        }),
        expect.objectContaining({
          adapterSlot: 'music_generation_adapter',
          status: 'available',
          recommendedProviders: ['custom-http-music'],
        }),
      ])
    );
  });

  it('builds a Volcengine image generation request from a provider-neutral job', () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '便利店橱窗里的耳机忽然开口喊出主角的名字。',
    });
    const job = findJob(blueprint.generationJobs, 'job-image-character-anchor');
    const contract = findContract(blueprint.providerContracts, 'image_generation_adapter');

    const plan = createVolcengineImageGenerationPlan(job, contract, {
      apiKey: 'test-key',
      prompt: '猫耳侦探在暴雨夜回头，耳机在霓虹里发光。',
      outputFormat: 'png',
    });

    expect(plan.provider).toBe('volcengine-seedream');
    expect(plan.request.url).toBe('https://ark.cn-beijing.volces.com/api/v3/images/generations');
    expect(plan.request.headers.Authorization).toBe('Bearer test-key');

    const body = JSON.parse(plan.request.body || '{}');
    expect(body.model).toBe('doubao-seedream-5-0-260128');
    expect(body.prompt).toContain('猫耳侦探');
    expect(body.size).toBe('1600x2848');
    expect(body.output_format).toBe('png');
    expect(body.response_format).toBe('url');
    expect(body.watermark).toBe(false);
  });

  it('executes a Volcengine image generation call with mocked transport', async () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '地铁站灯箱里浮出昨夜消失的耳机轮廓。',
    });
    const job = findJob(blueprint.generationJobs, 'job-image-scene-hook');
    const contract = findContract(blueprint.providerContracts, 'image_generation_adapter');

    const result = await executeVolcengineImageGeneration(job, contract, {
      apiKey: 'test-key',
      prompt: '竖屏霓虹地铁站，耳机轮廓悬浮在灯箱里。',
      transport: async () => ({
        status: 200,
        ok: true,
        json: {
          model: 'doubao-seedream-5-0-260128',
          created: 1777777777,
          data: [
            {
              url: 'https://example.com/generated-shot-001.png',
              size: '1600x2848',
            },
          ],
          usage: {
            generated_images: 1,
            total_tokens: 1234,
          },
        },
      }),
    });

    expect(result.status).toBe('succeeded');
    expect(result.outputs[0]).toEqual(
      expect.objectContaining({
        expectedPath: 'anime/assets/images/episode-001/shot-001-open-hook.png',
        url: 'https://example.com/generated-shot-001.png',
      })
    );
    expect(result.manifestPatch).toEqual(
      expect.objectContaining({
        provider: 'volcengine-seedream',
        status: 'succeeded',
      })
    );
  });

  it('surfaces an actionable error when ARK_API_KEY is rejected by Volcengine', async () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '坏掉的耳机在凌晨三点开始回放未来的证词。',
    });
    const job = findJob(blueprint.generationJobs, 'job-image-character-anchor');
    const contract = findContract(blueprint.providerContracts, 'image_generation_adapter');

    await expect(
      executeVolcengineImageGeneration(job, contract, {
        apiKey: 'bad-key',
        prompt: '雨夜便利店，猫耳侦探第一次听见耳机说话。',
        transport: async () => ({
          status: 401,
          ok: false,
          json: {
            error: {
              message: 'Unauthorized',
            },
          },
        }),
      })
    ).rejects.toThrow(/ARK_API_KEY/);
  });

  it('refuses to enter image execution when the runtime preflight fails', async () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '耳机遗失案的证词在暴雨里被雨声盖住。',
    });
    const job = findJob(blueprint.generationJobs, 'job-image-character-anchor');
    const contract = findContract(blueprint.providerContracts, 'image_generation_adapter');
    let transportCalled = false;

    await expect(
      executeVolcengineImageGeneration(job, contract, {
        prompt: '暴雨夜的便利店门口，主角第一次迟疑要不要进门。',
        apiKeyEnvVar: 'ARK_API_KEY_DOES_NOT_EXIST_FOR_TEST',
        transport: async () => {
          transportCalled = true;
          return {
            status: 200,
            ok: true,
            json: {},
          };
        },
      })
    ).rejects.toThrow(/Without a valid API key the provider flow cannot run/);

    expect(transportCalled).toBe(false);
  });

  it('builds a Seedance task request from a provider-neutral video job', () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '主角在最后一秒发现失踪的人其实是自己。',
    });
    const job = findJob(blueprint.generationJobs, 'job-video-episode-001');
    const contract = findContract(blueprint.providerContracts, 'video_generation_adapter');

    const plan = createVolcengineSeedanceVideoPlan(job, contract, {
      apiKey: 'test-key',
      prompt: '15 秒竖屏悬疑漫剧，最后一句反转台词要精准落在结尾。',
      images: ['https://example.com/first-frame.png'],
      generateAudio: true,
    });

    expect(plan.provider).toBe('volcengine-seedance');
    expect(plan.request.url).toBe('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks');
    expect(plan.poll?.urlTemplate).toBe(
      'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{id}'
    );

    const body = JSON.parse(plan.request.body || '{}');
    expect(body.model).toBe('doubao-seedance-2-0-260128');
    expect(body.duration).toBe(15);
    expect(body.ratio).toBe('9:16');
    expect(body.resolution).toBe('720p');
    expect(body.generate_audio).toBe(true);
    expect(body.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text' }),
        expect.objectContaining({
          type: 'image_url',
          role: 'first_frame',
        }),
      ])
    );
  });

  it('submits and polls a Seedance task with mocked transport', async () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '雨夜追逐到尽头时，耳机说出真正的失踪者。',
    });
    const job = findJob(blueprint.generationJobs, 'job-video-episode-001');
    const contract = findContract(blueprint.providerContracts, 'video_generation_adapter');
    let pollCount = 0;

    const result = await executeVolcengineSeedanceVideoGeneration(job, contract, {
      apiKey: 'test-key',
      prompt: '15 秒竖屏追逐悬疑漫剧，尾声突然反转。',
      images: ['https://example.com/first-frame.png'],
      autoPoll: true,
      pollIntervalMs: 0,
      maxPollAttempts: 3,
      waiter: async () => undefined,
      transport: async (request) => {
        if (request.method === 'POST') {
          return {
            status: 200,
            ok: true,
            json: { id: 'cgt-123456' },
          };
        }

        pollCount += 1;
        if (pollCount === 1) {
          return {
            status: 200,
            ok: true,
            json: { id: 'cgt-123456', status: 'running' },
          };
        }

        return {
          status: 200,
          ok: true,
          json: {
            id: 'cgt-123456',
            model: 'doubao-seedance-2-0-260128',
            status: 'succeeded',
            content: {
              video_url: 'https://example.com/final-episode-001.mp4',
            },
            usage: {
              completion_tokens: 9999,
              total_tokens: 9999,
            },
            created_at: 1777777777,
            updated_at: 1777777788,
            ratio: '9:16',
            duration: 15,
            resolution: '720p',
            generate_audio: false,
          },
        };
      },
    });

    expect(result.status).toBe('succeeded');
    expect(result.taskId).toBe('cgt-123456');
    expect(result.outputs[0]).toEqual(
      expect.objectContaining({
        expectedPath: 'anime/final/episode-001.mp4',
        url: 'https://example.com/final-episode-001.mp4',
      })
    );
    expect(result.pollAttempts).toBe(2);
    expect(result.manifestPatch).toEqual(
      expect.objectContaining({
        provider: 'volcengine-seedance',
        status: 'succeeded',
      })
    );
  });

  it('refuses to enter video execution when the runtime preflight fails', async () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '最后一秒的反转台词因为缺失 key 根本不该发起任务。',
    });
    const job = findJob(blueprint.generationJobs, 'job-video-episode-001');
    const contract = findContract(blueprint.providerContracts, 'video_generation_adapter');
    let transportCalled = false;

    await expect(
      executeVolcengineSeedanceVideoGeneration(job, contract, {
        prompt: '15 秒竖屏悬疑反转，结尾定格在耳机说真话的那一帧。',
        images: ['https://example.com/first-frame.png'],
        apiKeyEnvVar: 'ARK_API_KEY_DOES_NOT_EXIST_FOR_TEST',
        transport: async () => {
          transportCalled = true;
          return {
            status: 200,
            ok: true,
            json: {},
          };
        },
      })
    ).rejects.toThrow(/Without a valid API key the provider flow cannot run/);

    expect(transportCalled).toBe(false);
  });

  it('builds a Volcengine OpenSpeech TTS task request from a provider-neutral job', () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '耳机在雨夜里把证词轻轻读给主角听。',
    });
    const job = findJob(blueprint.generationJobs, 'job-tts-dialogue-episode-001');
    const contract = findContract(blueprint.providerContracts, 'tts_generation_adapter');

    const plan = createVolcengineOpenSpeechTtsPlan(job, contract, {
      apiKey: 'tts-token',
      appId: 'app-123',
      resourceId: 'resource-456',
      voiceType: 'BV001_streaming',
      text: '别找耳机了，昨晚失踪的人其实是你。',
      enableSubtitle: 1,
      audioFormat: 'mp3',
    });

    expect(plan.provider).toBe('volcengine-openspeech-tts');
    expect(plan.request.url).toBe('https://openspeech.bytedance.com/api/v1/tts_async/submit');
    expect(plan.poll?.urlTemplate).toBe(
      'https://openspeech.bytedance.com/api/v1/tts_async/query?appid=app-123&task_id={id}'
    );
    expect(plan.request.headers.Authorization).toBe('Bearer;tts-token');
    expect(plan.request.headers['Resource-Id']).toBe('resource-456');

    const body = JSON.parse(plan.request.body || '{}');
    expect(body.appid).toBe('app-123');
    expect(body.voice_type).toBe('BV001_streaming');
    expect(body.language).toBe('zh-CN');
    expect(body.enable_subtitle).toBe(1);
  });

  it('submits and polls a Volcengine OpenSpeech TTS task with mocked transport', async () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '消失的耳机决定用自己的声音作证。',
    });
    const job = findJob(blueprint.generationJobs, 'job-tts-dialogue-episode-001');
    const contract = findContract(blueprint.providerContracts, 'tts_generation_adapter');
    let pollCount = 0;

    const result = await executeVolcengineOpenSpeechTts(job, contract, {
      apiKey: 'tts-token',
      appId: 'app-123',
      resourceId: 'resource-456',
      voiceType: 'BV001_streaming',
      text: '它不是失踪，是在躲我。',
      pollIntervalMs: 0,
      maxPollAttempts: 3,
      waiter: async () => undefined,
      transport: async (request) => {
        if (request.method === 'POST') {
          return {
            status: 200,
            ok: true,
            json: { task_id: 'tts-123', task_status: 0 },
          };
        }

        pollCount += 1;
        if (pollCount === 1) {
          return {
            status: 200,
            ok: true,
            json: { task_id: 'tts-123', task_status: 0 },
          };
        }

        return {
          status: 200,
          ok: true,
          json: {
            task_id: 'tts-123',
            task_status: 1,
            text_length: 11,
            audio_url: 'https://example.com/dialogue-main.mp3',
            url_expire_time: 1777778888,
            sentences: [
              {
                text: '它不是失踪，是在躲我。',
                begin_time: 0,
                end_time: 2110,
              },
            ],
          },
        };
      },
    });

    expect(result.status).toBe('succeeded');
    expect(result.taskId).toBe('tts-123');
    expect(result.outputs[0]).toEqual(
      expect.objectContaining({
        expectedPath: 'anime/assets/audio/episode-001/dialogue/dialogue-main.mp3',
        url: 'https://example.com/dialogue-main.mp3',
      })
    );
    expect(result.pollAttempts).toBe(2);
  });

  it('refuses to enter TTS execution when the runtime preflight fails', async () => {
    const blueprint = buildAnimeDramaWorkflow({
      premise: '没有 token 的情况下，不该真的开始配音。',
    });
    const job = findJob(blueprint.generationJobs, 'job-tts-dialogue-episode-001');
    const contract = findContract(blueprint.providerContracts, 'tts_generation_adapter');
    let transportCalled = false;

    await expect(
      executeVolcengineOpenSpeechTts(job, contract, {
        appId: 'app-123',
        resourceId: 'resource-456',
        voiceType: 'BV001_streaming',
        text: '它真的认识我。',
        apiKeyEnvVar: 'VOLCENGINE_TTS_ACCESS_TOKEN_DOES_NOT_EXIST_FOR_TEST',
        transport: async () => {
          transportCalled = true;
          return {
            status: 200,
            ok: true,
            json: {},
          };
        },
      })
    ).rejects.toThrow(/Without a valid API key the provider flow cannot run/);

    expect(transportCalled).toBe(false);
  });

  it('builds a custom HTTP SFX task request from a provider-neutral job', () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '雨滴、脚步和门铃都要被精确还原。' });
    const job = findJob(blueprint.generationJobs, 'job-sfx-episode-001');
    const contract = findContract(blueprint.providerContracts, 'sfx_generation_adapter');

    const plan = createCustomHttpSfxGenerationPlan(job, contract, {
      provider: 'custom-http-sfx',
      apiKey: 'sfx-key',
      submitUrl: 'https://audio.example.com/sfx/tasks',
      queryUrlTemplate: 'https://audio.example.com/sfx/tasks/{id}',
      model: 'sfx-v1',
      prompt: 'heavy rain footsteps on wet concrete',
      durationSeconds: 5,
      requestBody: {
        preset: 'noir',
      },
    });

    expect(plan.provider).toBe('custom-http-sfx');
    expect(plan.request.url).toBe('https://audio.example.com/sfx/tasks');
    expect(plan.request.headers.Authorization).toBe('Bearer sfx-key');

    const body = JSON.parse(plan.request.body || '{}');
    expect(body.model).toBe('sfx-v1');
    expect(body.prompt).toContain('rain footsteps');
    expect(body.duration_seconds).toBe(5);
    expect(body.preset).toBe('noir');
  });

  it('submits and polls a custom HTTP SFX task with mocked transport', async () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '雨夜巷口的所有环境声都需要单独出 stem。' });
    const job = findJob(blueprint.generationJobs, 'job-sfx-episode-001');
    const contract = findContract(blueprint.providerContracts, 'sfx_generation_adapter');

    const result = await executeCustomHttpSfxGeneration(job, contract, {
      provider: 'custom-http-sfx',
      apiKey: 'sfx-key',
      submitUrl: 'https://audio.example.com/sfx/tasks',
      queryUrlTemplate: 'https://audio.example.com/sfx/tasks/{id}',
      model: 'sfx-v1',
      prompt: 'heavy rain footsteps on wet concrete',
      pollIntervalMs: 0,
      maxPollAttempts: 2,
      waiter: async () => undefined,
      transport: async (request) => {
        if (request.method === 'POST') {
          return {
            status: 200,
            ok: true,
            json: { id: 'sfx-123' },
          };
        }

        return {
          status: 200,
          ok: true,
          json: {
            id: 'sfx-123',
            status: 'succeeded',
            audio_url: 'https://example.com/sfx-main.wav',
          },
        };
      },
    });

    expect(result.status).toBe('succeeded');
    expect(result.outputs[0]).toEqual(
      expect.objectContaining({
        expectedPath: 'anime/assets/audio/episode-001/sfx/sfx-main.wav',
        url: 'https://example.com/sfx-main.wav',
      })
    );
  });

  it('submits and polls a custom HTTP music task with mocked transport', async () => {
    const blueprint = buildAnimeDramaWorkflow({ premise: '片尾需要一段能撑住反转的短配乐。' });
    const job = findJob(blueprint.generationJobs, 'job-music-episode-001');
    const contract = findContract(blueprint.providerContracts, 'music_generation_adapter');

    const result = await executeCustomHttpMusicGeneration(job, contract, {
      provider: 'custom-http-music',
      apiKey: 'music-key',
      submitUrl: 'https://audio.example.com/music/tasks',
      queryUrlTemplate: 'https://audio.example.com/music/tasks/{id}',
      model: 'music-v2',
      prompt: 'tense noir vertical-short ending score',
      format: 'wav',
      pollIntervalMs: 0,
      maxPollAttempts: 2,
      waiter: async () => undefined,
      transport: async (request) => {
        if (request.method === 'POST') {
          return {
            status: 200,
            ok: true,
            json: { task_id: 'music-123' },
          };
        }

        return {
          status: 200,
          ok: true,
          json: {
            task_id: 'music-123',
            task_status: 1,
            content: {
              audio_url: 'https://example.com/music-main.wav',
            },
          },
        };
      },
    });

    expect(result.status).toBe('succeeded');
    expect(result.outputs[0]).toEqual(
      expect.objectContaining({
        expectedPath: 'anime/assets/audio/episode-001/music/music-main.wav',
        url: 'https://example.com/music-main.wav',
      })
    );
  });
});

function findContract(
  contracts: ProviderContract[],
  adapterSlot: string
): ProviderContract {
  const contract = contracts.find((item) => item.adapterSlot === adapterSlot);
  if (!contract) {
    throw new Error(`Missing contract for ${adapterSlot}`);
  }

  return contract;
}

function findJob(
  jobs: GenerationJobSpec[],
  jobId: string
): GenerationJobSpec {
  const job = jobs.find((item) => item.jobId === jobId);
  if (!job) {
    throw new Error(`Missing job for ${jobId}`);
  }

  return job;
}