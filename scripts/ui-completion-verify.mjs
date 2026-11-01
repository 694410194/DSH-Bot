import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { webHost } from './deepening/b4-web-host.mjs';
import { openBotsPanel } from './deepening/sidebar-session.mjs';
import { dismissFirstRunOverlays, installOverlayHandler } from '../packages/dsh-bot/scripts/screenshot-support.ts';
const root = process.cwd(), version = process.env.UI_VERSION ?? 'rc5', dir = resolve(root, `.dsh-dev/ui-completion/${version}-${Date.now()}`), out = resolve(root, `output/playwright/ui-completion/${version}`);
await mkdir(out, { recursive: true });
const require = createRequire(resolve(root, 'packages/dsh-bot/package.json')), { chromium } = require('playwright-core');
const host = await webHost(dir, 'ui-completion', undefined, resolve(root, 'packages/dsh-bot/tests/group-native-api-profile.mjs'));
let browser, lastPage;
try {
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  const paths = (await readdir(cache)).filter(n => /^chromium_headless_shell-\d+$/.test(n)).sort().reverse().flatMap(n => ['arm64', 'x64'].map(a => join(cache, n, `chrome-headless-shell-mac-${a}`, 'chrome-headless-shell')));
  const previousTmp = process.env.TMPDIR; process.env.TMPDIR = host.env.TMPDIR;
  try { browser = await chromium.launch({ executablePath: paths.find(existsSync), headless: true, chromiumSandbox: true, env: host.env }); } finally { if (previousTmp === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previousTmp; }
  const checks = [], errors = [], screenshots = [];
  for (const language of ['en', 'zh']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', locale: language === 'zh' ? 'zh-CN' : 'en-US' });
    const page = await context.newPage(); lastPage = page; page.setDefaultTimeout(8000); page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    await installOverlayHandler(page, () => {}); await page.goto(host.url); await dismissFirstRunOverlays(page, () => {}, 'u2');
    await openBotsPanel(page, 'Bots', () => {});
    const t = JSON.parse(await readFile(resolve(root, `packages/dsh-bot/locale/${language}.json`))).ui;
    const main = page.locator('[data-bots-page]'), click = key => main.getByRole('button', { name: t[key], exact: true }).click();
    const tab = key => main.getByRole('tab', { name: t[key], exact: true }).click();
    await main.locator('button[data-bot-id="api-alpha"]').waitFor();
    assert.equal(await main.locator('button[data-bot-id]').count(), 50);
    for (const theme of ['dark', 'light']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        const capture = async name => {
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name);
          const filename = `${language}-${theme}-${width}-${name}.png`;
          await page.screenshot({ path: join(out, filename), fullPage: true, animations: 'disabled' }); screenshots.push(filename);
        };
        await capture('list');
        await main.getByRole('searchbox').fill('api-alpha');
        await main.getByRole('button', { name: `${t['chat.profile']} · api-alpha`, exact: true }).click();
        assert.equal(await page.getByRole('dialog').count(), 0);
        for (const key of ['overview', 'work', 'memory', 'settings', 'history']) {
          await tab(`detail.${key}`); await capture(key);
        }
        await tab('detail.overview'); await click('card.edit');
        await main.getByRole('textbox', { name: t['editor.description'], exact: true }).fill('Unsaved UI validation');
        await capture('editor');
        await main.getByRole('button', { name: t['navigation.returnTo'].replace('{name}', t['navigation.myBots']), exact: true }).click();
        const dialog = page.getByRole('dialog', { name: t['navigation.unsaved'], exact: true });
        await dialog.getByRole('button', { name: t['navigation.keepEditing'], exact: true }).click();
        assert.equal(await main.getByRole('textbox', { name: t['editor.description'], exact: true }).inputValue(), 'Unsaved UI validation');
        await main.getByRole('button', { name: t['navigation.returnTo'].replace('{name}', t['navigation.myBots']), exact: true }).click();
        await dialog.getByRole('button', { name: t['navigation.discardLeave'], exact: true }).click();
        assert.equal(await main.getByRole('searchbox').inputValue(), 'api-alpha');
        await main.getByRole('searchbox').fill('');
      }
    }
    checks.push(`${language}: 50 Bots, same/long names, 42 theme/viewport screens, inline details, native draft confirmation and list restoration`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(join(out, 'results.json'), JSON.stringify({ version, checks, screenshots, errors, syntheticModelRequests: host.requests(), realModelRequests: 0 }, null, 2) + '\n');
  console.log(JSON.stringify({ version, checks, screenshots: screenshots.length, out }));
} catch (error) { if (lastPage) { await writeFile(join(out, 'failure.txt'), await lastPage.locator('body').ariaSnapshot()); await lastPage.screenshot({ path: join(out, 'failure.png') }); } throw error; } finally { await browser?.close(); await host.stop(); }
