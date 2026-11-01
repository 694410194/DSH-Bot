import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { webHost } from './deepening/b4-web-host.mjs';
import { dismissFirstRunOverlays, installOverlayHandler } from '../packages/dsh-bot/scripts/screenshot-support.ts';
const root = process.cwd(), label = process.env.U0_VERSION ?? 'rc5', dir = resolve(root, `.dsh-dev/native-settings/${label}-${Date.now()}`), out = resolve(root, `output/playwright/native-settings/${label}`);
await mkdir(out, { recursive: true });
const require = createRequire(resolve(root, 'packages/dsh-bot/package.json'));
const { build } = require('esbuild'), { chromium } = require('playwright-core');
const bundle = await build({ entryPoints: [resolve(root, 'packages/dsh-bot/tests/native-settings-fixture.tsx')], bundle: true, write: false, format: 'cjs', platform: 'browser', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-dom/client', '@deepseek-ai/dsh-client-ui-primitives'] });
const source = bundle.outputFiles[0].text;
const host = await webHost(dir, 'group-api', undefined, resolve(root, 'packages/dsh-bot/tests/group-native-api-profile.mjs'));
let browser;
try {
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  const paths = (await readdir(cache)).filter(n => /^chromium_headless_shell-\d+$/.test(n)).sort().reverse().flatMap(n => ['arm64', 'x64'].map(a => join(cache, n, `chrome-headless-shell-mac-${a}`, 'chrome-headless-shell')));
  const previousTmp = process.env.TMPDIR; process.env.TMPDIR = host.env.TMPDIR;
  try { browser = await chromium.launch({ executablePath: paths.find(existsSync), headless: true, chromiumSandbox: true, env: host.env }); } finally { if (previousTmp === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previousTmp; }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  const page = await context.newPage(), errors = [], checks = [];
  page.on('pageerror', e => errors.push(String(e))); page.setDefaultTimeout(8000);
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') return route.abort();
    if (route.request().resourceType() !== 'script') return route.continue();
    const response = await route.fetch(); let body = await response.text();
    if (body.includes('id: "dsh-bot", factory(require)')) {
      const patch = `const probe = (() => { const module = {exports:{}}; const exports = module.exports; ${source}\nreturn module.exports; })();\nconst original = module.exports; return {...original, apply: async (...args) => { await original.apply(...args); probe.install(args[0]); }};`;
      body = body.replace('return module.exports;\n} });', patch + '\n} });');
    }
    await route.fulfill({ response, body });
  });
  await installOverlayHandler(page, () => {}); await page.goto(host.url); await dismissFirstRunOverlays(page, () => {}, 'u0');
  const click = name => page.getByRole('button', { name, exact: true }).click();
  await click('U0 Open'); await page.getByLabel('U0 Input').waitFor();
  assert.equal(await page.getByLabel('U0 Input').evaluate(el => document.activeElement === el), true); checks.push('Modal initial focus');
  for (let i = 0; i < 20; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[role=dialog]'))), true); } checks.push('Tab remains in native modal');
  await click('U0 Menu'); await page.keyboard.press('Escape'); assert.equal(await page.getByRole('menu').count(), 0); assert.equal(await page.getByRole('dialog', { name: 'U0 Modal', exact: true }).count(), 1); checks.push('Menu consumes first Escape');
  await click('U0 Nested'); await page.getByLabel('U0 Nested input').waitFor(); await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 1); assert.equal(await page.getByRole('button', { name: 'U0 Nested', exact: true }).evaluate(el => document.activeElement === el), true); checks.push('Nested modal / return focus');
  await page.getByLabel('U0 Busy').check(); await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 1); await page.getByLabel('U0 Busy').uncheck(); checks.push('Caller busy close guard');
  await page.getByRole('tab', { name: 'U0 A', exact: true }).focus(); await page.keyboard.press('ArrowRight'); assert.equal(await page.getByRole('tab', { name: 'U0 B', exact: true }).getAttribute('aria-selected'), 'true'); checks.push('Native tab keyboard selection');
  await page.getByLabel('U0 Draft').fill('changed'); assert.equal((await page.evaluate(() => window.nativeSettingsReceipt)).mutations.length, 0);
  await click('U0 Save'); await page.waitForFunction(() => window.nativeSettingsReceipt.mutations.length === 1);
  assert.equal((await page.evaluate(() => window.nativeSettingsReceipt)).mutations[0].revision, 7); checks.push('SettingsForm staged revision-fenced save');
  await page.getByLabel('U0 Draft').fill('refuse'); await click('U0 Save'); await page.getByText('Save failed', { exact: true }).waitFor(); assert.equal(await page.getByLabel('U0 Draft').inputValue(), 'refuse'); checks.push('Refused save retains draft');
  await click('U0 Toggle form'); await click('U0 Toggle form'); assert.equal(await page.getByLabel('U0 Draft').inputValue(), 'changed'); checks.push('Unmount discards draft');
  for (const theme of ['dark', 'light']) { await page.emulateMedia({ colorScheme: theme }); for (const width of [1440, 768, 390]) { await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: join(out, `${theme}-${width}.png`) }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); } }
  checks.push('Themes and 1440/768/390 no horizontal overflow');
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('button', { name: 'U0 Open', exact: true }).evaluate(el => document.activeElement === el), true); checks.push('Modal return focus');
  const receipt = await page.evaluate(() => window.nativeSettingsReceipt); assert.equal(receipt.section, true); assert.equal(receipt.plugins, true); checks.push('Both settings slot owners available');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'U0 Section', exact: true }).click();
  await click('U0 Close section');
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await click('Built-in plugins');
  await page.getByRole('tab', { name: 'U0 Plugin', exact: true }).click();
  await page.getByText('U0 plugin mounted', { exact: true }).waitFor();
  checks.push('Plugins tab mounts through public slot');
  await writeFile(join(out, 'native-shell.txt'), await page.locator('body').ariaSnapshot());
  checks.push('Settings section renders and owner.close returns to prior page');
  assert.deepEqual(errors, []);
  await writeFile(join(out, 'results.json'), JSON.stringify({ label, checks, receipt, errors, modelRequests: host.requests(), scope: 'Real platform APIs; synthetic SettingsForm scope, not Host config writes' }, null, 2) + '\n');
  console.log(JSON.stringify({ label, checks, out }));
} finally { await browser?.close(); await host.stop(); }
