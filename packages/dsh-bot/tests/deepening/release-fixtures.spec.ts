import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
const fixtureModule = './release-fixtures.mjs';
const { releaseFixtures, verifyReleaseFixtures } = await import(fixtureModule);

it('fails explicitly for absent and incorrect historical archives without trusting a local checksum sidecar', async () => {
  const base = resolve('../../.dsh-dev/release-fixture-unit');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(resolve(base, 'negative-'));
  try {
    await expect(verifyReleaseFixtures(directory)).rejects.toThrow('0.3.2.tgz: missing; required SHA256');
    await writeFile(resolve(directory, 'dsh-bot-0.3.2.tgz'), 'SYNTHETIC CORRUPTION, NOT A HISTORICAL PACKAGE');
    await writeFile(resolve(directory, 'dsh-bot-0.3.2.tgz.sha256'), `${releaseFixtures['0.3.2']}  dsh-bot-0.3.2.tgz\n`);
    await expect(verifyReleaseFixtures(directory)).rejects.toThrow('SHA256 mismatch');
    await expect(verifyReleaseFixtures(directory)).rejects.toThrow('Do not rebuild current source under old version names');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
