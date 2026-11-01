import type { Context } from '@deepseek-ai/cordis';

export type BotsSection = 'bots' | 'groups' | 'recent';
export interface PageIdentity { id: string; createdAt: number }
export interface ListPosition { query: string; hidden: boolean }
export interface BotsPageNavigation {
  section: BotsSection;
  group?: PageIdentity;
  lists: Record<'bots' | 'recent', ListPosition>;
  scroll: Record<BotsSection, number>;
}

export function pageNavigation(): BotsPageNavigation {
  return { section: 'bots', lists: { bots: { query: '', hidden: false }, recent: { query: '', hidden: false } },
    scroll: { bots: 0, groups: 0, recent: 0 } };
}

/** Display state only: survives native panel remounts, never stores settings or credentials. */
export function createPageNavigation(ctx: Context): BotsPageNavigation {
  const state = pageNavigation();
  ctx.effect(() => () => { Object.assign(state, pageNavigation()); delete state.group; }, 'dsh-bot: page navigation');
  return state;
}
