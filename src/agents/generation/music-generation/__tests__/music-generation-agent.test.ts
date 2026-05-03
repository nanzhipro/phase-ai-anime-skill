import { executeGenerationAgentCli } from '../../shared/cli';
import { musicGenerationAgent } from '..';

describe('musicGenerationAgent', () => {
  it('declares the expected score handoff contract', () => {
    expect(musicGenerationAgent.spec.protocol.collaborative.requiredArtifacts.map((artifact) => artifact.path)).toEqual([
      'artifact:music-brief',
      'artifact:timing-map',
    ]);
    expect(musicGenerationAgent.spec.protocol.collaborative.producedArtifacts[1]?.path).toBe(
      'artifact:music-stem'
    );
  });

  it('runs the built-in example through the direct CLI shape', () => {
    const execution = executeGenerationAgentCli(['--example'], 'music-generation');
    const payload = JSON.parse(execution.stdout);

    expect(execution.exitCode).toBe(0);
    expect(payload.agentId).toBe('music-generation');
    expect(payload.success).toBe(true);
    expect(payload.producedArtifacts).toContain('artifact:music-stem');
  });

  it('blocks collaborative requests without timing inputs', () => {
    const result = musicGenerationAgent.run({
      mode: 'collaborative',
      inputs: {
        musicBriefPath: 'audio/music-brief.md',
        outputDir: 'audio/music',
        audioManifestPath: 'audio/music-manifest.json',
        musicStemPath: 'audio/music.wav',
      },
      upstreamArtifacts: ['artifact:music-brief'],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'missing or invalid input: timingMapPath (string)',
        'missing required artifact: artifact:timing-map',
      ])
    );
  });
});