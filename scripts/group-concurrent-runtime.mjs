import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runner } from './deepening/b3-runner.mjs';
import { mockProfilePatch } from './deepening/mock-profile.mjs';
const root = process.cwd(), home = resolve(root, '.dsh-dev');
assert.equal(process.env.DSH_HOME, home); assert.ok(process.argv.includes('--mock-only'));
const long = process.argv.includes('--long'), crash = process.argv.includes('--crash-recovery');
const dir = resolve(home, 'group-concurrent', `${Date.now()}-${process.pid}`);
await mkdir(dir, { recursive: true });
const run = await runner(dir, 0, 'GROUP_CONCURRENT', { timeoutMs: long ? 420000 : 90000 }); run.env.DSH_HOME = home;
if (process.env.DSH_BOT_DSH_BIN) run.env.DSH_BOT_DSH_BIN = process.env.DSH_BOT_DSH_BIN;
let phase = 'version', cliVersion;
try {
  cliVersion = (await run.command(['--version'], 'version')).trim();
  const profile = `group-concurrent-${Date.now()}-${process.pid}`;
  phase = 'initialize'; await run.command(['--profile', profile, '--from-default-profile', 'web', '--dump-config'], phase);
  phase = 'install'; await run.command(['plugin', '--profile', profile, 'add', resolve(root, 'packages/dsh-bot')], phase);
  await writeFile(resolve(home, 'profiles', profile, 'cordis.patch.yml'), mockProfilePatch(dir,
    'packages/dsh-bot/tests/group-concurrent-profile.mjs', { outputDir: dir, long, crash }));
  const args = ['--profile', profile, '--no-open', '--host', '127.0.0.1', '--port', '0'];
  phase = 'host';
  if (crash) {
    const started = run.command(args, phase, true).then(() => ({ error: undefined }), error => ({ error }));
    const until = Date.now() + 75000;
    while (true) {
      if (await readFile(resolve(dir, 'crash-ready.json'), 'utf8').catch(() => undefined)) break;
      if (Date.now() > until) throw new Error('Crash fixture did not become ready');
      await delay(30);
    }
    run.stop(); const killed = await started;
    assert.ok(killed.error); assert.equal(run.commands.at(-1).signal, 'SIGKILL');
    await writeFile(resolve(home, 'profiles', profile, 'cordis.patch.yml'), mockProfilePatch(dir,
      'packages/dsh-bot/tests/group-concurrent-profile.mjs', { outputDir: dir, recover: true }));
    phase = 'recovery'; await run.command(args, phase, true);
  } else await run.command(args, phase, true);
  const result = JSON.parse(await readFile(resolve(dir, 'result.json'), 'utf8')); assert.equal(result.status, 'PASS');
  await writeFile(resolve(dir, 'summary.json'), JSON.stringify({ ...result, cliVersion, exactRc2: cliVersion === '0.2.1-rc.2' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', dir, cliVersion }));
} catch (error) {
  await writeFile(resolve(dir, 'summary.json'), JSON.stringify({ status: 'FAIL', phase, cliVersion, error: String(error) }, null, 2));
  console.error(JSON.stringify({ status: 'FAIL', dir, phase, error: String(error) })); process.exitCode = 1;
} finally { run.stop(); }
