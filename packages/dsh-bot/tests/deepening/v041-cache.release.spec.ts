import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
const fixtureModule = './release-fixtures.mjs';
const { verifyReleaseFixtures } = await import(fixtureModule);
const run = promisify(execFile);
describe('historical release artifacts: native Node ESM upgrade boundary (not complete CLI Host)', () => {
  beforeAll(() => verifyReleaseFixtures());
  it.each(['fresh', 'legacy', 'mixed', 'link-error', 'other-cache', 'replaced-entry'])('%s: actual release artifacts', async mode => {
    const root = resolve('../..'), base = resolve(root, '.dsh-dev/v041-cache');
    await mkdir(base, { recursive: true });
    const dir = await mkdtemp(resolve(base, `${mode}-`));
    try {
      const { stdout } = await run(process.execPath, [resolve('tests/deepening/v041-cache-worker.mjs'), root, dir, mode]);
      expect(JSON.parse(stdout)).toMatchObject({ status: 'PASS', mode, nativeEsm: true, fullHost: false });
    } finally { await rm(dir, { recursive: true, force: true }); }
  // Each case spawns a cold Node process that extracts and links real release tarballs; ~1s idle, >5s under full-suite load.
  }, 30_000);
});
