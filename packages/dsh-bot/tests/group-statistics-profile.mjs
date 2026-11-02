// Real Host/UI demonstration with scripted responses only; no external model requests.
import '../../../scripts/deepening/network-guard.mjs';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { LlmAdapter, createUserMessage } from '@deepseek-ai/dsh-llm';
export const name = 'group-statistics-probe';
export const inject = ['loader', 'llm', 'agents', 'dshBots', 'sessionController', 'subagents', 'agentPresets', 'webServer'];

export function apply(ctx, config) {
  ctx.effect(() => {
    const controller = new AbortController(), disposers = [];
    const en = config.suite.endsWith('-en'), pick = (zh, english) => en ? english : zh;
    const data = { realModelRequests: 0, scriptedModelRequests: 0, maxConcurrentStreams: 0 };
    const mainIds = new Set(), taskIds = new Set(); let active = 0;
    class DemoAdapter extends LlmAdapter {
      async listModels(provider) { return [{ provider, id: 'fixture', name: pick('本地演示模型', 'Local demo model') }]; }
      async resolveModel(provider, model) { return { provider, id: model, name: 'Local demo model', context: { contextWindow: 4096 } }; }
      async *stream(options) {
        data.scriptedModelRequests++; active++; data.maxConcurrentStreams = Math.max(data.maxConcurrentStreams, active);
        try {
          await fetch(config.endpoint, { method: 'POST', body: JSON.stringify({ sessionId: options.sessionId }) });
          const research = /整理资料，对照来源|Organize sources, compare evidence/.test(JSON.stringify(options));
          const reasoning = pick(research ? '先整理比较维度，再区分来源事实与待验证项。' : '检查结论的依据，补充适用条件和验证方法。',
            research ? 'Organize the comparison criteria and separate evidence from open questions.' : 'Review the evidence, assumptions and validation steps.');
          yield { type: 'block-start', index: 0, blockType: 'reasoning' };
          yield { type: 'reasoning-delta', index: 0, text: reasoning };
          await delay(1200, undefined, { signal: options.signal });
          yield { type: 'block-end', index: 0, block: { type: 'reasoning', text: reasoning } };
          const text = taskIds.has(options.sessionId)
            ? pick('调研提纲已整理：1. 明确问题；2. 对照来源；3. 列出假设；4. 制定验证步骤。', 'Research outline ready: define the question, compare sources, list assumptions, and plan validation.')
            : mainIds.has(options.sessionId)
              ? pick('我们可以先明确问题，再整理证据和待验证项。我会使用已保存的偏好，让结论和来源更容易核对。', 'Let us define the question, organize evidence and identify open questions. I will use your saved preferences to keep conclusions and sources easy to review.')
              : pick(research ? '建议从证据来源、实施成本和验证方式三个维度比较方案。我负责整理对照表。' : '我会审阅对照表，标出假设、遗漏条件和需要补充的证据。',
                research ? 'Compare evidence, implementation cost and validation. I will prepare the comparison table.' : 'I will review the table for assumptions, missing conditions and evidence gaps.');
          yield { type: 'block-start', index: 1, blockType: 'text' };
          yield { type: 'text-delta', index: 1, text };
          yield { type: 'block-end', index: 1, block: { type: 'text', text } };
          yield { type: 'usage', usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 40 } };
          yield { type: 'finish', reason: { kind: 'stop' } };
        } finally { active--; }
      }
    }
    const run = (async () => {
      await ctx.loader.await(); assert.deepEqual(ctx.llm.listProviders(), []);
      disposers.push(ctx.llm.registerAdapter(['dp-loopback'], new DemoAdapter()));
      await ctx.dshBots.waitUntilReady();
      // A second Host process reads durable native projections without reseeding or replaying work.
      if (existsSync(resolve(config.outputDir, 'showcase.json'))) { console.log('B4_WEB_READY'); return; }
      const bots = [];
      const definitions = [
        ['research', '🔎', pick('研究助手', 'Research assistant'), pick('整理资料，对照来源，明确待验证的问题。', 'Organize sources, compare evidence and identify open questions.')],
        ['review', '🧭', pick('审阅助手', 'Review assistant'), pick('检查论据、假设和遗漏，提出具体改进建议。', 'Check evidence and assumptions, then suggest concrete improvements.')],
        ['writing', '✍️', pick('写作助手', 'Writing assistant'), pick('把研究结论整理为清晰、可读的文稿。', 'Turn research findings into clear, readable drafts.')],
      ];
      for (const [id, avatar, name, description] of definitions) {
        bots.push(await ctx.dshBots.create({ id, name, avatar, description, template: 'minimal',
          persona: { prefix: description } }));
      }
      for (const content of [pick('回答先给结论，再列证据与来源。', 'Start with the conclusion, then give evidence and sources.'),
        pick('方案比较时关注实施成本和验证方法。', 'Compare implementation cost and validation methods.'),
        pick('当前演示项目：为团队整理技术调研流程。', 'Demo project: document a technical research workflow for the team.')]) {
        await ctx.dshBots.memoryFor('research').save({ content });
      }
      const main = await ctx.dshBots.openConversation('research'); mainIds.add(main.sessionId);
      const { agent } = await ctx.sessionController.resolveAgent(main.sessionId);
      agent.followup(createUserMessage({ content: [{ type: 'text', text: pick('请帮我整理技术调研的步骤，结论和依据分开写。', 'Help me outline a technical research workflow. Separate conclusions from evidence.') }], source: { kind: 'user' } }));
      await agent.whenIdle();
      disposers.push(await ctx.agentPresets.register({ id: 'showcase-task', name: 'Demo task', plugins: [] }));
      const childId = crypto.randomUUID(); taskIds.add(childId);
      const task = await ctx.subagents.startActivation({ provider: 'spawn', delivery: 'caller', childId,
        label: pick('整理调研提纲（演示）', 'Prepare research outline (demo)'), signal: controller.signal,
        request: { parent: agent, agentPreset: 'showcase-task', agentOptions: { provider: 'dp-loopback', model: 'fixture' },
          prompt: [{ type: 'text', text: 'Prepare a short research outline for this scripted demonstration.' }], maxDepth: 1 } });
      await task.result; await task.dispose();
      const groups = ctx.get('dshBotGroups'); assert.ok(groups);
      const group = await groups.create({ operationId: 'showcase-group', name: pick('方案讨论组', 'Research discussion'), mode: 'natural', historyConfirmed: true,
        members: bots.slice(0, 2).map(b => ({ botId: b.id, botCreatedAt: b.createdAt })) });
      const key = { groupId: group.id, groupCreatedAt: group.createdAt };
      const turn = await groups.send(key, { operationId: 'showcase-question', text: pick('请一起讨论：我们应该怎样比较两个技术方案？', 'How should we compare two technical approaches? Please discuss together.'), expectedMembershipRevision: 1 });
      const deadline = Date.now() + 45000;
      for (;;) {
        assert.ok(Date.now() < deadline, 'Demo group did not settle');
        const v = await groups.view(key), row = v.turns.find(t => t.id === turn.id);
        if (row && !['accepted', 'running'].includes(row.state)) { assert.equal(v.deliveries.filter(d => d.turnId === turn.id && d.state === 'completed').length, 2); break; }
        await delay(50);
      }
      const members = (await groups.view(key)).members;
      const second = await groups.send(key, { operationId: 'statistics-second-question', text: pick('只请研究助手总结一下。', 'Research assistant, summarize the findings.'), memberIds: [members[0].id], expectedMembershipRevision: 1 });
      for (;;) {
        assert.ok(Date.now() < deadline, 'Second question did not settle');
        const v = await groups.view(key), row = v.turns.find(t => t.id === second.id);
        if (row && !['accepted', 'running'].includes(row.state)) break;
        await delay(50);
      }
      await writeFile(resolve(config.outputDir, 'showcase.json'), JSON.stringify({ ...data, mainId: main.sessionId, rootId: group.rootSessionId, turnId: turn.id, secondTurnId: second.id, names: definitions.map(d => d[2]) }, null, 2));
      console.log('B4_WEB_READY');
    })().catch(async e => { await writeFile(resolve(config.outputDir, 'failure.json'), JSON.stringify({ error: String(e), stack: e.stack })); console.log('B4_WEB_FAILED'); });
    return async () => { controller.abort(); await run; for (const off of disposers.reverse()) off(); };
  });
}
