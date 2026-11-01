/** Browser-only U0 fixture. Loaded by the isolated runner, never shipped. */
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import { useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Checkbox, Input, Menu, Modal, SegmentedTabs, SettingsForm, SettingsFormModel, settingsTextField } from '@deepseek-ai/dsh-client-ui-primitives';

export function install(ctx: Context) {
  const receipt = { section: false, plugins: false, mutations: [] as unknown[], discarded: 0 };
  // Only fixture-owned data is exposed to the driver; no host internals or credentials.
  Object.assign(window, { nativeSettingsReceipt: receipt });
  ctx.effect(() => ctx.slots.inject('settings.section', () => {
    receipt.section = true;
    return ctx.slots.register({ name: 'settings.section', id: 'u0-spike', label: 'U0 Section', order: 99 },
      ({ close }) => <Button onClick={close}>U0 Close section</Button>);
  }));
  ctx.effect(() => ctx.slots.inject('settings.plugins.tab', () => {
    receipt.plugins = true;
    return ctx.slots.register({ name: 'settings.plugins.tab', id: 'u0-spike', label: 'U0 Plugin', order: 99 }, () => <p>U0 plugin mounted</p>);
  }));
  const listeners = new Set<() => void>();
  let snapshot = { status: 'ready' as const, value: { title: 'initial' }, base: {}, user: {}, writable: true, revision: 7 };
  const model = new SettingsFormModel({ getSnapshot: () => snapshot, subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async mutate(ops, revision) { receipt.mutations.push({ ops, revision });
      const op = ops[0]; if (op?.op === 'set' && op.value === 'refuse') return false;
      snapshot = { ...snapshot, value: { title: op?.op === 'set' ? String(op.value) : '' }, revision: snapshot.revision + 1 };
      for (const fn of listeners) fn(); return true;
    } }, [settingsTextField('title')]);
  const store = model.bind(() => ({ shell: model.shell(), field: model.field('title') }));
  function Form() {
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
    return <SettingsForm labels={{ unavailable: 'Unavailable', readOnly: 'Read only', saveFailed: 'Save failed', save: 'U0 Save', saving: 'Saving' }}
      state={state.shell} onSave={() => { void model.save(); }} onDiscard={() => { receipt.discarded++; model.actions().discard(); }}>
      <Input aria-label="U0 Draft" value={state.field.text} onChange={e => model.actions().edit('title', e.target.value)} />
    </SettingsForm>;
  }
  function Probe() {
    const [open, setOpen] = useState(false), [nested, setNested] = useState(false), [menu, setMenu] = useState(false),
      [busy, setBusy] = useState(false), [form, setForm] = useState(true), [tab, setTab] = useState('a');
    return <><Button onClick={() => setOpen(true)}>U0 Open</Button>
      <Modal open={open} title="U0 Modal" closeLabel="U0 Close" onClose={() => { if (!busy) setOpen(false); }}>
        <Input data-modal-autofocus aria-label="U0 Input" />
        <Checkbox label="U0 Busy" checked={busy} onChange={setBusy} />
        <Menu open={menu} onClose={() => setMenu(false)} anchor={<Button onClick={() => setMenu(!menu)}>U0 Menu</Button>}
          items={[{ id: 'one', label: 'U0 Item' }]} onSelect={() => setMenu(false)} />
        <Button onClick={() => setNested(true)}>U0 Nested</Button>
        <SegmentedTabs label="U0 Tabs" value={tab} onChange={setTab} items={[{ value: 'a', label: 'U0 A', id: 'u0-a', panelId: 'u0-panel-a' }, { value: 'b', label: 'U0 B', id: 'u0-b', panelId: 'u0-panel-b' }]} />
        <div role="tabpanel" id={`u0-panel-${tab}`}>{tab}</div>
        <Button onClick={() => setForm(!form)}>U0 Toggle form</Button>{form && <Form />}
        <Modal open={nested} title="U0 Nested modal" closeLabel="U0 Nested close" onClose={() => setNested(false)}><Input aria-label="U0 Nested input" data-modal-autofocus /></Modal>
      </Modal></>;
  }
  ctx.effect(() => {
    const container = document.createElement('div'); container.dataset.u0Fixture = ''; document.body.append(container);
    const root = createRoot(container); root.render(<Probe />);
    return () => { root.unmount(); container.remove(); model.dispose(); Reflect.deleteProperty(window, 'nativeSettingsReceipt'); };
  });
}
