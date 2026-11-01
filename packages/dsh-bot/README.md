# DSH-Bot 0.6.3

Personal agents for DeepSeek Harness: persistent conversations, private and user-published shared memory, workspace group chat, native background tasks and per-Bot MCP connectors.

DeepSeek Harness 个人智能体插件：持久主会话、私有与用户发布的共享记忆、工作区群聊、原生后台任务和每 Bot MCP 连接器。

## Install / 安装

Download `dsh-bot-0.6.3.tgz` and `SHA256SUMS` from the [v0.6.3 release](https://github.com/MJ-CJM/DSH-Bot/releases/tag/v0.6.3). Verify the checksum, then select the tgz in **Plugins → Add plugin → Install third-party plugin**, enable it, and fully quit and reopen DSH. The automatically generated Source code archives are not plugin packages.

从 [v0.6.3 Release](https://github.com/MJ-CJM/DSH-Bot/releases/tag/v0.6.3) 下载 `dsh-bot-0.6.3.tgz` 和 `SHA256SUMS`。核对校验和后，在 **插件 → 添加插件 → 安装第三方插件** 选择 tgz，启用后完全退出重开。不要选择自动生成的 Source code 压缩包。

```sh
shasum -a 256 -c SHA256SUMS
```

On Linux use `sha256sum -c SHA256SUMS`. Back up the original profile and complete data before upgrading, and retain the same profile/data location. / Linux 使用 `sha256sum -c SHA256SUMS`。升级前完整备份，保持原 profile 和数据位置。

Development dependencies/API reference: `0.2.1-rc.2`. The U2–U4 product code was checked on rc.2 and rc.5; [UI acceptance](https://github.com/MJ-CJM/DSH-Bot/blob/main/docs/verification/ui-completion/README.md) and [release validation](https://github.com/MJ-CJM/DSH-Bot/blob/main/docs/releases/v0.6.3.md) distinguish artifact hashes, runtime checks and untested behavior. Declared compatibility: `>=0.2.1-rc.2 <0.3.0`, not a claim that every version is tested.

开发依赖/API 参考锁定 rc.2；U2–U4 产品代码已在 rc.2、rc.5 验证。上述报告分别记录产物摘要、实际运行与未验收项；声明范围不等于范围内全部版本都已验证。

## Use / 使用

Screenshots / 界面截图（isolated Web Host, synthetic demo data / 隔离 Web Host、合成演示数据）：

![Personal Bot](https://raw.githubusercontent.com/MJ-CJM/DSH-Bot/main/packages/dsh-bot/assets/profile.png)

![Group chat](https://raw.githubusercontent.com/MJ-CJM/DSH-Bot/main/packages/dsh-bot/assets/group-narrow.png)

- Create with a name, then chat in the native workspace. Lasting role changes use native approval. / 输入名称创建并聊天；长期职责修改走原生审批。
- Create groups by selecting Bots; use mentions, replies, attachments, individual stops and per-member model settings. / 选成员建群，支持提及、引用、附件、单项停止和逐成员模型。
- Open Profile → Memory, or Plugin settings → Memory & transfer. Tools are `bot_memory_save`, `bot_memory_search`, `bot_memory_list` and `bot_memory_forget`, without old `memory_*` aliases. Only explicit user actions publish shared content. / 在资料 → 记忆或插件设置 → 记忆与导入导出中管理记忆，旧工具名无别名，共享须用户明确确认。

- Profile opens an inline page with overview, tasks/messages, memory, settings and history. Returning restores the list position. / 资料打开页内详情，含概览、任务与消息、记忆、设置和历史，返回保留列表位置。
- Each group question owns a collapsed execution row. Expand for native member reasoning; member menus supplement or stop one Bot, while stopping the whole discussion is separate. / 每个群聊问题下有可折叠过程，展开查看原生成员思考；成员菜单可补充或停止单个 Bot，整轮停止独立显示。
- Notifications separate history from policies. Export JSON uses a native inspector; import requires preview and conflict checks before confirmation. / 通知记录与策略分开；导出使用原生 JSON 展示，导入必须预览并检查冲突后确认。

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
