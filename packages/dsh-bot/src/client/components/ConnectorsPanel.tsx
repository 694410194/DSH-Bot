import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { useSettingsLeave } from './SettingsNavigation.js';
import { useState } from 'react';
import { type Connector, sameBot } from '../../shared/integrations.js';
import { IntegrationFrame, useIntegrationPanel, type IntegrationPanelProps } from './IntegrationFrame.js';
import { ConnectorEditor } from './ConnectorEditor.js';
export function ConnectorsPanel(props: IntegrationPanelProps & { active?: boolean }) {
  const { actions, t } = props;
  const state = useIntegrationPanel(actions, props.bots);
  const { data, bot, owner, busy, perform } = state;
  const leave = useSettingsLeave();
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<{ definition?: Connector; version: number }>({ version: 0 });
  return (
    <IntegrationFrame {...props} state={state} title="connectors">
      <p>{t('connectors.sharedDefinitions')}</p>
      {!data.definitions.length && <p>{t('connectors.empty')}</p>}
      <Button variant="primary" disabled={busy} onClick={() => leave(() => { setSelection(old => ({ version: old.version + 1 })); setEditing(true); })}>{t('connectors.newConnector')}</Button>
      <ul>
        {data.definitions.map((d) => (
          <li key={d.id}>
            <Button type="button" disabled={busy} onClick={() => leave(() => { setSelection((old) => ({ definition: d, version: old.version + 1 })); setEditing(true); })}>
              {d.label} · {d.serverName} · v{d.revision}
            </Button>
            {owner && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  void perform(async () => {
                    const a = data.assignments.find((a) => sameBot(a.bot, owner) && a.connectorId === d.id);
                    await actions.write(() =>
                      actions.connectors().saveAssignment(
                        {
                          id: a?.id ?? `assignment:${crypto.randomUUID()}`,
                          bot: owner,
                          connectorId: d.id,
                          enabled: !a?.enabled,
                          overrides: a?.overrides ?? {},
                        },
                        a?.revision ?? 0,
                      ),
                    );
                  });
                }}
              >
                {t(
                  data.assignments.some((a) => owner && sameBot(a.bot, owner) && a.connectorId === d.id && a.enabled)
                    ? 'connectors.disconnect'
                    : 'connectors.assign',
                )}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {editing && <ConnectorEditor
        key={`${owner?.botId}:${owner?.botCreatedAt}:${selection.version}`}
        actions={actions}
        busy={busy}
        perform={perform}
        active={props.active ?? true}
        definition={selection.definition}
        onCancel={() => leave(() => setEditing(false))}
        onSaved={() => setEditing(false)}
        t={t}
      />}
      {owner && (data.assignments.some(a => sameBot(a.bot, owner)) || Boolean(bot?.mcpServers.length)) && (
        <>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              void perform(() => actions.write(() => actions.connectors().applyIdle(owner)));
            }}
          >
            {t('connectors.apply')}
          </Button>
          {bot?.mcpServers.length ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                void perform(() => actions.write(() => actions.connectors().importLegacy(owner)));
              }}
            >
              {t('connectors.importLegacy')}
            </Button>
          ) : null}
          <p>{t('connectors.firstOpen')}</p>
          <ul>
            {data.runtime
              .filter((r) => data.assignments.some((a) => a.id === r.assignmentId && sameBot(a.bot, owner)))
              .map((r) => (
                <li key={`${r.sessionId}:${r.assignmentId}`}>
                  {r.sessionId} · {t(`connectors.${r.state}`)} · {r.appliedRevision ?? '—'}/{r.desiredRevision} ·{' '}
                  {r.toolCount} {r.reasonCode ?? ''}
                </li>
              ))}
          </ul>
        </>
      )}
    </IntegrationFrame>
  );
}
