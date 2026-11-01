# U：执行状态随问题展示

用户于 2026-11-01 在 PR #10 合入并安装后指出：历史执行汇总放在输入框上方，挤压对话，应随每条问题展示并允许展开、收起。

基线 `af33b0f`，分支 `codex/group-inline-execution`，继续跟踪 [Issue #8](https://github.com/MJ-CJM/DSH-Bot/issues/8)。

- 将任务状态、成员过程入口、单成员停止、整任务停止、补充和继续放到原始问题下方；移除工作区输入区的历史汇总及重复状态条。
- 默认折叠成一行；按群身份与 turnId 记住用户选择，轮询和原生消息重挂载不重置。
- 精确匹配 turnId + inputMessageId；Bot 回复和补充消息不重复挂任务，旧问题不依赖最新消息分页。
- 沿用公开 conversation.chat.node、现有 Remote 与原生右侧过程面板，不自建原生会话渲染器。
- 保留已有安装记录；完成有意义的 DOM 回归、整库检查和隔离双语/主题/尺寸浏览器验证。真实模型不自动发消息。

结果见[验收记录](../docs/verification/group-inline-execution/report.md)。
