import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';

const [root, dir, mode, artifact] = process.argv.slice(2);
const installed = resolve(dir, 'package');
const path = name => resolve(installed, 'lib', name);
const url = name => pathToFileURL(path(name)).href;
const unpack = () => execFileSync('tar', ['-xzf', artifact, '-C', dir]);
await symlink(resolve(root, 'packages/dsh-bot/node_modules'), resolve(dir, 'node_modules'), 'dir');
unpack();
const manifestPath = path('module-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const { version, exports: entrypoints } = JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8'));
assert.equal(manifest.version, version);
assert.ok(Object.keys(manifest.files).length > 100, 'Packed installation must contain the complete Host module inventory');
assert.ok(manifest.files['host/index.js']); assert.ok(manifest.files['shared/schema.js']);
for (const [name, digest] of Object.entries(manifest.files)) {
  assert.equal(createHash('sha256').update(await readFile(path(name))).digest('hex'), digest, name);
}
// Verify all concrete package exports survive packing, including declarations.
async function exportedFiles(value) {
  if (typeof value === 'string' && !value.includes('*')) await readFile(resolve(installed, value));
  else if (value && typeof value === 'object') for (const target of Object.values(value)) await exportedFiles(target);
}
await exportedFiles(entrypoints);

if (mode === 'legacy-schema-cache' || mode === 'other-cache') {
  const name = mode === 'legacy-schema-cache' ? 'shared/schema.js' : 'shared/version.js';
  // Deliberate current-install corruption models an unversioned or stale cached namespace.
  // These are not reconstructed historical releases; real historical archives have a separate suite.
  if (mode === 'legacy-schema-cache') await writeFile(path(name), 'export const syntheticCacheWitness = true;\n');
  else await writeFile(path(name), (await readFile(path(name), 'utf8'))
    .replace(/DSH_BOT_MODULE_VERSION = '[^']+'/, "DSH_BOT_MODULE_VERSION = 'synthetic-stale'"));
  const cached = await import(url(name));
  if (mode === 'legacy-schema-cache') assert.equal(cached.DSH_BOT_MODULE_VERSION, undefined);
  else assert.equal(cached.DSH_BOT_MODULE_VERSION, 'synthetic-stale');
  unpack();
}
if (mode === 'mixed') await writeFile(path('shared/schema.js'), `${await readFile(path('shared/schema.js'), 'utf8')}\n// damaged\n`);
if (mode === 'missing-module') await rm(path('shared/schema.js'));
if (mode === 'link-error') {
  const name = 'host/index.js';
  await writeFile(path(name), `import { syntheticMissingExport } from '../shared/version.js';\n${await readFile(path(name), 'utf8')}`);
  // Rehash so this case exercises the dynamic linker instead of the disk-integrity check.
  manifest.files[name] = createHash('sha256').update(await readFile(path(name))).digest('hex');
  await writeFile(manifestPath, JSON.stringify(manifest));
}
if (mode === 'manifest-version') {
  manifest.version = 'synthetic-other'; await writeFile(manifestPath, JSON.stringify(manifest));
}
if (mode === 'invalid-manifest') {
  manifest.files['../escape.js'] = '0'.repeat(64); await writeFile(manifestPath, JSON.stringify(manifest));
}
if (mode === 'missing-manifest') await rm(manifestPath);
const plugin = await import(`${url('index.js')}?current-install`);
assert.equal(plugin.VERSION, version);
if (mode === 'fresh') {
  assert.equal(typeof plugin.Config, 'function'); assert.equal(typeof plugin.DshBotRegistry, 'function');
  assert.ok(plugin.inject.length > 0, 'Fresh package must link the real Host runtime');
} else {
  if (mode === 'replaced-entry') {
    assert.equal(typeof plugin.DshBotRegistry, 'function');
    manifest.version = 'synthetic-other'; await writeFile(manifestPath, JSON.stringify(manifest));
    assert.equal(await import(`${url('index.js')}?current-install`), plugin);
  } else { assert.deepEqual(plugin.inject, []); assert.equal(plugin.DshBotRegistry, undefined); }
  let touched = 0;
  const context = new Proxy({}, { get() { touched++; throw Error('Must not access Host services'); } });
  const restart = error => {
    assert.match(error.message, /请完全退出并重新打开 DSH/);
    assert.match(error.message, /Fully quit and reopen DSH/);
    assert.doesNotMatch(error.message, /SyntaxError|syntheticMissingExport|ENOENT/);
    assert.equal(error.cause, undefined); return true;
  };
  assert.throws(() => plugin.apply(context, {}), restart); assert.equal(touched, 0);
  if (mode !== 'replaced-entry') {
    const ctx = new Context(); let fork;
    try { await assert.rejects(async () => { fork = ctx.plugin(plugin, {}); await fork.await(); }, restart); }
    finally { await fork?.dispose(); await ctx.fiber.dispose(); }
  }
}
console.log(JSON.stringify({ status: 'PASS', mode, version, nativeEsm: true, fullHost: false }));
