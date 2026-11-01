# U：Bot 展示与设置返回验收

日期：2026-11-01。分支：`codex/group-concurrent-discussion`。跟踪 [Issue #8](https://github.com/MJ-CJM/DSH-Bot/issues/8)，实施 [Draft PR #9](https://github.com/MJ-CJM/DSH-Bot/pull/9)。对应[获批方案](../design/group-concurrent-discussion-proposal.md)的 U 阶段；并发、多轮和成员执行过程 A–D 尚未实现。

## 问题与修复

原来 Bots 页的内容受最近对话和群选择状态控制，用户难以找到所有 Bot；从群资料进入设置，返回却固定切到最近对话。现在默认展示完整“我的 Bots”，并固定提供“群聊 / 最近对话”入口。最近对话的隐藏状态不再影响 Bot 全集。

设置显示明确来源及对应返回按钮，恢复原一级页、原群、搜索、滚动和返回入口焦点。群导航请求只消费一次，轮询或面板重挂载不跳回旧群；对象删除、归档或同 ID 重建时回到列表并说明原因。群详情逐个显示成员头像、姓名和启用/不可用状态，资料弹窗关闭后仍在原群。归档收进“更多”，主要操作不再占满整行。

插件内离开设置或切换表单所属 Bot 时，未保存编辑会提示继续编辑或放弃；只记录 dirty 标记，不记录凭据内容。设置子页继续使用已有 RetainedPanel 保留草稿。宿主级侧栏切换仍使用原生生命周期，未提交设置不跨卸载或重启持久化。

## 执行命令与结果

| 命令 | 实际结果 |
| --- | --- |
| `scripts/pnpm build` | PASS，Host 与 Client 构建成功；最终 client.js 为 957662 字节 |
| `scripts/pnpm -F dsh-bot exec vitest run --config ../../vitest.config.ts tests/client/bots-navigation.spec.tsx` | PASS，新增导航行为回归 8 个用例 |
| `scripts/pnpm check` | PASS，145 个测试文件；1252 passed、3 expected fail；构建、类型、lint 通过 |
| `DSH_HOME="$PWD/.dsh-dev" node scripts/bots-navigation-ui.mjs --mock-only` | PASS，隔离真实 Host/Web/Chromium，中英 × 亮暗 × 1360/390px 共 8 组，32 张截图，0 次模型请求 |
| `scripts/pnpm check:docs`、`scripts/pnpm check:format`、`git diff --check` | PASS，333 个本地链接、1047 个文本文件的格式与空白检查通过；不验证外部链接和锚点 |
| GitHub Actions | 推送后核对本次提交的 Linux/macOS 构建、测试与实际 tarball 审计；结果见 PR 当前 Checks，不复用旧提交 CI |

全量检查仍包含基线的一条信息级 lint 建议（`tests/deepening/quota-process.mjs` 的模板字符串）及 Node localstorage 参数警告，未产生失败。初轮回归暴露了旧测试默认群页假设、删除成功提示覆盖以及窄屏滚动/文本挤压问题，已修正并通过最终运行；此处统计仅使用最终结果。

隔离浏览器脚本使用已有 Chromium（可用 `DSH_BOT_CHROMIUM` 指定）和 `scripts/dsh`，需要本机可用 DSH，不加入无 Host 的 CI 必跑任务。它只访问 loopback，合成 24 个 Bot 和一个三成员群；没有调用真实模型或修改正式用户 profile。开发依赖锁 rc.2，实际 `scripts/dsh --version` 为 rc.5，因此这份运行收据不构成 rc.2 Host 实测。

## 逐项验收

| 验收项 | 结果与证据范围 |
| --- | --- |
| 无会话和最近隐藏的 Bot 仍在全集 | PASS，双语组件回归与全部 8 组浏览器检查 |
| 三个固定入口可识别 | PASS，浏览器按钮数量、标签、选中态及真实点击 |
| 设置明确返回我的 Bots、最近对话或指定群 | PASS，组件覆盖三种来源；浏览器覆盖 Bot 列表与指定群 |
| 搜索、滚动、焦点恢复与原生面板重挂载 | PASS，组件及真实浏览器；浏览器滚动用键盘激活进入设置，避免点击自动滚回顶部造成假象 |
| 群成员逐个展示及资料原路返回 | PASS，三成员浏览器 fixture 和组件回归 |
| 目录轮询、旧 selection 不抢页面 | PASS，请求消费、刷新和宿主面板往返回归 |
| 同 ID 重建群不替代原选中群 | PASS，组件回归；其他删除路径沿用既有回归 |
| 未保存连接器继续编辑/放弃、切换 Bot 保护 | PASS，组件回归；浏览器验证返回确认和保留/放弃 |
| 已保存 HTTP 连接器不误报未保存 | PASS，组件回归 |
| 导航不调用模型 | PASS，浏览器适配器最终请求数为 0；组件查看/返回未调用 openConversation/openSession |
| 中英、亮暗、宽窄布局 | PASS，8 组真实主题 token/横向溢出断言、Bot 文本与操作按钮边界检查；抽查代表截图。不是读屏完整验收 |
| 正式桌面安装与用户验收 | FAIL（未执行），本阶段只运行隔离 Web，未操作正式安装 |
| rc.2 实际 Host 导航运行 | FAIL（未执行），仅 rc.2 类型/构建与 rc.5 Host 实跑 |
| 运行中真实 Agent、长任务并发与思考过程 | FAIL（未执行），属于后续 A–D，不以零请求导航检查替代 |

## 运行收据与截图

最终本地收据：`.dsh-dev/bots-navigation-ui/1793526853122-15955/summary.json`，状态 PASS，errors 为空，modelRequests = 0，chromiumSandbox = true。完整截图和 Host 日志保留在同目录，不提交本机运行数据。

浏览器运行使用的 client.js SHA-256 与之后全量 check 构建产物一致：`ed7671fd7d38aa16e4a63606c587a76ee504bb22e18d7e58f12068a553e39252`。本阶段未生成发布候选版本，旧 0.6.3 候选原件未覆盖；后续 D 阶段再分配独立候选版本并记录包 hash。

以下图片均为隔离合成数据，不包含用户截图、会话或工作区：

- [窄屏：完整 Bot 入口](../screenshots/bots-navigation/zh-dark-390-my-bots.png)
- [宽屏：逐个群成员](../screenshots/bots-navigation/zh-dark-1360-group-members.png)
- [设置：返回原群](../screenshots/bots-navigation/zh-dark-1360-settings.png)

## 改动文件清单

| 文件（仓库相对路径） | 用途 |
| --- | --- |
| `docs/PLAN.md`、`docs/design/group-concurrent-discussion-proposal.md`、`tasks/U-bots-navigation.md` | 已批准范围、跟踪入口及阶段状态 |
| `docs/dsh-api-notes.md`、`docs/acceptance/U-bots-navigation.md`、`docs/screenshots/bots-navigation/*.png` | 公开能力复用、运行边界、验收和合成截图 |
| `packages/dsh-bot/src/client/index.tsx`、`pages/bots-page-types.ts`、`pages/page-navigation.ts` | 注入生命周期内的导航状态 |
| `packages/dsh-bot/src/client/pages/BotsPage.tsx`、`use-bots-page.ts`、`BotsTab.tsx`、`RecentConversations.tsx` | Bot 全集、固定入口、原路返回及详情 |
| `packages/dsh-bot/src/client/groups-state.ts`、`components/GroupsPanel.tsx` | 一次性群导航请求、精确群身份和成员展示 |
| `packages/dsh-bot/src/client/components/SettingsNavigation.tsx`、`ManagementHeader.tsx` | 未保存编辑确认与切换 Bot 保护 |
| `packages/dsh-bot/src/client/components/ConnectorEditor.tsx`、`CredentialEditor.tsx`、`NotificationsPanel.tsx`、`CollaborationPanel.tsx`、`MemoryEditor.tsx`、`ManagedMemoryEditor.tsx` | 表单 dirty 标记与保存/清理 |
| `packages/dsh-bot/src/client/styles/bots.module.css`、`groups.module.css` | 导航、成员及窄屏布局 |
| `packages/dsh-bot/locale/en.json`、`zh.json` | 对应中英文案 |
| `packages/dsh-bot/tests/client/bots-navigation.spec.tsx`、`groups.spec.tsx`、`ui.spec.tsx` | 新行为与现有用例回归 |
| `packages/dsh-bot/tests/bots-navigation-ui-profile.mjs`、`scripts/bots-navigation-ui.mjs` | 隔离 Host 合成数据和真实浏览器矩阵 |

## 遗留与后续

U 的本地开发验证已完成。PR 仍为 Draft，后续先做 A 的公开 API spike，再推进并发调度、多轮协作、执行过程和候选验收。正式桌面及真实模型质量由后续明确安排的验收覆盖；不将现有串行群聊标记为已改成并发。
