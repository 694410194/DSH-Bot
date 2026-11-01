# DSH-Bot 0.6.3

Personal agents for DeepSeek Harness: persistent conversations, private and user-published shared memory, workspace group chat, native background tasks and per-Bot MCP connectors.

DeepSeek Harness 个人智能体插件：持久主会话、私有与用户发布的共享记忆、工作区群聊、原生后台任务和每 Bot MCP 连接器。

## Install / 安装

Install the locally built `dsh-bot-0.6.3.tgz` in **Plugins → Add plugin → Install third-party plugin**, enable it, then fully quit and reopen DSH. Keep the same profile and data location when upgrading; back them up first. No npm, online-market or GitHub Release publication is claimed.

在 **插件 → 添加插件 → 安装第三方插件** 选择本地构建的 tgz，启用后完全退出重开。升级前备份，并保持原 profile 和数据位置。目前没有 npm、在线市场或 GitHub Release 下载包。

Development dependencies/API reference: `0.2.1-rc.2`. Community candidate validation targets rc.2; historical Host runs used rc.3. Declared compatibility: `>=0.2.1-rc.2 <0.3.0`. See [current acceptance](https://github.com/MJ-CJM/DSH-Bot/blob/main/docs/acceptance/community-release-ready.md) for actual results and limitations.

开发依赖/API 参考为 rc.2，本轮社区候选在 rc.2 验证，历史运行记录为 rc.3；逐项结果见当前验收，声明范围不代表范围内所有版本已验证。

Public downloads, when available, belong to [GitHub Releases](https://github.com/MJ-CJM/DSH-Bot/releases). Choose the `.tgz` asset and verify `SHA256SUMS`; the Source code archives are not installable packages. No public asset is available yet.

首发准备中；正式发布后在 GitHub Releases 下载 `.tgz` 和校验和。自动生成的 Source code 压缩包不是插件安装包。

## Use / 使用

Screenshots / 界面截图（isolated Web Host, synthetic demo data / 隔离 Web Host、合成演示数据）：

![Personal Bot](https://raw.githubusercontent.com/MJ-CJM/DSH-Bot/main/packages/dsh-bot/assets/current-role.png)

![Group chat](https://raw.githubusercontent.com/MJ-CJM/DSH-Bot/main/packages/dsh-bot/assets/group-chat.png)

- Create with a name, then chat in the native workspace. Lasting role changes use native approval. / 输入名称创建并聊天；长期职责修改走原生审批。
- Create groups by selecting Bots; use mentions, replies, attachments, individual stops and per-member model settings. / 选成员建群，支持提及、引用、附件、单项停止和逐成员模型。
- Manage memory in Bots → Manage. Tools are `bot_memory_save`, `bot_memory_search`, `bot_memory_list` and `bot_memory_forget`, without old `memory_*` aliases. Only explicit user actions publish shared content. / 在管理页管理记忆，旧工具名无别名，共享须用户明确确认。

## Boundaries / 边界

Bot homes share a workspace and are not filesystem isolation. Native permissions, approval and sandbox still apply. Strong-forgetting records can keep unaudited tools blocked; a new conversation does not bypass that protection. Migration Fence prevents writing migrated storage with old versions.

Bot home 共享工作区，不是文件隔离；沿用原生权限、审批和沙箱。强遗忘门禁可能关闭未审计工具，新主聊不解除限制；迁移后的存储受 Migration Fence 保护，不能直接降级写入。

Runtime evidence uses synthetic models; real-model task quality is unverified. Ongoing proactive operation, IM ingress/egress, OS/mobile push and cloud hosting have not shipped. Automatic sharing is unavailable; offline evaluation is synthetic. Unknown background results are not automatically replayed.

运行证据使用合成模型，真实模型质量未验。持续主动运行、IM 收发、OS/手机推送及云托管尚未交付；自动共享不可用，离线评测为合成验证；不确定后台结果不自动重放。

License / 许可证：**MIT**, Copyright © 2026 MJ-CJM. See the bundled LICENSE and THIRD_PARTY_NOTICES.txt.

完整说明：[中文](https://github.com/MJ-CJM/DSH-Bot/blob/main/README.md) · [English guide](https://github.com/MJ-CJM/DSH-Bot/blob/main/README.en.md) · [Acceptance](https://github.com/MJ-CJM/DSH-Bot/blob/main/docs/acceptance/V063-onboarding-avatars.md) · [Security](https://github.com/MJ-CJM/DSH-Bot/blob/main/SECURITY.md)

### Concurrent group discussions / 群聊并发讨论

Natural and mentioned-member discussions run concurrently (up to four active members per group by default). Specific `group_message` requests drive follow-on work in the same native child sessions; ordinary progress does not wake idle members. Tasks become idle when no work remains. Automatic follow-on work pauses after the configured allowance (default 32) and can be continued explicitly. Stop one member or the entire task from the group page. Execution details open in the native right sidebar without leaving the group draft or starting another model request.

自然讨论和 @ 成员任务默认在同群最多并发 4 个成员；明确请求驱动多轮，普通进展不唤醒空闲成员。后续继续复用各成员的原生子会话；没有待办时自然空闲，自动后续执行达到默认 32 次额度时暂停并提供“继续讨论”。可停止单成员或整项任务，执行过程在同屏原生右侧面板展开。

`groupTaskTimeoutMs` and `groupMemberTimeoutMs` default to `0` (no additional plugin deadline). `groupConcurrentMembers` sets the group-wide concurrency limit; `groupMaxContinuations` sets the automatic follow-on allowance. Explicit round-robin mode retains its serial behavior and `groupRoundTimeoutMs` compatibility setting. Existing native model/tool time limits still apply.
