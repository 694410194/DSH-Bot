# A 阶段：原生 API 实测

基线：PR #9 合并后 `c911ec9`。只使用 `.dsh-dev` 隔离 Host、合成 adapter 和回环网络；没有真实模型或桌面版安装操作。

参考源码路径 `../deepseek-harness` 在当前机器不可用。接口与生命周期说明来自已经安装的公开 rc.2 包 README、声明和发布的实现，不声称检查过源码 tag 工作树。

## Host

`DSH_HOME="$PWD/.dsh-dev" DSH_BOT_DSH_BIN="$PWD/.dsh-dev/native-api-rc2/node_modules/.bin/dsh" node scripts/group-native-api-runtime.mjs --mock-only`

在 rc.2 实际 Host 和当前 rc.5 CLI 上分别运行过合成验证。并发重叠、busy inbox、idle 同 childId 继续、独立停止、旧 activation disposer 不影响新激活、公开 start/end 的 runId 归属、父桥接的真实 agent-message 来源、禁止直接 sibling 投递、drain 和只读 catalog 均得到实际收据。根会话模型请求为 0。最终完整收据路径与统计见本目录验收报告。

注意：原始 API fixture 使用单独的空 plugins preset 隔离 API 合同。它不是产品权限验证。真实 Bot preset 的冷恢复还必须经过插件自己的精确任务/成员 reservation 与数据流准入，不能将原始 API 成功视为群聊集成成功。

`startActivation.result` 只代表该次激活；后续 `sendMessage` 唤醒的结果必须从新的 `subagent/start` / `subagent/end` runId 收取。不能复用旧 promise 或 disposer。业务作者保留在群消息与桥接载荷；native source 仍然是实际 root Agent。

隔离安装 rc.2 首次 pnpm add 下载完成，但因依赖构建脚本未获准执行返回 `ERR_PNPM_IGNORED_BUILDS`。纯 JS CLI 可实际启动，不能把该安装命令记为 PASS。

## Client

公开 `conversation.content` factory 不能嵌套于自身内部，即使使用不同 child 的 SessionProvider，原生框架也会抛出 recursive factory 错误。因此采用同屏原生右侧 tab：群内保留执行卡，点击在右侧显示实际 child 的 reasoning / 工具 / 正文，不离开群会话与草稿。

`SessionProvider` 接收公开 `sessions.retain` 的 SessionReference。tab 的 effect 释放引用与只读 block；工厂沿用原生折叠、工具和过程渲染。通过公开 composer chain 与 conversation.blocks 抑制子会话的直接输入。打开、关闭、再次打开不调用模型。

此前嵌套失败与之后正确右侧面板验证分别保留在 `.dsh-dev/group-execution-ui`，不隐藏失败路径。
