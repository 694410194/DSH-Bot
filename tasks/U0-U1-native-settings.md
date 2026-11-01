# U0/U1：原生 UI 验证与设置体验

2026-11-01 用户批准全页面审查方案，并授权新建分支、Issue、Draft PR 和实施本阶段。

跟踪：[Issue #12](https://github.com/MJ-CJM/DSH-Bot/issues/12)。基线：已合入 PR #11 的 `fe5e5ff`。分支：`codex/native-settings-u0-u1`。

## U0 — 先验证

- 使用锁定 rc.2 公共声明和 rc.2 / rc.5 隔离 Host，验证官方 Modal、Menu、Input、Checkbox 和分段控件；验证嵌套菜单 Escape、焦点恢复、busy、亮暗及窄屏。
- 核对公开 settings.section / settings.plugins.tab、SettingsForm/SettingsFormModel 的 owner、namespace、保存与离开行为；区分插件配置文档与 Bot CRUD。
- 新集成只有类型通过不算运行验证；记录可直接复用、需要适配和本阶段不迁移的结论。

## U1 — 实现范围

- 统一设置页的 Bot 上下文，身份为 id + createdAt，连接器/通知/记忆/协作不自行换 Bot；跨对象切换处理未保存草稿，旧身份响应不得污染新对象。
- 设置入口和来源返回保持明确；记忆与导入导出不再藏在独立折叠入口，使用稳定导航。
- 连接器和通知默认显示列表/空态；点击新建或编辑才显示表单，取消/保存/失败与重复提交行为一致。
- 移除记忆页顶部执行统计，在任务分区保留并标明范围；记忆首屏优先搜索、条目或空态。
- 优先复用已验证的官方 Modal、普通控件与 tabs；保留业务 busy、dirty、校验和版本栅栏。
- 修正新建 Bot 未请求工作区却显示“正在加载”的文案。

## 验收

1. beta 跨设置分区保持；同 ID 删除重建不继承旧草稿。
2. 返回恢复来源、选中、搜索、滚动与焦点；未保存可继续编辑或放弃。
3. 空列表没有自动展开的新表单；保存失败保留输入，取消关闭编辑。
4. 记忆首屏显示主要内容，无执行统计挤占；任务分区明确统计范围。
5. 官方模态层处理嵌套菜单、Escape、Tab、busy 和回焦；没有手写第二套焦点陷阱。
6. 中英、亮暗、1440/768/390 实际浏览器；完整 scripts/pnpm check 与 CI。
7. 无真实模型、无桌面安装、无依赖升级；所有运行目录在仓库 .dsh-dev，公共 API 记录入 docs/dsh-api-notes.md。

U2–U4、群聊算法、详情页大改与真实 IM/Teams 验收不在本 PR 范围。
