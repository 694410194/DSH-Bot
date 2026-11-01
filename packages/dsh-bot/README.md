# DSH-Bot 0.6.3

Personal agents for DeepSeek Harness: persistent conversations, private and user-published shared memory, workspace group chat, native background tasks and per-Bot MCP connectors.

DeepSeek Harness 个人智能体插件：持久主会话、私有与用户发布的共享记忆、工作区群聊、原生后台任务和每 Bot MCP 连接器。

## Install / 安装

Install the locally built `dsh-bot-0.6.3.tgz` in **Plugins → Add plugin → Install third-party plugin**, enable it, then fully quit and reopen DSH. Keep the same profile and data location when upgrading; back them up first. No npm, online-market or GitHub Release publication is claimed.

在 **插件 → 添加插件 → 安装第三方插件** 选择本地构建的 tgz，启用后完全退出重开。升级前备份，并保持原 profile 和数据位置。目前没有 npm、在线市场或 GitHub Release 下载包。

Development dependencies/API reference: `0.2.1-rc.2`. Recorded full Host runs: `0.2.1-rc.3`. Declared compatibility: `>=0.2.1-rc.2 <0.3.0`; exact rc.2 runtime is unverified.

开发依赖/API 参考为 rc.2，完整 Host 实测为 rc.3；声明范围不代表范围内所有版本已验证。

## Use / 使用

- Create with a name, then chat in the native workspace. Lasting role changes use native approval. / 输入名称创建并聊天；长期职责修改走原生审批。
- Create groups by selecting Bots; use mentions, replies, attachments, individual stops and per-member model settings. / 选成员建群，支持提及、引用、附件、单项停止和逐成员模型。
- Manage memory in Bots → Manage. Tools are `bot_memory_save`, `bot_memory_search`, `bot_memory_list` and `bot_memory_forget`, without old `memory_*` aliases. Only explicit user actions publish shared content. / 在管理页管理记忆，旧工具名无别名，共享须用户明确确认。

## Boundaries / 边界

Bot homes share a workspace and are not filesystem isolation. Native permissions, approval and sandbox still apply. Strong-forgetting records can keep unaudited tools blocked; a new conversation does not bypass that protection. Migration Fence prevents writing migrated storage with old versions.

Bot home 共享工作区，不是文件隔离；沿用原生权限、审批和沙箱。强遗忘门禁可能关闭未审计工具，新主聊不解除限制；迁移后的存储受 Migration Fence 保护，不能直接降级写入。

Runtime evidence uses synthetic models; real-model task quality is unverified. Ongoing proactive operation, IM ingress/egress, OS/mobile push and cloud hosting have not shipped. Automatic sharing is unavailable; offline evaluation is synthetic. Unknown background results are not automatically replayed.

运行证据使用合成模型，真实模型质量未验。持续主动运行、IM 收发、OS/手机推送及云托管尚未交付；自动共享不可用，离线评测为合成验证；不确定后台结果不自动重放。

Current license: **UNLICENSED**, with no open-source permission granted. See the bundled LICENSE.

完整说明：[中文](https://github.com/MJ-CJM/DSH-Bot/blob/main/README.md) · [English guide](https://github.com/MJ-CJM/DSH-Bot/blob/main/README.en.md) · [Acceptance](https://github.com/MJ-CJM/DSH-Bot/blob/main/docs/acceptance/V063-onboarding-avatars.md) · [Security](https://github.com/MJ-CJM/DSH-Bot/blob/main/SECURITY.md)
