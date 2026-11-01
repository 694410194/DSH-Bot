# 社区发布整理验收

日期：2026-10-31。工作分支：`chore/community-release`；基线：`a6690fb`（PR #5 合入 main）。本轮保持产品版本 0.6.3，属于尚未发布的维护改动，许可证仍为 UNLICENSED，等待权利人选择。没有安装或升级正式桌面插件，也没有发布 npm、Release 或社区目录条目。

## 改动

- 构建正确处理中文、空格及百分号路径；Host manifest 使用平台无关的 `/`。
- DSH CLI 支持显式可执行路径、PATH 和 macOS 桌面回退；隔离 profile 区分精确 rc.2 与显式兼容验证，收据记录实际版本。
- 默认测试只使用当前产物和仓库内输入。历史安装包回归保留为独立 `test:release`，固定校验三份原始包的 SHA256，缺包或篡改均失败。
- 历史案例库使用 49 个原始已跟踪 blob 的冻结快照与既有摘要，不依赖旧 Git 对象或本地进度日志。
- 根据实际 Client 内联依赖生成并打包第三方完整许可证通知。
- 增加 Linux/macOS CI、真实 tarball 审计、格式和文档链接检查；补齐双语首页、版本记录、贡献与安全说明、Issue/PR 模板及社区提交格式。
- 保留历史验收内容，将 136 处不可公开访问的证据链接明确改为本地路径说明。

完整文件清单见 [community-readiness-files.txt](community-readiness-files.txt)。

## 命令与结果

为验证新贡献者环境，复制当前公开源码到带空格和中文的全新目录，初始化无历史提交的 Git 仓库，未复制 `node_modules`、`lib`、`dist`、`.codex/runs` 或原运行数据。随后独立获取冻结依赖，执行完整检查。该环境是本机 macOS，不能据此声称 Linux/Windows 已实跑。

| 项目 | 实际结果 |
| --- | --- |
| 干净副本 `scripts/pnpm install --frozen-lockfile` | PASS；独立安装成功，pnpm 11.28.5，无全局配置改动 |
| 干净副本 `scripts/pnpm check` | PASS；144 个测试文件、1244 tests passed、3 expected fail；构建、类型检查和 lint 成功，仅既有 quota-process 的一条信息提示 |
| `scripts/pnpm check:tooling` | PASS；5 项，覆盖路径、CLI 选择、版本/隔离收据以及 tarball 正反校验 |
| `scripts/pnpm test:release` | PASS；保留的 6 个真实历史包场景；三份旧 tgz 固定 SHA256 校验通过，未重建或替换旧包 |
| `scripts/pnpm check:docs` | PASS；相对文件链接可在公开源码找到；外链可用性与锚点不在此检查内 |
| `scripts/pnpm check:format`、`git diff --check` | PASS；无行尾空白、额外末尾空行或缺失换行，保留 Markdown 两空格换行 |
| 干净副本 pack + `node scripts/verify-package.mjs <tgz>` | PASS；包元信息、其余文件字节、第三方通知、Client 闭包及 185 个 Host 模块摘要一致 |
| GitHub Actions 的 Linux/macOS 作业 | FAIL（NOT_RUN）；配置已添加，尚未推送触发远端执行 |
| 精确 rc.2 Host、Windows 实机、新包 Host/UI/真实模型效果 | FAIL（NOT_RUN）；本轮不以静态检查或历史运行结果替代这些验证 |
| 开源许可证与公开发布 | FAIL（待决定/未执行）；当前保留 UNLICENSED，不声称社区版本已发布 |

本地验证目录：`.dsh-dev/community clean 中文-a4xjd_bt/`。安装、完整检查与打包日志分别位于其 `.dsh-dev/community-install.log`、`community-check.log`、`community-pack.log`；原始运行日志不随公开源码分发。

## 产物身份与数据保留

本轮候选包仅用于构建审计，位于上述干净副本的 `.dsh-dev/community-artifacts/dsh-bot-0.6.3.tgz`，SHA256 为 `28dd0e919504370b53cea0409ae71b9f64edc31c16034a1758acc8131114cd0d`。它不等于历史桌面安装包，不继承旧包的 Host/UI 验收结果，不应作为已发布版本分发。

原 `dist/dsh-bot-0.6.3.tgz` 未覆盖，SHA256 仍为 `8b911c6e643b53c9f4e5aad004772fdd8f17f35291eb11ab2ce5cc578fed705c`。原有未跟踪截图/审查笔记、正式桌面和用户数据保持原状。

后续顺序：确认许可并同步文件 → 审查与推送本分支、观察真实 CI → 确定正式版本并验证最终包 → 发布下载附件与真实链接 → 单独提交社区目录 YAML。具体字段和限制见[社区发布准备](../community-release.md)。
