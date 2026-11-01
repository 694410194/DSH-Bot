// Explicit maintainer operation: preserve original tracked baseline blobs for source archives/shallow clones.
import { execFileSync } from 'node:child_process';
import { readJson, sha256, writeJson } from './catalog-lib.mjs';

const input = await readJson('evals/inputs/failures.json');
const manifest = await readJson('evals/manifests/failures.json');
const blobs = {};
for (const source of [...input.sources, ...manifest.supplementalSources]) {
  if (source.snapshot) continue; // Existing committed progress snapshot is used as-is; no local log is read.
  if (!/^(?:docs|tasks|packages)\//.test(source.path)) throw new Error(`Not a tracked source path: ${source.path}`);
  const key = `${source.revision}:${source.path}`;
  const text = execFileSync('git', ['show', key], { encoding: 'utf8', maxBuffer: 8_000_000 });
  if (sha256(text) !== source.sha256) throw new Error(`Baseline digest mismatch: ${key}`);
  blobs[key] = text;
}
await writeJson('evals/inputs/failure-sources.json', { schemaVersion: 1, blobs }, true);
console.log(`Froze ${Object.keys(blobs).length} original tracked baseline blobs; existing files are never overwritten.`);
