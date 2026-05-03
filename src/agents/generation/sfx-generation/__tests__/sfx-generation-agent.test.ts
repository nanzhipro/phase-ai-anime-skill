import { executeGenerationAgentCli } from '../../shared/cli';
import { sfxGenerationAgent } from '..';

describe('sfxGenerationAgent', () => {
  it('declares the expected cue and timing contract', () => {
    expect(sfxGenerationAgent.spec.protocol.collaborative.requiredArtifacts.map((artifact) => artifact.path)).toEqual([
      'artifact:cue-sheet',
      'artifact:timing-map',
    ]);
    expect(sfxGenerationAgent.spec.protocol.collaborative.producedArtifacts[1]?.path).toBe(
      'artifact:sfx-stem'
    );
  });

  it('runs the built-in example through the direct CLI shape', () => {
    const execution = executeGenerationAgentCli(['--example'], 'sfx-generation');
    const payload = JSON.parse(execution.stdout);

    expect(execution.exitCode).toBe(0);
    expect(payload.agentId).toBe('sfx-generation');
    expect(payload.success).toBe(true);
    expect(payload.producedArtifacts).toContain('artifact:sfx-stem');
  });

  it('blocks collaborative requests without a timing map', () => {
    const result = sfxGenerationAgent.run({
      mode: 'collaborative',
      inputs: {
        cueSheetPath: 'audio/sfx-cues.yaml',
        outputDir: 'audio/sfx',
        audioManifestPath: 'audio/sfx-manifest.json',
        sfxStemPath: 'audio/sfx.wav',
      },
      upstreamArtifacts: ['artifact:cue-sheet'],
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