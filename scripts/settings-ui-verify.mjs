import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { webHost } from './deepening/b4-web-host.mjs';
import { openBotsPanel } from './deepening/sidebar-session.mjs';
import { dismissFirstRunOverlays, installOverlayHandler } from '../packages/dsh-bot/scripts/screenshot-support.ts';
const root = process.cwd(), version = process.env.U0_VERSION ?? 'rc5', dir = resolve(root, `.dsh-dev/settings-ui/${version}-${Date.now()}`), out = resolve(root, `output/playwright/settings-ui/${version}`);
await mkdir(out, { recursive: true });
const require = createRequire(resolve(root, 'packages/dsh-bot/package.json')), { chromium } = require('playwright-core');
const host = await webHost(dir, 'group-api', undefined, resolve(root, 'packages/dsh-bot/tests/group-native-api-profile.mjs'));
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
    await installOverlayHandler(page, () => {}); await page.goto(host.url); await dismissFirstRunOverlays(page, () => {}, 'u1');
    await openBotsPanel(page, 'Bots', () => {});
    const t = JSON.parse(await readFile(resolve(root, `packages/dsh-bot/locale/${language}.json`))).ui;
    const main = page.locator('[data-bots-page]'), click = key => main.getByRole('button', { name: t[key], exact: true }).click();
    const tab = key => main.getByRole('tab', { name: t[key], exact: true }).click();
    await click('chat.settings');
    assert.equal(await main.locator('form:visible').count(), 0);
    await main.getByRole('combobox', { name: t['integrations.bot'], exact: true }).selectOption('api-beta');
    await tab('notifications.notifications'); assert.equal(await main.locator('form:visible').count(), 0);
    await click('notifications.newPolicy'); await main.getByLabel(t['integrations.id'], { exact: true }).fill('beta-draft');
    await tab('connectors.connectors'); await tab('notifications.notifications');
    assert.equal(await main.getByLabel(t['integrations.id'], { exact: true }).inputValue(), 'beta-draft');
    await main.getByRole('combobox', { name: t['integrations.bot'], exact: true }).selectOption('api-alpha');
    const dialog = page.getByRole('dialog', { name: t['navigation.unsaved'], exact: true });
    await dialog.getByRole('button', { name: t['navigation.keepEditing'], exact: true }).click();
    assert.equal(await main.getByRole('combobox', { name: t['integrations.bot'], exact: true }).inputValue(), 'api-beta');
    await main.getByRole('combobox', { name: t['integrations.bot'], exact: true }).selectOption('api-alpha');
    await dialog.getByRole('button', { name: t['navigation.discardLeave'], exact: true }).click();
    assert.equal(await main.locator('form:visible').count(), 0);
    await main.getByRole('combobox', { name: t['integrations.bot'], exact: true }).selectOption('api-beta');
    for (const key of ['connectors.connectors', 'notifications.notifications', 'manage.memoryTools', 'team.title']) { await tab(key); assert.equal(await main.getByRole('combobox', { name: t['integrations.bot'], exact: true }).inputValue(), 'api-beta'); }
    checks.push(`${language}: shared beta context, draft retention, guarded switch, cancelled editor`);
    for (const theme of ['dark', 'light']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        for (const key of ['connectors.connectors', 'notifications.notifications', 'manage.memoryTools']) {
          await tab(key); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          assert.equal(await main.getByRole('combobox', { name: t['integrations.bot'], exact: true }).inputValue(), 'api-beta');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          if (key === 'manage.memoryTools') {
            assert.equal(await main.getByRole('region', { name: t['manage.statistics'], exact: true }).count(), 0);
            const input = main.getByRole('searchbox', { name: t['memory.search'], exact: true });
            // Search must be above the fold, not pushed below unrelated statistics.
            await input.waitFor(); const box = await input.boundingBox(); assert.ok(box && box.y + box.height < page.viewportSize().height);
            const empty = main.getByText(t['memory.empty'], { exact: true }); await empty.waitFor(); const emptyBox = await empty.boundingBox(); assert.ok(emptyBox && emptyBox.y < page.viewportSize().height);
          }
          const filename = `${language}-${theme}-${width}-${key.split('.')[0]}.png`;
          await page.screenshot({ path: join(out, filename), fullPage: true, animations: 'disabled' }); screenshots.push(filename);
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await tab('routine.title'); assert.ok((await main.innerText()).includes(t['settings.allBots']));
    await main.locator('[data-settings-navigation]').click();
    await click('bots.create');
    const editor = page.getByRole('dialog'); await editor.waitFor();
    // Native portal is outside the plugin page and retains plugin styles.
    assert.equal(await main.getByRole('dialog').count(), 0);
    await page.screenshot({ path: join(out, `${language}-native-create.png`), animations: 'disabled' });
    await page.keyboard.press('Escape'); await editor.waitFor({ state: 'detached' });
    checks.push(`${language}: 18 theme/viewport screens; native portal create and Escape`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(join(out, 'results.json'), JSON.stringify({ version, checks, screenshots, errors, syntheticModelRequests: host.requests(), realModelRequests: 0 }, null, 2) + '\n');
  console.log(JSON.stringify({ version, checks, screenshots: screenshots.length, out }));
} catch (error) { if (lastPage) { await writeFile(join(out, 'failure.txt'), await lastPage.locator('body').ariaSnapshot()); await lastPage.screenshot({ path: join(out, 'failure.png') }); } throw error; } finally { await browser?.close(); await host.stop(); }
