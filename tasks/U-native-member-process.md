# U：原生思考展示与消息左右布局

2026-11-01 用户试用反馈：每个 Bot 的思考展示尽可能复用官方单聊；用户消息靠右，各 Bot 靠左。

- 用户消息使用右侧气泡，Bot 的头像、回复和执行过程靠左；过程继续归属原始问题，不移回输入区。
- 复用公开 `DisclosureRow`、`IconThinkOutlineRegular` 和 `conversation.chat.reasoning.content`；从真实子会话的原生 Chat 投影读取实时、已完成及中断保留的 reasoning，保持原文。
- 通过原生 `sessions.retain` 的父子地址读取新 worker，避免依赖全局会话目录的异步刷新。订阅、引用归属 `ctx.effect`，收起和卸载释放；查看不发起模型请求。
- 运行中默认展示成员；历史任务默认收起，手动展开选择保留。同一持续 worker 的多个 delivery 只挂一个过程。
- 保留原生右侧详情，查看完整工具、正文与更早历史。不复制 DSH 内部组件，不重建原生消息解析器。
- 验证：并发内容归属、流式/中断、迟到 readiness、订阅清理；完整 check；rc.2/rc.5 中英、明暗、1360/390px 的实际隔离浏览器。合成模型与正式桌面验收分开记录。

结果见[验收记录](../docs/verification/group-member-process/report.md)。
