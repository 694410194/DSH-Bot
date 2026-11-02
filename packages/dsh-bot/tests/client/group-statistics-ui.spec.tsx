// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Context } from '@deepseek-ai/cordis';
import { expect, it, vi } from 'vitest';
import type { ISessions, SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ExecutionBridge } from '../../src/client/group-execution.js';
import { GroupStatsSource } from '../../src/client/group-statistics.js';
import { GroupStatisticsBar, GroupMemberStatistics } from '../../src/client/components/GroupStatistics.js';
import type { GroupDelivery, GroupTurn } from '../../src/shared/groups.js';
import { view } from './group-fixture.js';
import { click } from './helpers.js';
import en from '../../locale/en.json';

async function fixture() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const ctx = new Context(), data = view(), releases: string[] = [], listeners = new Set<() => void>();
  const preference = { value: { performanceUsage: 'detailed' } };
  const form = { preference, getSnapshot() { return this.preference; }, subscribe: (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; } };
  const retain = vi.fn((target: { childSessionId: string }) => {
    const usage = { uncachedInputTokens: 100, cacheReadTokens: 40, cacheWriteTokens: 0, outputTokens: 20 };
    const binding = { session: { getSnapshot: () => ({ openState: 'ready' }), subscribe: () => () => {}, projections: {
      faceOf: (key: string) => ({ subscribe: () => () => {}, getSnapshot: () => key === 'tokenUsage' ? usage : undefined }),
    } } } as unknown as SessionBinding;
    return { binding, ready: Promise.resolve(binding), release: () => releases.push(target.childSessionId) };
  });
  const statistics = new GroupStatsSource(() => ({ retain }) as unknown as ISessions);
  const bridge = { ctx: { get: (name: string) => name === 'configForms' ? { get: () => form } : undefined }, statistics } as unknown as ExecutionBridge;
  for (let n = 0; n < 100; n++) {
    const id = `t${n}`;
    data.turns.push({ id, createdAt: n, state: 'idle', orderedMemberIds: Array.from({ length: 16 }, (_, m) => `m${m}`), inputMessageId: `q${n}` } as GroupTurn);
    data.messages.push({ id: `q${n}`, seq: n, at: n, text: `Question ${n}`, turnId: id, authorKind: 'user' });
    for (let m = 0; m < 16; m++) data.deliveries.push({ id: `${id}-d${m}`, turnId: id, memberId: `m${m}`, childSessionId: `${id}-c${m}`, state: 'completed', bot: { botId: 'alpha', botCreatedAt: 1 } } as GroupDelivery);
  }
  const element = document.createElement('div'); document.body.append(element); const root = createRoot(element);
  const t = ((key: string, params: Record<string, unknown> = {}) => {
    let text = en.ui[key as keyof typeof en.ui] ?? key;
    for (const [name, value] of Object.entries(params)) text = text.replace(`{${name}}`, String(value)); return text;
  }) as PropsLocale<'dsh-bot'>['t'];
  const render = async (sent?: { turnId: string; followup: boolean; sequence: number }) => act(async () => root.render(<GroupStatisticsBar view={data} bridge={bridge} sent={sent} t={t} />));
  await render();
  return { data, element,
    async renderMember() { await act(async () => root.render(<GroupMemberStatistics bridge={bridge} parentId="p" workers={data.deliveries.slice(0, 2).map(delivery => ({ delivery: { ...delivery, memberId: 'legacy', state: 'cancelled' }, conflict: false }))} t={t} />)); },
    retain, releases, form, listeners, render,
    async select(text: string) { await click(element.querySelector('[aria-haspopup="menu"]') as HTMLButtonElement); const target = [...element.querySelectorAll('button')].find(b => b.textContent?.startsWith(text)); assert.ok(target); await click(target); },
    async close() { await act(async () => root.unmount()); statistics.dispose(); await ctx.fiber.dispose(); element.remove(); } };
}
it('retains only 16 selected workers across 100 questions and never follows streaming updates after a manual choice', async () => {
  const f = await fixture();
  try {
    expect(f.retain).toHaveBeenCalledTimes(16); expect(f.element.querySelector('[data-statistics-turn]')?.getAttribute('data-statistics-turn')).toBe('t99');
    await f.select('Question 0 ·'); expect(f.releases).toHaveLength(16); expect(f.retain).toHaveBeenCalledTimes(32);
    assert.ok(f.data.turns[99]); f.data.turns[99].state = 'running'; await f.render();
    expect(f.element.querySelector('[data-statistics-turn]')?.getAttribute('data-statistics-turn')).toBe('t0');
    await f.render({ turnId: 't99', followup: false, sequence: 1 });
    expect(f.element.querySelector('[data-statistics-turn]')?.getAttribute('data-statistics-turn')).toBe('t99');
    await f.render({ turnId: 't0', followup: true, sequence: 2 });
    expect(f.element.querySelector('[data-statistics-turn]')?.getAttribute('data-statistics-turn')).toBe('t0');
  } finally { await f.close(); }
  expect(f.releases).toHaveLength(f.retain.mock.calls.length); expect(f.listeners.size).toBe(0);
});
it('follows accepted native preference changes without displaying stale tokens', async () => {
  const f = await fixture();
  try {
    expect(f.element.querySelector('[data-group-token-total="2560"]')).not.toBeNull();
    await act(async () => { f.form.preference = { value: { performanceUsage: 'compact' } }; for (const listener of f.listeners) listener(); });
    expect(f.element.querySelector('[data-group-token-total]')).toBeNull(); expect(f.element.textContent).toContain('Cache 28.6%');
  } finally { await f.close(); }
});

it('shows one cumulative legacy member row with separate execution details and no combined speed/context', async () => {
  const f = await fixture();
  try {
    await f.renderMember();
    expect(f.element.querySelectorAll('[data-group-member-statistics]')).toHaveLength(1);
    expect(f.element.textContent).toContain('320 tok'); expect(f.element.textContent).toContain('2 executions');
    expect(f.element.textContent).not.toContain('tok/s'); expect(f.element.textContent).not.toContain('Context ≈');
    const details = [...f.element.querySelectorAll('button')].find(b => b.textContent === 'Statistics'); assert.ok(details); await click(details);
    expect(f.element.textContent).toContain('Execution 1'); expect(f.element.textContent).toContain('Execution 2');
  } finally { await f.close(); }
});
