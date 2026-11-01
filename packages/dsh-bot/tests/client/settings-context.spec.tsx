// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { bot, button, click, field, fill, mountClient, submit } from './helpers.js';
import { openSettings, refreshBots } from './bot-ui-helpers.js';
import { requireValue } from './test-required.js';
import { policySchema } from '../../src/shared/integrations.js';
import en from '../../locale/en.json';
const t = en.ui;
const bots = [bot({ id: 'alpha', name: 'Alpha' }), { ...bot({ id: 'beta', name: 'Beta' }), createdAt: 2 }];
async function select(app: Awaited<ReturnType<typeof mountClient>>, id: string) {
  const control = field(app.container, t['integrations.bot']);
  await act(async () => { control.value = id; control.dispatchEvent(new Event('change', { bubbles: true })); });
}
describe('settings shared Bot incarnation', () => {
  it('keeps beta across sections, retains drafts and moves global statistics out of memory', async () => {
    const app = await mountClient(bots);
    try {
      await openSettings(app); expect(app.container.querySelector('form')).toBeNull();
      await select(app, 'beta');
      for (const key of ['notifications.notifications', 'manage.memoryTools', 'team.title', 'connectors.connectors'] as const) {
        await click(button(app.container, t[key]));
        expect(field(app.container, t['integrations.bot']).value).toBe('beta');
        expect(app.container.querySelector('[data-settings-bot]')?.getAttribute('data-settings-bot')).toBe('beta:2');
      }
      expect(app.container.querySelector(`section[aria-label="${t['manage.statistics']}"]`)).toBeNull();
      await click(button(app.container, t['routine.title']));
      expect(app.container.textContent).toContain(t['settings.allBots']);
      expect(app.container.querySelector(`section[aria-label="${t['manage.statistics']}"]`)).toBeTruthy();
      await click(button(app.container, t['notifications.notifications']));
      await click(button(app.container, t['notifications.newPolicy']));
      await fill(field(app.container, t['integrations.id']), 'beta-only');
      await select(app, 'alpha');
      await click(button(requireValue(app.container.querySelector('dialog')), t['navigation.keepEditing']));
      expect(field(app.container, t['integrations.bot']).value).toBe('beta');
      expect(field(app.container, t['integrations.id']).value).toBe('beta-only');
      await select(app, 'alpha');
      await click(button(requireValue(app.container.querySelector('dialog')), t['navigation.discardLeave']));
      expect(field(app.container, t['integrations.bot']).value).toBe('alpha');
      expect(app.container.querySelector('form')).toBeNull();
      expect(app.remote.notifications.savePolicy).not.toHaveBeenCalled();
    } finally { await app.dispose(); }
  });
  it('requires explicit selection after same-ID replacement and drops old drafts', async () => {
    const app = await mountClient(bots);
    try {
      await openSettings(app); await select(app, 'beta');
      await click(button(app.container, t['connectors.newConnector']));
      await fill(field(app.container, t['integrations.label']), 'old incarnation');
      app.remote.data.records = [requireValue(bots[0]), { ...bot({ id: 'beta', name: 'Beta replacement' }), createdAt: 22 }];
      await refreshBots(app);
      expect(field(app.container, t['integrations.bot']).value).toBe('');
      expect(app.container.textContent).toContain(t['settings.botUnavailable']);
      expect(app.container.querySelector('form')).toBeNull();
      await select(app, 'beta');
      expect(app.container.querySelector('[data-settings-bot]')?.getAttribute('data-settings-bot')).toBe('beta:22');
      await click(button(app.container, t['connectors.newConnector']));
      expect(field(app.container, t['integrations.label']).value).toBe('');
    } finally { await app.dispose(); }
  });
  it('keeps an in-flight save bound to beta and cannot close the new alpha editor', async () => {
    const app = await mountClient(bots);
    try {
      await openSettings(app); await select(app, 'beta'); await click(button(app.container, t['notifications.notifications']));
      await click(button(app.container, t['notifications.newPolicy'])); await fill(field(app.container, t['integrations.id']), 'beta-policy');
      let complete!: () => void;
      app.remote.notifications.savePolicy.mockImplementation((input) => new Promise(resolve => { complete = () => resolve({ ok: true, value: policySchema.parse({ ...input, id: 'beta-policy', revision: 1, createdAt: 1, updatedAt: 1, schemaVersion: 1, scopeDigest: 'scope', targetDigest: 'in-app' }) }); }));
      await submit(app.container);
      await select(app, 'alpha'); await click(button(requireValue(app.container.querySelector('dialog')), t['navigation.discardLeave']));
      await click(button(app.container, t['notifications.newPolicy'])); await fill(field(app.container, t['integrations.id']), 'alpha-draft');
      await act(async () => { complete(); });
      expect(app.remote.notifications.savePolicy).toHaveBeenCalledWith(expect.objectContaining({ owner: { botId: 'beta', botCreatedAt: 2 } }), 0, false);
      expect(field(app.container, t['integrations.id']).value).toBe('alpha-draft');
      expect(field(app.container, t['integrations.bot']).value).toBe('alpha');
    } finally { await app.dispose(); }
  });
});
