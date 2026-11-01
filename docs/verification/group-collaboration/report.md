# A–D 群聊并发实现与验收

关联 Issue #8 / Draft PR #10；基线为 U 阶段合并提交 `c911ec9`。本轮没有修改桌面应用、正式用户目录、参考源码，没有真实模型调用、合并或发布。

## 最终行为

- 新 natural / mention 任务采用 protocol 2：同群 FIFO 默认最多 4 个成员执行，跨任务共用额度；同任务同成员始终单 worker。首轮共享同一接收时刻的历史截止，完成快慢不会改变其他首轮成员的输入。round-robin 保留串行。
- `group_message` 的具体目标请求启动/续接成员；忙碌目标归并到它的 native inbox，保存关联 delivery 和真实 child message id。`targets` 支持多成员；拒绝自我递归、无效成员和未知执行重放。普通 progress 只通知仍忙碌的同伴，收件者刚好结束时不唤醒。
- 后续执行复用原生 childId、Bot preset、已接收模型配置与历史；每次按新的 native runId 收结果。所有输入、结果、父级桥接继续经过已有数据流准入。群根只记录和调度，不调用模型。
- 没有在途或待处理请求时记为 idle；这不声称业务目标完成。额度耗尽记为 paused，保留待办，UI 显示已用/总额度并允许明确继续。成员停止独立于整个任务；未知副作用不重放。崩溃恢复保留历史并显式显示 recovery_needed。
- 群内按任务展示各成员状态，包括未写正文、失败、取消；点击在原生右侧面板查看实际 reasoning、工具与正文。只读面板关闭会释放 session 引用，查看不产生模型请求。A 发现原生工厂禁止自嵌套，因此采用右侧兄弟 slot；没有使用内部组件或完整会话跳转代替过程展示。

## 配置

| 字段 | 默认 | 用途 |
| --- | --- | --- |
| groupConcurrentMembers | 4 | 同群跨任务的成员并发数，1–16 整数 |
| groupTaskTimeoutMs | 0 | 新并发任务总时限；0 不额外限制 |
| groupMemberTimeoutMs | 0 | 从实际执行开始计时的成员时限 |
| groupMaxContinuations | 32 | 每次用户发起/继续后的自动后续执行额度；首轮、普通工具调用不计入 |
| groupRoundTimeoutMs | 300000 | 明确串行与旧记录的兼容时限，不隐式套到 protocol 2 |

旧持久记录可读取，不会自动升级并重放；`groupConcurrentTurns` 保留旧配置兼容，新协议使用成员并发额度。

## 运行命令

所有 pnpm 使用 `scripts/pnpm`；CLI 通过 `scripts/dsh` 包装器。运行脚本显式要求 `DSH_HOME="$PWD/.dsh-dev"` 和 `--mock-only`。rc.2 通过 `DSH_BOT_DSH_BIN="$PWD/.dsh-dev/native-api-rc2/node_modules/.bin/dsh"` 指定。

- `node scripts/group-native-api-runtime.mjs --mock-only`：独立原生 API 合同。
- `node scripts/group-concurrent-runtime.mjs --mock-only`：真实 Bot preset 的并发、忙时投递、持久续聊、独立取消、空闲、额度暂停/继续。
- `node scripts/group-concurrent-runtime.mjs --mock-only --long`：额外真实等待超过五分钟；记录实际 elapsedMs。
- `node scripts/group-concurrent-runtime.mjs --mock-only --crash-recovery`：对隔离 Host 发送 SIGKILL 后冷启动，验证未知状态与零自动重放。
- `node scripts/group-execution-ui.mjs --mock-only`：实际 Chromium 原生过程、输入抑制、关闭/重开零额外调用。
- `scripts/pnpm check`、`scripts/pnpm check:docs`、`scripts/pnpm check:format`、`scripts/pnpm check:tooling`、pack 与 tarball 验证。

结果与收据见下表。失败尝试保留在 `.dsh-dev`：包含不允许的工厂递归、native relay 标签不匹配、测试双缺少新公开 API，以及毫秒到点断言等；不将这些尝试记为成功。

