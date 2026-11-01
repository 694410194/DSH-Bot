import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

// The command modules are ESM tooling, outside the product TypeScript compilation boundary.
const url = pathToFileURL(resolve('../../scripts/deepening/validate-cases.mjs')).href;
const { loadBundle, schemas, validateBundle } = await import(url);

describe('M1 failure catalog validates frozen coverage, schema and OPEN inventory', () => {
  it('accepts the complete frozen catalog without implying runtime receipt validation', async () => {
    const summary = await validateBundle();
    expect(summary.inventory.sources).toBe(46);
    expect(summary.inventory.candidates).toBe(310);
    expect(summary.historyCases).toBeGreaterThanOrEqual(12);
    expect(summary.fixedHistoryRegressions).toBe(7);
    expect(summary.sharedReproductions).toBe(6);
    expect(summary.expectedFailures).toBe(3);
    expect(summary.runtimeReceiptsChecked).toBe(false);
  });

  it('rejects unknown case fields, missing evidence, illegal levels and invalid source ranges', async () => {
    const schema = await schemas();
    const { cases } = await loadBundle();
    const first = cases[0];
    expect(schema.case.safeParse({ ...first, unreviewed: true }).success).toBe(false);
    const missing = { ...first };
    delete missing.evidenceLevel;
    expect(schema.case.safeParse(missing).success).toBe(false);
    expect(schema.case.safeParse({ ...first, evidenceLevel: 'PASS' }).success).toBe(false);
    expect(schema.case.safeParse({ ...first, source: { ...first.source, lines: [0, 1] } }).success).toBe(false);
  });

  it('rejects manifest shape changes before checking cross references', async () => {
    const schema = await schemas();
    const { manifest } = await loadBundle();
    expect(schema.manifest.safeParse({ ...manifest, unexpected: true }).success).toBe(false);
    expect(schema.manifest.safeParse({ ...manifest, actualCandidates: 1.5 }).success).toBe(false);
  });

  it('rejects a missing candidate disposition', async () => {
    const bundle = await loadBundle();
    bundle.manifest.dispositions.pop();
    await expect(validateBundle(bundle)).rejects.toThrow('coverage');
  });

  it('rejects duplicate candidate destinations even if the total count is unchanged', async () => {
    const bundle = await loadBundle();
    bundle.manifest.dispositions[1] = structuredClone(bundle.manifest.dispositions[0]);
    await expect(validateBundle(bundle)).rejects.toThrow('Duplicate candidate');
  });

  it('rejects dangling or cyclic duplicate links', async () => {
    const bundle = await loadBundle();
    const duplicate = bundle.manifest.dispositions.find((d: { disposition: string }) => d.disposition === 'duplicate');
    duplicate.duplicateOf = duplicate.candidateId;
    await expect(validateBundle(bundle)).rejects.toThrow('duplicate');
  });

  it('rejects an exclusion that also points to a case', async () => {
    const bundle = await loadBundle();
    const excluded = bundle.manifest.dispositions.find((d: { disposition: string }) => d.disposition === 'out-of-scope');
    excluded.caseId = 'H01';
    await expect(validateBundle(bundle)).rejects.toThrow('Invalid exclusion');
  });

  it('rejects stale hashes and hiding an OPEN requirement', async () => {
    const bundle = await loadBundle();
    bundle.manifest.inputSha256 = '0'.repeat(64);
    await expect(validateBundle(bundle)).rejects.toThrow('digest');
    const other = await loadBundle();
    other.manifest.openContracts.pop();
    await expect(validateBundle(other)).rejects.toThrow('OPEN contract');
  });

  it('rejects changes to a case artifact rather than trusting the supplied clone', async () => {
    const bundle = await loadBundle();
    bundle.cases[0].source.lines = [999999, 999999];
    await expect(validateBundle(bundle)).rejects.toThrow('contents differ');
  });
});

// Exercise a source-only tree with no .git, ignored progress log, or Git executable.
it('validates committed snapshots in a source archive without Git history or local progress logs', async () => {
  const original = resolve('../..'), base = resolve(original, '.dsh-dev/catalog-clean');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(resolve(base, 'source-'));
  try {
    for (const path of ['docs/acceptance', 'tasks', 'scripts/deepening', 'packages/dsh-bot'])
      await mkdir(resolve(directory, path), { recursive: true });
    await cp(resolve(original, 'evals'), resolve(directory, 'evals'), { recursive: true });
    const manifest = JSON.parse(await readFile(resolve(original, 'evals/manifests/failures.json'), 'utf8'));
    const cases = await Promise.all(manifest.cases.map((entry: { path: string }) =>
      readFile(resolve(original, entry.path), 'utf8').then(JSON.parse)));
    const files = new Set<string>(cases.flatMap(row => row.regressions.map((entry: { testFile: string }) => entry.testFile)));
    for (const file of ['scripts/deepening/catalog-lib.mjs', 'scripts/deepening/validate-cases.mjs',
      'packages/dsh-bot/package.json', ...files]) {
      await mkdir(resolve(directory, file, '..'), { recursive: true });
      await cp(resolve(original, file), resolve(directory, file));
    }
    await symlink(resolve(original, 'packages/dsh-bot/node_modules'), resolve(directory, 'packages/dsh-bot/node_modules'), 'dir');
    const source = "import { validateBundle } from './scripts/deepening/validate-cases.mjs'; console.log(JSON.stringify(await validateBundle()));";
    const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', source],
      { cwd: directory, env: { PATH: '' } });
    expect(JSON.parse(stdout)).toMatchObject({ status: 'PASS', runtimeReceiptsChecked: false,
      inventory: { sources: 46, candidates: 310 } });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
