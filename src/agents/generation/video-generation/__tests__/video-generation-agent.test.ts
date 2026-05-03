import { executeGenerationAgentCli } from '../../shared/cli';
import { videoGenerationAgent } from '..';

describe('videoGenerationAgent', () => {
  it('declares the expected visual handoff contract', () => {
    expect(videoGenerationAgent.spec.protocol.collaborative.requiredArtifacts.map((artifact) => artifact.path)).toEqual([
      'artifact:video-shot-plan',
      'artifact:image-manifest',
    ]);
    expect(videoGenerationAgent.spec.protocol.collaborative.optionalArtifacts[0]?.path).toBe(
      'artifact:audio-manifest'
    );
  });

  it('runs the built-in example through the direct CLI shape', () => {
    const execution = executeGenerationAgentCli(['--example'], 'video-generation');
    const payload = JSON.parse(execution.stdout);

    expect(execution.exitCode).toBe(0);
    expect(payload.agentId).toBe('video-generation');
    expect(payload.success).toBe(true);
    expect(payload.producedArtifacts).toContain('artifact:rendered-video');
    expect(payload.output.assemblyReady).toBe(true);
  });

  it('blocks requests that miss required visual inputs', () => {
    const result = videoGenerationAgent.run({
      mode: 'standalone',
      inputs: {
        imageManifestPath: 'jobs/image-manifest.json',
        durationSeconds: 15,
        aspectRatio: '9:16',
        outputDir: 'renders/video',
        videoManifestPath: 'jobs/video-manifest.json',
        finalVideoPath: 'assembly/final.mp4',
      },
      upstreamArtifacts: ['artifact:image-manifest'],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'missing or invalid input: shotPlanPath (string)',
        'missing required artifact: artifact:video-shot-plan',
      ])
    );
  });
});