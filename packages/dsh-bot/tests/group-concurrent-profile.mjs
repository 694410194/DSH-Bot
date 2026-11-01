import '../../../scripts/deepening/network-guard.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
export const name = 'group-concurrent-profile';
export const inject = ['loader', 'llm', 'agents', 'sessions', 'dshBots', 'subagents'];
class Adapter extends LlmAdapter {
  calls = []; active = new Set(); maxActive = 0; behavior = async () => ({});
  async listModels(provider) { return [{ provider, id: 'fixture', name: 'Concurrent fixture' }]; }
  async *stream(options) {
    const call = { sessionId: options.sessionId, input: JSON.stringify(options), at: Date.now(), signal: options.signal };
    this.calls.push(call); this.active.add(call); this.maxActive = Math.max(this.maxActive, this.active.size);
    try {
      const answer = await this.behavior(call); options.signal?.throwIfAborted();
      yield { type: 'block-start', index: 0, blockType: 'reasoning' };
      yield { type: 'reasoning-delta', index: 0, text: 'Synthetic process only' };
      yield { type: 'block-end', index: 0, block: { type: 'reasoning', text: 'Synthetic process only' } };
      if (answer.tool) {
        const id = `call-${this.calls.indexOf(call)}`, args = JSON.stringify(answer.tool);
        yield { type: 'block-start', index: 1, blockType: 'tool-call' };
        yield { type: 'tool-call-delta', index: 1, id, name: 'group_message', argumentsDelta: args };
        yield { type: 'block-end', index: 1, block: { type: 'tool-call', id, name: 'group_message', arguments: args } };
        yield { type: 'finish', reason: { kind: 'tool-calls' } };
      } else {
        const text = answer.text ?? 'Done'; yield { type: 'block-start', index: 1, blockType: 'text' };
        yield { type: 'text-delta', index: 1, text }; yield { type: 'block-end', index: 1, block: { type: 'text', text } };
        yield { type: 'finish', reason: { kind: 'stop' } };
      }
    } finally { call.ended = Date.now(); this.active.delete(call); }
  }
}
export function apply(ctx, config) {
  ctx.effect(() => {
    const lifetime = new AbortController(), adapter = new Adapter(), checks = [], releases = [];
    const timer = setTimeout(() => lifetime.abort(new Error('Fixture timeout')), config.long ? 410000 : 75000);
    let phase = 'startup'; const mark = value => { phase = value; console.log(`GROUP_CONCURRENT_PHASE ${value}`); };
    const wait = async f => { for (;;) { lifetime.signal.throwIfAborted(); const v = await f(); if (v) return v; await delay(15, undefined, { signal: lifetime.signal }); } };
    const ok = (name, value) => { assert.ok(value, name); checks.push(name); };
    const hold = call => new Promise(resolve => { call.release = () => resolve({ text: 'Released' }); call.signal?.addEventListener('abort', () => resolve({}), { once: true }); });
    const run = (async () => {
      await ctx.loader.await(); releases.push(ctx.llm.registerAdapter(['dp-b6b'], adapter)); await ctx.dshBots.waitUntilReady();
      const groups = await wait(() => ctx.get('dshBotGroups'));
      if (config.recover) {
        const { readFile } = await import('node:fs/promises');
        const previous = JSON.parse(await readFile(resolve(config.outputDir, 'crash-ready.json'), 'utf8'));
        const view = await groups.view(previous.key), turn = view.turns.find(t => t.id === previous.turnId);
        ok('cold restart retains the uncertain task instead of replaying it', turn.state === 'recovery_needed');
        ok('in-flight native execution is unknown after a crash', view.deliveries.some(d => d.turnId === turn.id && d.state === 'unknown' && d.reasonCode === 'host-restarted'));
        await groups.list(); await groups.view(previous.key); await delay(100);
        ok('cold views and root restoration perform zero model requests', adapter.calls.length === 0);
        await writeFile(resolve(config.outputDir, 'result.json'), JSON.stringify({ status: 'PASS', checks, modelRequests: 0, crashedTurn: turn.id }, null, 2));
        console.log('GROUP_CONCURRENT_DONE'); return;
      }

      const bots = []; for (let i = 0; i < 5; i++) bots.push(await ctx.dshBots.create({ id: `parallel-${i}`, name: `parallel-${i}`, template: 'minimal', model: { provider: 'dp-b6b', model: 'fixture' } }));
      const g = await groups.create({ operationId: 'group-concurrent', name: 'Concurrent verification', members: bots.map(b => ({ botId: b.id, botCreatedAt: b.createdAt })), mode: 'natural', historyConfirmed: true });
      const key = { groupId: g.id, groupCreatedAt: g.createdAt }, members = (await groups.view(key)).members;
      const send = (operationId, memberIds) => groups.send(key, { operationId, text: operationId, memberIds, expectedMembershipRevision: 1 });
      const viewTurn = async id => (await groups.view(key)).turns.find(t => t.id === id);
      const settled = id => wait(async () => { const t = await viewTurn(id); return !['accepted', 'running'].includes(t.state) && t; });
      mark('first-wave'); adapter.behavior = hold;
      const first = await send('CONCURRENT'); await wait(() => adapter.active.size === 4 && [...adapter.active].every(c => c.release));
      ok('default four native streams overlap', adapter.maxActive === 4);
      ok('fifth member waits for shared capacity', adapter.calls.length === 4);
      adapter.calls[0].release(); await wait(() => adapter.calls.length === 5 && adapter.calls[4].release);
      for (const c of adapter.calls) c.release(); const firstResult = await settled(first.id);
      ok('all five members finish and task becomes naturally idle', firstResult.state === 'idle');
      ok('first wave excludes completion-order peer output', adapter.calls.slice(0, 5).every(c => !c.input.includes('Released')));
      mark('idle-multiround'); const before = adapter.calls.length; let asked = false, aId;
      adapter.behavior = async call => {
        if (!aId) aId = call.sessionId;
        if (call.sessionId === aId && !asked) { asked = true; return { tool: { action: 'send', to: members[1].id, text: 'Verify number 42', requestReply: true } }; }
        if (call.sessionId !== aId) {
          await wait(async () => (await groups.view(key)).deliveries.some(d => d.childSessionId === aId && d.state === 'completed'));
          return { text: 'Verified 42' };
        }
        return { text: call.input.includes('Verified 42') ? 'Integrated 42' : 'Waiting for verification' };
      };
      const multi = await send('MULTI', [members[0].id]); const multiResult = await settled(multi.id);
      const mv = await groups.view(key), mr = mv.deliveries.filter(d => d.turnId === multi.id && !d.requestDigest);
      await writeFile(resolve(config.outputDir, 'multiround.json'), JSON.stringify({ multiResult, deliveries: mv.deliveries.filter(d => d.turnId === multi.id), calls: adapter.calls.slice(before) }, null, 2));
      ok('concrete request and return complete without orchestration model', multiResult.state === 'idle' && mv.messages.some(m => m.turnId === multi.id && m.text === 'Integrated 42'));
      const aRows = mr.filter(d => d.memberId === members[0].id && d.childSessionId);
      ok('idle resume keeps one durable child per task member', aRows.length === 2 && aRows[0].childSessionId === aRows[1].childSessionId);
      ok('each activation has distinct public run attribution', aRows.every(d => d.nativeRunId && d.childMessageId) && new Set(aRows.map(d => d.nativeRunId)).size === 2);
      mark('busy-inbox'); const busyStart = adapter.calls.length; let sent = false;
      adapter.behavior = async call => {
        const isA = call.input.includes('Target: \\"parallel-0\\"') || call.input.includes('Target: "parallel-0"');
        if (isA && !sent) { await wait(() => adapter.active.size === 2); sent = true; return { tool: { action: 'send', to: members[1].id, text: 'BUSY_REQUEST', requestReply: false } }; }
        if (!isA && !call.input.includes('BUSY_REQUEST')) return hold(call);
        return { text: call.input.includes('BUSY_REQUEST') ? 'Busy request processed' : 'Request sent' };
      };
      const busy = await send('BUSY', [members[0].id, members[1].id]);
      await wait(async () => (await groups.view(key)).deliveries.some(d => d.turnId === busy.id && d.reasonCode === 'inbox-accepted'));
      for (const c of adapter.calls.slice(busyStart)) c.release?.(); await settled(busy.id);
      const bv = await groups.view(key), br = bv.deliveries.filter(d => d.turnId === busy.id);
      ok('busy request is durably joined to the active delivery', br.some(d => d.joinedDeliveryId && d.childMessageId && d.reasonCode === 'inbox-accepted'));
      ok('busy request does not create another member activation', br.filter(d => d.memberId === members[1].id && !d.joinedDeliveryId && !d.requestDigest).length === 1);
      mark('independent-stop'); adapter.behavior = hold;
      const stopped = await send('STOP', [members[0].id, members[1].id]); await wait(() => adapter.active.size === 2 && [...adapter.active].every(c => c.release));
      const st = await viewTurn(stopped.id); await groups.stopMember(key, st.id, members[0].id, st.revision);
      await wait(() => adapter.active.size === 1); [...adapter.active][0].release(); await settled(st.id);
      const sr = (await groups.view(key)).deliveries.filter(d => d.turnId === st.id);
      ok('stopping one member preserves the independent peer', sr.find(d => d.memberId === members[0].id).state === 'cancelled' && sr.find(d => d.memberId === members[1].id).state === 'completed');
      mark('progress-idle'); let published = false; const progressStart = adapter.calls.length;
      adapter.behavior = async () => { if (published) return { text: 'Progress finished' }; published = true; return { tool: { action: 'send', kind: 'progress', text: 'Progress without request' } }; };
      const progress = await send('PROGRESS', [members[0].id]); await settled(progress.id);
      ok('ordinary progress does not wake idle members', new Set(adapter.calls.slice(progressStart).map(c => c.sessionId)).size === 1);
      mark('budget-pause-continue'); const allowance = ctx.dshBots.config.groupMaxContinuations;
      ctx.dshBots.config.groupMaxContinuations = 2;
      const budgetCalls = adapter.calls.length;
      adapter.behavior = async call => {
        const count = adapter.calls.slice(budgetCalls).filter(c => c.sessionId === call.sessionId).length;
        if (count % 2 === 0) return { text: 'Request handed off' };
        await wait(() => adapter.active.size === 1);
        const isA = call.input.includes('Target: \\"parallel-0\\"') || call.input.includes('Target: "parallel-0"');
        return { tool: { action: 'send', to: members[isA ? 1 : 0].id, text: 'Next concrete budget step' } };
      };
      const budget = await send('BUDGET', [members[0].id]); const paused = await settled(budget.id);
      ok('initial wave excluded from automatic allowance and pending work pauses visibly', paused.state === 'paused' && paused.automaticExecutions === 2);
      const countAtPause = adapter.calls.length; await delay(60); ok('paused task starts no hidden work', adapter.calls.length === countAtPause);
      await wait(() => groups.lifecycle().workers === 0);
      await groups.continueTurn(key, paused.id, paused.revision); const pausedAgain = await settled(budget.id);
      ok('explicit continue grants another bounded batch without replay', pausedAgain.state === 'paused' && pausedAgain.automaticExecutions === 4);
      const budgetRows = (await groups.view(key)).deliveries.filter(d => d.turnId === budget.id && d.startedAt && !d.requestDigest);
      ok('continuation keeps the same two native children', new Set(budgetRows.map(d => d.childSessionId)).size === 2 && budgetRows.length === 5);
      await groups.cancel(key, pausedAgain.id, pausedAgain.revision); ctx.dshBots.config.groupMaxContinuations = allowance;
      if (config.crash) {
        mark('crash-ready'); adapter.behavior = hold; const interrupted = await send('CRASH', [members[0].id, members[1].id]);
        await wait(() => adapter.active.size === 2 && [...adapter.active].every(c => c.release));
        await writeFile(resolve(config.outputDir, 'crash-ready.json'), JSON.stringify({ key, turnId: interrupted.id, checks }, null, 2));
        await new Promise(resolve => lifetime.signal.addEventListener('abort', resolve, { once: true })); return;
      }
      if (config.long) {
        mark('long-task'); adapter.behavior = hold; const long = await send('LONG', [members[0].id]); await wait(() => adapter.active.size === 1 && [...adapter.active][0].release);
        const started = Date.now(); await delay(305000, undefined, { signal: lifetime.signal });
        const longReceipt = { active: adapter.active.size, state: (await viewTurn(long.id)).state, elapsedMs: Date.now() - started };
        await writeFile(resolve(config.outputDir, 'long-task.json'), JSON.stringify(longReceipt, null, 2));
        ok('default task remains active beyond five minutes', longReceipt.active === 1 && longReceipt.state === 'running' && longReceipt.elapsedMs > 300000);
        [...adapter.active][0].release(); ok('long task completes after explicit synthetic release', (await settled(long.id)).state === 'idle');
      }
      ok('group root never executes a model', adapter.calls.every(c => c.sessionId !== g.rootSessionId));
      await writeFile(resolve(config.outputDir, 'result.json'), JSON.stringify({ status: 'PASS', checks, modelRequests: adapter.calls.length, maxConcurrent: adapter.maxActive }, null, 2));
      console.log('GROUP_CONCURRENT_DONE');
    })().catch(async error => { await writeFile(resolve(config.outputDir, 'result.json'), JSON.stringify({ status: 'FAIL', phase, error: String(error), checks, calls: adapter.calls }, null, 2)); console.error('GROUP_CONCURRENT_FAILED', phase, error); }).finally(() => clearTimeout(timer));
    return async () => { lifetime.abort(); for (const c of adapter.calls) c.release?.(); await run; for (const off of releases.reverse()) off(); };
  }, 'dsh-bot: concurrent runtime fixture');
}
