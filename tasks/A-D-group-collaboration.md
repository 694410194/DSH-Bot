# A–D：原生群聊并发、多轮与执行过程

用户于 2026-11-01 确认 U 的 PR #9 已合入，并授权新建 PR，先做 A 阶段原生 API 验证，再实现 B/C 和验收。基线 `c911ec9`，分支 `codex/group-collaboration-runtime`，继续跟踪 [Issue #8](https://github.com/MJ-CJM/DSH-Bot/issues/8)。[已批准方案](../docs/design/group-concurrent-discussion-proposal.md)继续有效。

## 顺序与门禁

1. A：隔离合成模型验证原生并发重叠、持续子会话的活动中/空闲投递、准确结果归属、父级桥接、独立停止、生命周期；公开 conversation.content 内嵌过程不得触发额外请求，不能出现绕开群调度的发送入口。rc.2 与当前 CLI 运行结果分开记录。
2. B：同群默认 4 个活动成员，单任务同成员单 worker，固定首轮上下文；具体请求驱动多轮，普通公开结果不唤醒空闲成员；自然空闲、独立停止、默认无额外五分钟限制、32 次自动后续额度可见暂停/继续。保留明确串行模式、共享准入和持久去重。
3. C：实际原生 reasoning/工具/正文/状态展示，准确来源与双语原因；没有正文也有执行卡；折叠/查看不执行模型，使用公开 slots 与生命周期。
4. D：有意义的竞争/取消/长任务/冷恢复测试，完整 check、隔离 Host/UI、CI 与候选证据。合并、正式安装、真实模型和发布不在本轮执行。

只写本仓库，pnpm/dsh 走包装脚本，所有运行数据限 `.dsh-dev`；参考与安装内容只读。遇到公共 API 无法满足已批准语义时先写清实际限制和修订方案，不能用私有接口或仅跳转链接冒充原生内嵌完成。

## 当前状态

- [x] A：rc.2 / rc.5 原生 Host 与原生过程 UI 实测。
- [x] B：并发、持久续聊、busy inbox、自然空闲、额度暂停/继续、单成员停止。
- [x] C：同屏原生过程面板、只读与草稿保留，中英/明暗/桌面/窄屏验证。
- D：本地完整检查、冷恢复、超过五分钟的实跑、候选包验收均 PASS；线上 CI 结果见 [PR #10 当前 head 的 checks](https://github.com/MJ-CJM/DSH-Bot/pull/10/checks)。

具体命令、失败尝试、收据与验收边界见 [验收报告](../docs/verification/group-collaboration/report.md)。
