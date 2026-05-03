import { executeGenerationAgentCli } from '../../shared/cli';
import { ttsGenerationAgent } from '..';

describe('ttsGenerationAgent', () => {
  it('declares the expected dialogue handoff contract', () => {
    expect(ttsGenerationAgent.spec.protocol.collaborative.requiredArtifacts.map((artifact) => artifact.path)).toEqual([
      'artifact:dialogue-script',
      'artifact:voice-casting-sheet',
    ]);
    expect(ttsGenerationAgent.spec.protocol.collaborative.producedArtifacts[1]?.path).toBe(
      'artifact:dialogue-stem'
    );
  });

  it('runs the built-in example through the direct CLI shape', () => {
    const execution = executeGenerationAgentCli(['--example'], 'tts-generation');
    const payload = JSON.parse(execution.stdout);

    expect(execution.exitCode).toBe(0);
    expect(payload.agentId).toBe('tts-generation');
    expect(payload.success).toBe(true);
    expect(payload.producedArtifacts).toContain('artifact:dialogue-stem');
  });

  it('blocks requests that miss dialogue contracts', () => {
    const result = ttsGenerationAgent.run({
      mode: 'collaborative',
      inputs: {
        dialogueScriptPath: 'storyboard/dialogue.yaml',
        language: 'zh-CN',
        outputDir: 'audio/dialogue',
        audioManifestPath: 'audio/tts-manifest.json',
        dialogueStemPath: 'audio/dialogue.wav',
      },
      upstreamArtifacts: ['artifact:dialogue-script'],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('missing required artifact: artifact:voice-casting-sheet');
  });
});