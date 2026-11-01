// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { PropsLocale, PropsRenderFactories } from '@deepseek-ai/dsh-client-ui-slots';
import { GroupMemberProcess } from '../../src/client/components/GroupMemberProcess.js';
import type { ExecutionBridge } from '../../src/client/group-execution.js';
import { click } from './helpers.js';

function chat(text: string, status = 'running', previous?: string): ChatSnapshot {
  const node = (key: string, value: string, anchorSeq: number, visibility = 'visible') => ({ key, kind: 'assistant-step', anchorSeq, visibility,
    data: { status, blocks: [{ kind: 'text', text: 'Do not render the reply twice' }, { kind: 'reasoning', text: value }] } });
  return { nodes: { values: () => [node('current', text, 20), node('hidden', 'Hidden obsolete text', 5, 'hidden'),
    ...(previous ? [node('previous', previous, 10)] : [])] } } as unknown as ChatSnapshot;
}
async function fixture() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const ctx = new Context();
  const states = new Map(['a', 'b', 'late'].map(id => [id, { snapshot: chat(`${id} original`), listeners: new Set<() => void>() }]));
  const releases: string[] = [];
  let finishLate: () => void = () => {};
  const late = new Promise<void>(resolve => { finishLate = resolve; });
  const retain = vi.fn(({ parentSessionId, childSessionId: id, mode }: { parentSessionId: string; childSessionId: string; mode: string }) => {
    expect(parentSessionId).toBe('group-root'); expect(mode).toBe('unknown');
    return { binding: { sessionId: id, session: { getSnapshot: () => ({ openState: 'open' }) } }, ready: id === 'late' ? late : Promise.resolve(), release: () => releases.push(id) };
  });
  const binding = vi.fn(({ sessionId }: { sessionId: string }) => {
    const state = states.get(sessionId); if (!state) throw new Error('missing');
    return { target: (target: string) => {
      expect(target).toBe('chat');
      return { getSnapshot: () => state.snapshot, subscribe: (listener: () => void) => { state.listeners.add(listener); return () => state.listeners.delete(listener); } };
    } };
  });
  ctx.provide('sessions', { retain } as never); ctx.provide('uiConversation', { binding } as never);
  const bridge = { ctx } as ExecutionBridge;
  const renderFactorySlot = vi.fn((name: string, props: { text: string; running: boolean }) => {
    expect(name).toBe('conversation.chat.reasoning.content');
    return <div data-native-reasoning="" data-streaming={props.running}>{props.text}</div>;
  });
  const element = document.createElement('div'); document.body.append(element); const root = createRoot(element);
  const render = async (ids: string[], readyToRead = true) => act(async () => root.render(ids.map(id => <GroupMemberProcess key={id} parentId="group-root" childId={id} readyToRead={readyToRead} bridge={bridge}
    renderFactorySlot={renderFactorySlot as PropsRenderFactories['renderFactorySlot']} t={((key: string) => key) as PropsLocale<'dsh-bot'>['t']} />)));
  return { ctx, states, releases, retain, binding, element, render, renderFactorySlot, finishLate,
    async update(id: string, snapshot: ChatSnapshot) { const state = states.get(id); if (!state) throw new Error('missing');
      await act(async () => { state.snapshot = snapshot; for (const listener of state.listeners) listener(); }); },
    async close() { await act(async () => root.unmount()); await ctx.fiber.dispose(); element.remove(); } };
}

it('renders exact live native reasoning separately for concurrent members and keeps the original text', async () => {
  const f = await fixture();
  try {
    await f.render(['a', 'b']);
    const a = f.element.querySelector('[data-group-member-process="a"]') as HTMLElement;
    const b = f.element.querySelector('[data-group-member-process="b"]') as HTMLElement;
    expect(a.textContent).toContain('a original'); expect(a.textContent).not.toContain('b original');
    await click(a.querySelector('button') as HTMLButtonElement);
    const full = '**完整原文**\n\nsecond line';
    await f.update('a', chat(full, 'running', 'earlier step'));
    expect([...a.querySelectorAll('[data-native-reasoning]')].map(n => n.textContent)).toEqual(['earlier step', full]);
    expect(b.querySelector('[data-native-reasoning]')).toBeNull();
    expect(a.textContent).not.toContain('Hidden obsolete text'); expect(a.textContent).not.toContain('Do not render the reply twice');
    expect(f.retain).toHaveBeenCalledTimes(2);
    await f.update('a', chat(full, 'interrupted'));
    expect(a.querySelector('[data-native-reasoning]')?.getAttribute('data-streaming')).toBe('false');
    expect(a.textContent).toContain(full);
    await f.render(['b']);
    expect(f.releases).toEqual(['a']); expect(f.states.get('a')?.listeners.size).toBe(0);
    expect(f.states.get('b')?.listeners.size).toBe(1);
  } finally { await f.close(); }
  expect(f.releases).toEqual(['a', 'b']); expect(f.states.get('b')?.listeners.size).toBe(0);
});

it('releases loading references and ignores late readiness after collapse', async () => {
  const f = await fixture();
  try {
    await f.render(['late']); await f.render([]);
    await act(async () => f.finishLate());
    expect(f.binding).not.toHaveBeenCalled(); expect(f.releases).toEqual(['late']);
  } finally { await f.close(); }
});

it('waits for native activation before reading a reserved child ID', async () => {
  const f = await fixture();
  try {
    await f.render(['a'], false); expect(f.retain).not.toHaveBeenCalled();
    await f.render(['a'], true); expect(f.retain).toHaveBeenCalledTimes(1);
    expect(f.element.textContent).toContain('a original');
  } finally { await f.close(); }
});

it('reports unavailable history without inventing reasoning or failing the group message', async () => {
  const f = await fixture();
  try {
    f.retain.mockImplementationOnce(() => { throw new Error('history unavailable'); });
    await f.render(['a']);
    expect(f.element.textContent).toBe('execution.unavailable');
    expect(f.renderFactorySlot).not.toHaveBeenCalled();
  } finally { await f.close(); }
});

it('recognizes native open errors even when the readiness promise resolves', async () => {
  const f = await fixture(); const release = vi.fn();
  try {
    f.retain.mockReturnValueOnce({ binding: { sessionId: 'a', session: { getSnapshot: () => ({ openState: 'error' }) } }, ready: Promise.resolve(), release });
    await f.render(['a']);
    expect(f.element.textContent).toBe('execution.unavailable'); expect(f.binding).not.toHaveBeenCalled();
  } finally { await f.close(); }
  expect(release).toHaveBeenCalledOnce();
});
