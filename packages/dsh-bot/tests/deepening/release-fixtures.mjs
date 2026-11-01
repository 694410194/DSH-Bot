import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const releaseFixtures = Object.freeze({
  // Original release receipts: docs/acceptance/V032-bot-to-bot.md,
  // docs/acceptance/deepening.md, docs/deepening/V041.md.
  '0.3.2': '1cad1685ae60deef5197a374d2213bb160cb5246eea4ad3e449035de050f986b',
  '0.4.0': '361481e8a623a5473bb897553f9508346dcfa39014c7506ddda788d93b1498b1',
  '0.4.1': '3675fdb29a16f679aa5cfc1097afb839a54b1c8d8d8c78ad19d44f4f66f2f9eb',
});
const root = fileURLToPath(new URL('../../../../', import.meta.url));

export async function verifyReleaseFixtures(directory = resolve(root, 'dist')) {
  const artifacts = {}, failures = [];
  for (const [version, expected] of Object.entries(releaseFixtures)) {
    const path = resolve(directory, `dsh-bot-${version}.tgz`);
    try {
      const actual = createHash('sha256').update(await readFile(path)).digest('hex');
      if (actual !== expected) failures.push(`${path}: SHA256 mismatch (expected ${expected}, actual ${actual})`);
      else artifacts[version] = path;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      failures.push(`${path}: missing; required SHA256 ${expected}`);
    }
  }
  if (failures.length) throw new Error(`Historical release fixture preflight failed:\n${failures.join('\n')}\n`
    + 'Obtain the original release archives listed in docs/testing.md. Do not rebuild current source under old version names.');
  return artifacts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const artifacts = await verifyReleaseFixtures(process.argv[2]);
    console.log(JSON.stringify({ status: 'PASS', artifacts, sha256: releaseFixtures }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
