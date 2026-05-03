import { executeGenerationAgentCli } from '../../shared/cli';
import { textToImageAgent } from '..';

describe('textToImageAgent', () => {
  it('declares the expected standalone handoff contract', () => {
    expect(textToImageAgent.spec.protocol.standalone.requiredArtifacts.map((artifact) => artifact.path)).toEqual([
      'artifact:shot-plan',
      'artifact:image-prompt-manifest',
    ]);
    expect(textToImageAgent.spec.limitations.length).toBeGreaterThanOrEqual(2);
  });

  it('runs the built-in example through the direct CLI shape', () => {
    const execution = executeGenerationAgentCli(['--example'], 'text-to-image');
    const payload = JSON.parse(execution.stdout);

    expect(execution.exitCode).toBe(0);
    expect(payload.agentId).toBe('text-to-image');
    expect(payload.success).toBe(true);
    expect(payload.producedArtifacts).toContain('artifact:image-manifest');
  });

  it('blocks requests that miss required inputs or protocol artifacts', () => {
    const result = textToImageAgent.run({
      mode: 'standalone',
      inputs: {
        promptRefs: ['shot-001'],
        aspectRatio: '9:16',
        outputDir: 'renders/images',
        imageManifestPath: 'jobs/image-manifest.json',
      },
      upstreamArtifacts: ['artifact:shot-plan'],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'missing or invalid input: promptManifestPath (string)',
        'missing required artifact: artifact:image-prompt-manifest',
      ])
    );
  });
});