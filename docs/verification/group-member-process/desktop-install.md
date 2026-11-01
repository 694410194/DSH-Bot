# 原生思考与左右布局：本地桌面安装

2026-11-01，按用户“把这个版本装到本地 dsh”的明确授权，更新正式 desktop profile。安装的是当前工作区已验证的候选包，包含未提交的 UI 改动；不是重新从 main 构建。

## 版本与备份

- 宿主：DSH `0.2.1-rc.5`，未升级宿主。
- 插件：`dsh-bot@0.6.3`，同版本号通过包摘要区分构建。
- 包：`.dsh-dev/member-process-pack/dsh-bot-0.6.3.tgz`。
- SHA256：`92f74f4240837485a0d8d99a8489eb835ed96e55d90f80f7338587749267c7e0`。
- 安装目录：`~/.dsh/profiles/desktop/node_modules/dsh-bot`。
- 完整备份：`.dsh-dev/desktop-install-member-process-1793538663/dsh-before.tar.gz`。
- 备份目录 0700，归档、数据摘要、安装日志及收据 0600。备份包含个人配置与凭据，仅保留于本地忽略目录，不上传。

## 命令与实际结果

1. `scripts/dsh --version` 返回 `0.2.1-rc.5`。
2. `shasum -a 256 .dsh-dev/member-process-pack/dsh-bot-0.6.3.tgz` 与上述摘要相同。
3. `node scripts/verify-package.mjs .dsh-dev/member-process-pack/dsh-bot-0.6.3.tgz` 退出 0：包字节、元数据、Client 闭包和 186 个 Host 模块 hash 通过。
4. 实际桌面确认群聊空闲、输入框为空；正常 Cmd+Q 退出，进程检查确认应用及 Host 已退出。
5. Python 备份完整 DSH_HOME，记录 465 个存储、会话、Bot 和预设文件的 SHA256；归档可读，共 6005 个条目。
6. 官方 CLI 安装退出 0：

   ```sh
   DSH_HOME="$HOME/.dsh" scripts/dsh plugin --profile desktop add "$PWD/.dsh-dev/member-process-pack/dsh-bot-0.6.3.tgz"
   ```

7. Python 将 tgz 与安装目录逐文件比较，573 个文件全部一致；重开前复核 465 个数据文件，摘要全部不变。
8. 重开实际桌面，插件详情显示启用、1 个组件运行中，来源指向本次包；进入原群验证左右布局，展开最近问题的执行详情，实际展开和收起 Bot 的“思考过程”。未发送消息或触发真实模型请求。

安装仍有既有 server-memory 废弃子依赖和 peer 警告；CLI 退出 0，桌面加载正常，没有额外安装共享服务。收据和日志位于上述备份目录。本次仅安装及补充记录，未改产品代码，不重复此前已通过的整库检查。

## 验收

| 项目 | 结果 |
| --- | --- |
| 候选包与安装文件一致 | PASS；573 个文件匹配 |
| 备份与安装期间数据保留 | PASS；完整归档可读，465 个数据文件在重开前未变 |
| 实际桌面加载 | PASS；启用、1 个组件运行中、来源为本次 tgz |
| 用户右侧气泡、Bot 左侧回复 | PASS；在现有群聊历史中实际目视确认 |
| 问题下的成员思考 | PASS；Bot 身份与思考控件可见，正文可展开/收起，长正文有独立滚动区域 |
| 新任务真实模型流式展示 | FAIL（NOT_RUN）；按用户安排由其发送任务验证 |
| 新 GitHub CI | FAIL（NOT_RUN）；本次未提交或推送 |

## 本次改动文件

- 新增本安装记录；更新 `report.md` 的正式桌面验收状态。
- `.dsh-dev/desktop-install-member-process-1793538663/`：本地备份、数据摘要、安装日志、收据（忽略文件）。
- 官方 CLI 更新正式 desktop profile 的依赖、锁文件及插件安装内容。已有仓库改动和未跟踪文件保留。

## 用户试用

DSH 已停留在现有群聊。可以发送一条新问题，观察用户气泡靠右、各 Bot 回复和过程靠左；运行中展开对应问题下的成员，再展开“思考过程”。完整工具记录仍从成员的“执行详情”进入原生面板。旧任务不会因为升级重新执行。