## 验证边界

合成模型证明调度、原生事件、持久化和 UI 生命周期，不证明真实模型的讨论质量、任务收敛或所有工具组合。需要真实模型 API key 的试用和正式桌面安装留给用户；未执行，不列为 PASS。参考源码 tag 工作树缺失；已按公开 rc.2 发布包和实际 rc.2/rc.5 Host 分别核实。

## 逐项验收

| 验收项 | 结果与证据 |
| --- | --- |
| A：公开原生接口 | PASS，rc.2 / rc.5 各 16 项，根会话模型请求 0 |
| B：并发、续聊、忙时入箱、独立停止、空闲 | PASS，真实 Bot preset 合成 Host；默认 4 路实际重叠，第 5 路排队；同成员续聊 childId 不变，native runId 不同 |
| B：额度暂停与继续 | PASS，缩小额度为 2 验证暂停、显式增加第二批、保留两个 child；默认 32 由 Config 检查覆盖 |
| B：超过五分钟 | PASS，rc.2 305010ms、rc.5 305011ms 后仍 running，显式释放后 idle；均为真实墙钟等待 |
| C：原生过程 UI | PASS，rc.2 / rc.5 各 8 种语言/主题/宽度组合；reasoning、工具、正文可展开，关闭释放视图，草稿保留，零新增模型请求 |
| D：崩溃冷恢复 | PASS，隔离 Host SIGKILL 后重启，in-flight 记录 unknown、任务 recovery_needed，读取视图和恢复根会话时模型请求 0 |
| D：完整 check | PASS，145 个测试文件，1253 测试通过，3 个既有预期失败；build/typecheck/lint 通过（lint 仅既有 1 条 info） |
| D：文档、格式、工具链 | PASS，check:docs、check:format、check:tooling；7 个工具链测试通过 |
| D：候选包 | PASS，实际 tgz 字节、元数据、Client closure 和 186 个 Host 模块 hash 校验通过 |
| 线上 CI | 由 [PR #10 当前 head 的 checks](https://github.com/MJ-CJM/DSH-Bot/pull/10/checks)提供 Ubuntu/macOS 结果；本地结果不替代线上 CI |
| 真实模型讨论质量、正式桌面安装试用 | FAIL（未执行，本轮未授权真实模型、正式目录安装）；需要用户试用确认 |
| 参考源码 tag 工作树检查 | FAIL（目录不存在）；以公开 rc.2 发布包及两版本 Host 实测替代，未修改参考来源 |

机器可读的脱敏合成收据摘录：[evidence.json](evidence.json)。完整本地日志路径在该文件中；不把日志或截图当作真实模型任务质量验收。

候选包 SHA-256：`f1f9f3d2e5a5357b366ae95877aeec87e40d83e5220b35539f2d8611b9db2914`。

桌面暗色（群聊、草稿与原生过程同屏）：

![原生执行过程](native-execution-dark.png)

窄屏亮色（使用宿主右侧面板的全屏模式，关闭返回群聊草稿）：

![窄屏原生过程](native-execution-narrow.png)

## 改动文件清单

- [docs/dsh-api-notes.md](../../../docs/dsh-api-notes.md)
- [docs/verification/group-collaboration/evidence.json](../../../docs/verification/group-collaboration/evidence.json)
- [docs/verification/group-collaboration/native-api.md](../../../docs/verification/group-collaboration/native-api.md)
- [docs/verification/group-collaboration/native-execution-dark.png](../../../docs/verification/group-collaboration/native-execution-dark.png)
- [docs/verification/group-collaboration/native-execution-narrow.png](../../../docs/verification/group-collaboration/native-execution-narrow.png)
- [docs/verification/group-collaboration/report.md](../../../docs/verification/group-collaboration/report.md)
- [packages/dsh-bot/README.md](../../../packages/dsh-bot/README.md)
- [packages/dsh-bot/locale/en.json](../../../packages/dsh-bot/locale/en.json)
- [packages/dsh-bot/locale/zh.json](../../../packages/dsh-bot/locale/zh.json)
- [packages/dsh-bot/src/client/components/GroupsPanel.tsx](../../../packages/dsh-bot/src/client/components/GroupsPanel.tsx)
- [packages/dsh-bot/src/client/group-execution.tsx](../../../packages/dsh-bot/src/client/group-execution.tsx)
- [packages/dsh-bot/src/client/styles/groups.module.css](../../../packages/dsh-bot/src/client/styles/groups.module.css)
- [packages/dsh-bot/src/client/workspace-group.tsx](../../../packages/dsh-bot/src/client/workspace-group.tsx)
- [packages/dsh-bot/src/host/data-flow/tool-guard.ts](../../../packages/dsh-bot/src/host/data-flow/tool-guard.ts)
- [packages/dsh-bot/src/host/delegate/continuation.ts](../../../packages/dsh-bot/src/host/delegate/continuation.ts)
- [packages/dsh-bot/src/host/groups/concurrent.ts](../../../packages/dsh-bot/src/host/groups/concurrent.ts)
- [packages/dsh-bot/src/host/groups/remote.ts](../../../packages/dsh-bot/src/host/groups/remote.ts)
- [packages/dsh-bot/src/host/groups/roots.ts](../../../packages/dsh-bot/src/host/groups/roots.ts)
- [packages/dsh-bot/src/host/groups/service.ts](../../../packages/dsh-bot/src/host/groups/service.ts)
- [packages/dsh-bot/src/host/groups/state.ts](../../../packages/dsh-bot/src/host/groups/state.ts)
- [packages/dsh-bot/src/host/groups/turn-runner.ts](../../../packages/dsh-bot/src/host/groups/turn-runner.ts)
- [packages/dsh-bot/src/host/groups/turns.ts](../../../packages/dsh-bot/src/host/groups/turns.ts)
- [packages/dsh-bot/src/host/groups/worker-tool.ts](../../../packages/dsh-bot/src/host/groups/worker-tool.ts)
- [packages/dsh-bot/src/host/registry-config.ts](../../../packages/dsh-bot/src/host/registry-config.ts)
- [packages/dsh-bot/src/shared/groups-contract.ts](../../../packages/dsh-bot/src/shared/groups-contract.ts)
- [packages/dsh-bot/src/shared/groups.ts](../../../packages/dsh-bot/src/shared/groups.ts)
- [packages/dsh-bot/tests/bundle.spec.ts](../../../packages/dsh-bot/tests/bundle.spec.ts)
- [packages/dsh-bot/tests/client/right-tab.spec.tsx](../../../packages/dsh-bot/tests/client/right-tab.spec.tsx)
- [packages/dsh-bot/tests/deepening/native-execution.spec.ts](../../../packages/dsh-bot/tests/deepening/native-execution.spec.ts)
- [packages/dsh-bot/tests/delegate-continuation.spec.ts](../../../packages/dsh-bot/tests/delegate-continuation.spec.ts)
- [packages/dsh-bot/tests/group-concurrent-profile.mjs](../../../packages/dsh-bot/tests/group-concurrent-profile.mjs)
- [packages/dsh-bot/tests/group-native-api-profile.mjs](../../../packages/dsh-bot/tests/group-native-api-profile.mjs)
- [packages/dsh-bot/tests/groups-natural.spec.ts](../../../packages/dsh-bot/tests/groups-natural.spec.ts)
- [packages/dsh-bot/tests/integration-groups.spec.ts](../../../packages/dsh-bot/tests/integration-groups.spec.ts)
- [scripts/deepening/b4-web-host.mjs](../../../scripts/deepening/b4-web-host.mjs)
- [scripts/group-concurrent-runtime.mjs](../../../scripts/group-concurrent-runtime.mjs)
- [scripts/group-execution-ui.mjs](../../../scripts/group-execution-ui.mjs)
- [scripts/group-native-api-runtime.mjs](../../../scripts/group-native-api-runtime.mjs)
- [tasks/A-D-group-collaboration.md](../../../tasks/A-D-group-collaboration.md)
