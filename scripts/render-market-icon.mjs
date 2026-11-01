import { createRequire } from 'node:module';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Rasterize the existing plugin SVG; no generated artwork or altered branding.
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../packages/dsh-bot/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const executablePath = process.env.DSH_BOT_CHROMIUM;
if (!executablePath) throw new Error('Set DSH_BOT_CHROMIUM to an existing Chromium/Chrome executable');
await access(executablePath);
await mkdir(resolve(root, '.dsh-dev'), { recursive: true });
const temporary = await mkdtemp(resolve(root, '.dsh-dev/market-icon-'));
const output = resolve(root, 'packages/dsh-bot/assets/icon-256.png');
await mkdir(resolve(root, 'packages/dsh-bot/assets'), { recursive: true });
const previousTmp = process.env.TMPDIR;
process.env.TMPDIR = temporary;
let browser;
try {
  browser = await chromium.launch({ executablePath, headless: true, chromiumSandbox: true,
    env: { ...process.env, HOME: temporary, TMPDIR: temporary } });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  await page.route('**/*', route => route.abort());
  const svg = await readFile(resolve(root, 'packages/dsh-bot/icon.svg'), 'utf8');
  await page.setContent(`<style>html,body{margin:0;width:256px;height:256px;background:transparent}svg{display:block;width:256px;height:256px}</style>${svg}`);
  await page.screenshot({ path: output, omitBackground: true });
  console.log(output);
} finally {
  await browser?.close();
  if (previousTmp === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = previousTmp;
  await rm(temporary, { recursive: true, force: true });
}
