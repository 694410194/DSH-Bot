import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { Button, Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import type { GroupDelivery, GroupTurn, GroupView } from '../../shared/groups.js';
import type { BotRecord } from '../../shared/schema.js';
import type { ExecutionBridge } from '../group-execution.js';
import { aggregateStatistics, cachePercent, contextPercent, defaultStatisticsTurn, loadingStatistics, statisticsDeliveries, tokenTotal, type ChildStatistics } from '../group-statistics.js';
import { Modal } from './Modal.js';
import styles from '../styles/groups.module.css';

type Localized = PropsLocale<'dsh-bot'>;
const emptyPreference = { subscribe: () => () => {}, getSnapshot: () => undefined };
export function useStatisticsMode(bridge: ExecutionBridge) {
  const form = useMemo(() => {
    const scope = bridge.ctx.get('configForms')?.get('ui-chat');
    return scope ? { subscribe: (listener: () => void) => scope.subscribe(listener), getSnapshot: () => scope.getSnapshot() } : emptyPreference;
  }, [bridge]);
  const snapshot = useSyncExternalStore(form.subscribe, form.getSnapshot);
  const value = snapshot?.value as { performanceUsage?: string } | undefined;
  return value?.performanceUsage === 'detailed' ? 'detailed' : 'compact';
}
type Worker = { delivery: GroupDelivery; conflict: boolean };
/** No reads for reserved IDs. Reset the visible snapshot synchronously on scope changes. */
function useStatistics(bridge: ExecutionBridge, parentId: string, workers: Worker[]) {
  const signature = JSON.stringify(workers.map(({ delivery, conflict }) =>
    delivery.childSessionId && !conflict && !['pending', 'starting'].includes(delivery.state) ? delivery.childSessionId : null));
  const sources = useMemo(() => (JSON.parse(signature) as Array<string | null>).map(childId =>
    childId ? bridge.statistics?.source(parentId, childId) : undefined), [bridge, parentId, signature]);
  const [state, setState] = useState<{ sources: typeof sources; values: ChildStatistics[] }>();
  useEffect(() => {
    let live = true;
    const refresh = () => { if (live) setState({ sources, values: sources.map(source => source?.getSnapshot() ?? loadingStatistics) }); };
    const off = sources.map(source => source?.subscribe(refresh)); refresh();
    return () => { live = false; for (const dispose of off) dispose?.(); };
  }, [sources]);
  return state?.sources === sources ? state.values : sources.map(() => loadingStatistics);
}
const number = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
const tokens = (value: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
function UsageDetails({ value, t }: { value: ChildStatistics } & Localized) {
  const context = contextPercent(value);
  return <dl className={styles.statisticsDetails}>
    {value.modelSelection?.lastUsed && <><dt>{t('statistics.model')}</dt><dd>{value.modelSelection.lastUsed.provider} / {value.modelSelection.lastUsed.model}</dd></>}
    {value.activity && <><dt>{t('statistics.activity')}</dt><dd>{t('statistics.counts', value.activity)}</dd></>}
    {value.usage && tokenTotal(value.usage) > 0 ? <>
      <dt>{t('statistics.input')}</dt><dd>{number(value.usage.uncachedInputTokens)}</dd>
      <dt>{t('statistics.read')}</dt><dd>{number(value.usage.cacheReadTokens)}</dd>
      <dt>{t('statistics.write')}</dt><dd>{number(value.usage.cacheWriteTokens)}</dd>
      <dt>{t('statistics.output')}</dt><dd>{number(value.usage.outputTokens)}</dd>
    </> : <><dt>{t('statistics.usage')}</dt><dd>{t('statistics.noUsage')}</dd></>}
    <dt>{t('statistics.context')}</dt><dd>{context === undefined ? t('statistics.noEstimate') : t('statistics.contextEstimate', { percent: number(context) })}</dd>
  </dl>;
}
export function GroupMemberStatistics({ bridge, parentId, workers, t }: { bridge: ExecutionBridge; parentId: string; workers: Worker[] } & Localized) {
  const values = useStatistics(bridge, parentId, workers);
  const sum = aggregateStatistics(values), single = workers.length === 1;
  const value = values[0] ?? loadingStatistics;
  const mode = useStatisticsMode(bridge);
  const [open, setOpen] = useState(false);
  const cache = sum.usage && tokenTotal(sum.usage) > 0 ? cachePercent(sum.usage) : undefined;
  const context = single ? contextPercent(value) : undefined;
  const partial = workers.some((worker, i) => worker.conflict || !worker.delivery.childSessionId || ['pending', 'starting'].includes(worker.delivery.state) || values[i]?.state !== 'ready');
  const status = (worker: Worker, item: ChildStatistics) => worker.conflict ? 'conflict' : !worker.delivery.childSessionId || ['pending', 'starting'].includes(worker.delivery.state) ? 'waiting' : item.state === 'loading' ? 'loading' : item.state === 'unavailable' ? 'unavailable' : undefined;
  const missing = single && workers[0] ? status(workers[0], value) : undefined;
  return <div className={styles.memberStatistics} data-group-member-statistics={workers[0]?.delivery.childSessionId ?? workers[0]?.delivery.id}>
    {missing ? <span>{t(`statistics.${missing}`)}</span> : <>
      {!single && <span>{t('statistics.executions', { count: workers.length })}</span>}
      {mode === 'detailed' && sum.activity && <span>{t('statistics.counts', sum.activity)}</span>}
      {single && value.activity && value.activity.decodeMs > 0 && <span title={t('statistics.speed')}>{number(value.activity.decodeTokens / (value.activity.decodeMs / 1000))} tok/s</span>}
      {sum.usage && tokenTotal(sum.usage) > 0 ? <>
        {mode === 'detailed' && <span>{tokens(tokenTotal(sum.usage))} tok</span>}
        {cache !== undefined && <span>{t('statistics.cache', { percent: number(cache) })}</span>}
      </> : <span>{t('statistics.noUsage')}</span>}
      {single && <span title={t('statistics.lastEstimate')}>{context === undefined ? t('statistics.noEstimate') : t('statistics.contextEstimate', { percent: number(context) })}</span>}
      {partial && <span>{t('statistics.incomplete')}</span>}
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{t('statistics.details')}</Button>
      {open && <Modal title={t('statistics.details')} description={t('statistics.scope')} onClose={() => setOpen(false)} t={t}>
        {workers.map((worker, i) => <section key={worker.delivery.childSessionId ?? worker.delivery.id}>
          {!single && <h3>{t('statistics.execution', { count: i + 1 })} · {t(`groups.${worker.delivery.state}`)}</h3>}
          {status(worker, values[i] ?? loadingStatistics) ? <p>{t(`statistics.${status(worker, values[i] ?? loadingStatistics) ?? 'unavailable'}`)}</p> : <UsageDetails value={values[i] ?? loadingStatistics} t={t} />}
        </section>)}
      </Modal>}
    </>}
  </div>;
}
export function GroupStatisticsBar({ view, bridge, sent, bots = [], t }: {
  view: GroupView; bridge: ExecutionBridge; bots?: BotRecord[]; sent?: { turnId: string; followup: boolean; sequence: number };
} & Localized) {
  const [selected, setSelected] = useState<string>();
  const [pinned, setPinned] = useState(false), [menu, setMenu] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => { if (selected === undefined) setSelected(defaultStatisticsTurn(view.turns)?.id); }, [selected, view.turns]);
  useEffect(() => { if (sent) { setSelected(sent.turnId); setPinned(sent.followup); } }, [sent]);
  const turn = view.turns.find(row => row.id === selected) ?? (selected === undefined ? defaultStatisticsTurn(view.turns) : undefined);
  const workers = turn ? statisticsDeliveries(view, turn.id) : [];
  const values = useStatistics(bridge, view.group.rootSessionId, workers);
  const mode = useStatisticsMode(bridge), sum = aggregateStatistics(values);
  const cache = sum.usage && tokenTotal(sum.usage) > 0 ? cachePercent(sum.usage) : undefined;
  const members = [...new Set(workers.map(row => row.delivery.memberId))];
  const readable = members.filter(id => workers.every((row, i) => row.delivery.memberId !== id || (!row.conflict && values[i]?.state === 'ready'))).length;
  const expected = new Set([...(turn?.orderedMemberIds ?? []), ...members]).size;
  const partial = readable < expected || values.some(value => !value.activity || !value.usage);
  const emptyState = !workers.length || workers.every(({ delivery }) => !delivery.childSessionId || ['pending', 'starting'].includes(delivery.state)) ? 'waiting'
    : values.some(value => value.state === 'loading') ? 'loading' : !sum.readable ? 'unavailable' : 'noUsage';
  const other = view.turns.filter(row => row.id !== turn?.id && ['accepted', 'running', 'paused'].includes(row.state)).length;
  const title = (row: GroupTurn) => view.messages.find(message => message.id === row.inputMessageId)?.text ?? `${t('statistics.historical')} · ${new Date(row.createdAt).toLocaleString()}`;
  const label = (d: GroupDelivery) => bots.find(bot => bot.id === d.bot.botId && bot.createdAt === d.bot.botCreatedAt)?.name ??
    view.messages.find(message => message.speaker?.bot.botId === d.bot.botId && message.speaker.bot.botCreatedAt === d.bot.botCreatedAt)?.speaker?.name ?? d.bot.botId;
  if (!view.turns.length) return null;
  return <div className={styles.statisticsBar} data-group-statistics-bar data-statistics-turn={turn?.id}>
    <Menu open={menu} onClose={() => setMenu(false)} anchor={<Button size="sm" variant="ghost" aria-label={t('statistics.select')} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{t(pinned ? 'statistics.selected' : 'statistics.current')} ▾</Button>}
      items={[{ id: '__latest', label: t('statistics.followLatest') }, ...[...view.turns].sort((a, b) => b.createdAt - a.createdAt).map(row => ({ id: row.id, label: `${title(row).slice(0, 64)} · ${t(`groups.${row.state}`)}` }))]}
      onSelect={id => { setMenu(false); setPinned(id !== '__latest'); setSelected(id === '__latest' ? [...view.turns].sort((a, b) => b.createdAt - a.createdAt)[0]?.id : id); }} />
    {turn ? <>
      <span className={styles.statisticsStatus}>{t(`statistics.status.${turn.state}`)}</span>
      {mode === 'detailed' && sum.activity && <span className={styles.statisticsWide}>{t('statistics.counts', sum.activity)}</span>}
      {mode === 'detailed' && sum.usage && tokenTotal(sum.usage) > 0 ? <span data-group-token-total={tokenTotal(sum.usage)}>{tokens(tokenTotal(sum.usage))} tok</span> : !sum.reported && <span>{t(`statistics.${emptyState}`)}</span>}
      {cache !== undefined && <span className={styles.statisticsWide}>{t('statistics.cache', { percent: number(cache) })}</span>}
      {partial && <span className={styles.statisticsWide}>{t('statistics.incomplete')} · {t('statistics.partial', { count: readable, total: expected })}</span>}
      {other > 0 && <Button className={styles.statisticsWide} size="sm" variant="ghost" onClick={() => setMenu(true)}>{t('statistics.other', { count: other })}</Button>}
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{t('statistics.details')}</Button>
      {open && <Modal title={t('statistics.details')} description={t('statistics.scope')} onClose={() => setOpen(false)} t={t}>
        <p>{title(turn)}</p><p>{t('statistics.partial', { count: readable, total: expected })}</p>
        {workers.map((worker, i) => <section key={worker.delivery.childSessionId ?? worker.delivery.id}><h3>{label(worker.delivery)} · {t(`groups.${worker.delivery.state}`)}</h3>
          {worker.conflict ? <p>{t('statistics.conflict')}</p> : values[i]?.state === 'ready' ? <UsageDetails value={values[i] ?? loadingStatistics} t={t} /> : <p>{t(`statistics.${values[i]?.state === 'unavailable' ? 'unavailable' : 'loading'}`)}</p>}
        </section>)}
      </Modal>}
    </> : <span>{t('statistics.unavailable')}</span>}
  </div>;
}
