import '../../../scripts/deepening/network-guard.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LoopbackAdapter } from './deepening/loopback-adapter.mjs';

export const name = 'bots-navigation-ui-fixture';
export const inject = ['loader', 'dshBots', 'dshBotGroups', 'llm'];
export function apply(ctx, config) {
  ctx.effect(() => {
    const adapter = new LoopbackAdapter(config.endpoint);
    const off = ctx.llm.registerAdapter(['dp-loopback'], adapter);
    const run = (async () => {
      await ctx.loader.await(); await ctx.dshBots.waitUntilReady();
      const bots = [];
      for (let index = 0; index < 24; index++) bots.push(await ctx.dshBots.create({
        id: `navigation-bot-${index}`, name: `助手 Assistant ${String(index + 1).padStart(2, '0')}`,
        description: '用于导航验证的合成助手 · Synthetic navigation assistant', template: 'minimal',
        model: { provider: 'dp-loopback', model: 'fixture' },
      }));
      const group = await ctx.dshBotGroups.create({ operationId: 'navigation:group', name: '研究小组 Research team',
        mode: 'natural', members: bots.slice(0, 3).map(bot => ({ botId: bot.id, botCreatedAt: bot.createdAt })), historyConfirmed: true });
      assert.equal(adapter.count, 0);
      await writeFile(join(config.outputDir, 'navigation-fixture.json'), JSON.stringify({ bots: bots.map(({ id, name, createdAt }) => ({ id, name, createdAt })), group }));
      console.log('B4_WEB_READY');
    })().catch(async error => {
      await writeFile(join(config.outputDir, 'navigation-fixture-error.json'), JSON.stringify({ error: String(error), stack: error.stack }));
      console.log('B4_WEB_FAILED');
    });
    return async () => { await run; off(); };
  });
}
