import {
  assertVolcengineRuntimeEnvironmentReady,
  checkVolcengineRuntimeEnvironment,
  resolveVolcengineRuntimeApiKey,
} from '../index';

describe('Volcengine runtime environment checks', () => {
  it('reports a missing .env and missing ARK_API_KEY with setup guidance', () => {
    const status = checkVolcengineRuntimeEnvironment({
      cwd: '/workspace/project',
      env: {},
      readFile: () => undefined,
    });

    expect(status.ready).toBe(false);
    expect(status.source).toBe('missing');
    expect(status.envFilePath).toBe('/workspace/project/.env');
    expect(status.templateFilePath).toBe('/workspace/project/.env.example');
    expect(status.message).toContain('Copy .env.example to .env');
    expect(status.message).toContain('must not be committed to GitHub');
  });

  it('accepts a valid ARK_API_KEY from .env content', () => {
    const status = checkVolcengineRuntimeEnvironment({
      cwd: '/workspace/project',
      env: {},
      readFile: (filePath) =>
        filePath === '/workspace/project/.env'
          ? 'ARK_API_KEY=ark_live_123456\n'
          : undefined,
    });

    expect(status.ready).toBe(true);
    expect(status.source).toBe('.env');
    expect(status.message).toContain('ARK_API_KEY is available in .env');
  });

  it('treats an explicit non-placeholder apiKey as a ready runtime source', () => {
    const status = checkVolcengineRuntimeEnvironment({
      explicitApiKey: 'ark_explicit_123',
      cwd: '/workspace/project',
      env: {},
      readFile: () => undefined,
    });

    expect(status.ready).toBe(true);
    expect(status.source).toBe('explicit');
  });

  it('rejects placeholder ARK_API_KEY values in .env', () => {
    const status = checkVolcengineRuntimeEnvironment({
      cwd: '/workspace/project',
      env: {},
      readFile: (filePath) =>
        filePath === '/workspace/project/.env'
          ? 'ARK_API_KEY=your_ark_api_key_here\n'
          : undefined,
    });

    expect(status.ready).toBe(false);
    expect(status.source).toBe('invalid');
    expect(status.message).toContain('placeholder');
  });

  it('resolves the ARK_API_KEY from .env when process.env is empty', () => {
    const apiKey = resolveVolcengineRuntimeApiKey(undefined, {
      cwd: '/workspace/project',
      env: {},
      readFile: (filePath) =>
        filePath === '/workspace/project/.env'
          ? 'ARK_API_KEY=ark_runtime_key_789\n'
          : undefined,
    });

    expect(apiKey).toBe('ark_runtime_key_789');
  });

  it('throws immediately when the hard gate sees no usable runtime key', () => {
    expect(() =>
      assertVolcengineRuntimeEnvironmentReady({
        cwd: '/workspace/project',
        env: {},
        readFile: () => undefined,
      })
    ).toThrow(/Without a valid API key the provider flow cannot run/);
  });
});