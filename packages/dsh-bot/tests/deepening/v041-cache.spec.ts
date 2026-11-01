import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const root = resolve('../..');
let directory: string;
let artifact: string;

describe('current packed installation and native Node ESM guards (synthetic damage, not historical upgrade)', () => {
  beforeAll(async () => {
    const base = resolve(root, '.dsh-dev/current-cache');
    await mkdir(base, { recursive: true });
    directory = await mkdtemp(resolve(base, 'pack-'));
    const { stdout } = await run(resolve(root, 'scripts/pnpm'), ['pack', '--pack-destination', directory],
      { cwd: resolve(root, 'packages/dsh-bot') });
    // pnpm emits the artifact path as its last nonempty output line.
    artifact = resolve(stdout.trim().split('\n').at(-1) ?? '');
    expect(artifact.startsWith(`${directory}/`)).toBe(true);
    expect(artifact.endsWith('.tgz')).toBe(true);
    await run(process.execPath, [resolve(root, 'scripts/verify-package.mjs'), artifact]);
  }, 60_000);
  afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

  it.each(['fresh', 'mixed', 'missing-module', 'link-error', 'other-cache', 'legacy-schema-cache',
    'replaced-entry', 'manifest-version', 'invalid-manifest', 'missing-manifest'])('%s', async mode => {
    const dir = await mkdtemp(resolve(directory, `${mode}-`));
    const { stdout } = await run(process.execPath,
      [resolve('tests/deepening/v041-cache-current-worker.mjs'), root, dir, mode, artifact]);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'PASS', mode, nativeEsm: true, fullHost: false });
  }, 30_000);
});
