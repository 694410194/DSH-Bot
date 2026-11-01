# 社区发布准备与验收

状态：**准备中，尚未发布**。当前源码版本保持 0.6.3。已有本机 tgz、隔离运行及桌面安装历史收据，不等于 npm、在线市场或 GitHub Release 已发布。本文没有可用的公开下载 URL。当前 `UNLICENSED`，社区许可证须由用户/权利人另行选择，本次不代选。

Status: preparation only; no community release has been published. Version remains 0.6.3. Local archives and historical acceptance receipts are not public downloads. Licensing is unresolved (`UNLICENSED`); the owner must select any future community license.

## 1. 检出与基础检查

从仓库根运行，确认工作树、依赖锁和版本，保留已有改动。要求 Git、Node.js `^22.19.0 || >=24.0.0`、pnpm `11.28.5`。

```sh
git status --short
scripts/pnpm install --frozen-lockfile
scripts/pnpm check
scripts/pnpm check:docs
scripts/pnpm check:format
scripts/pnpm check:tooling
```

普通 `check` 是当前源码的自包含检查，不依赖本机旧包。`scripts/pnpm test:release` 单独验证历史包，所需原始包与固定 hash 见[贡献指南](../CONTRIBUTING.md)。缺包必须报告失败；基础 CI 通过不代表升级矩阵通过。

## 2. 打包与产物标识

```sh
scripts/pnpm pack:plugin
node scripts/verify-package.mjs dist/dsh-bot-0.6.3.tgz
shasum -a 256 dist/dsh-bot-0.6.3.tgz
```

记录当前 commit/工作树、命令结果、tgz 字节数、文件清单与 SHA256。核对 `package.json`、引导/模块版本、locale、包 README、许可证和第三方告知；安装验证使用刚打出的同一 tgz，并核对已安装文件。

**同为 0.6.3 不表示字节相同。** 社区维护改动会改变包 README、告知或打包内容；历史验收报告中的 SHA256 仅属于当时包，不能沿用到新包，也不能把重新构建当作历史包回归夹具。现有本地产物不得静默覆盖；打包前由维护者先保留旧包及校验记录。

## 3. 隔离运行与证据

仅使用仓库 `DSH_HOME="$PWD/.dsh-dev"`。DSH CLI 经 `scripts/dsh`，可用 `DSH_BOT_DSH_BIN` 指向已有可执行文件；然后按[贡献指南](../CONTRIBUTING.md)运行对应 Host、崩溃、职责与 Web 矩阵。完整 Host 必须串行，不清空数据或删除 owner 锁来绕过冲突。

开发依赖/API 参考为 rc.2，已有完整运行实测 rc.3；本次使用的 CLI 版本必须重新记录。合成模型只证明流程与路由，真实模型理解与质量、精确 rc.2 运行仍需单列。外部 IM/推送、持续主动和常驻能力不能写入已交付清单。

公开仓库链接只能指向纳入仓库的文件。历史 `.dsh-dev/`、`dist/` 收据已标为“本地证据” code 路径，不随 clone 提供；它们的历史判定不被删除。若要公开截图或日志，先逐份脱敏、审查，再明确选择文件纳入发布附件，不上传整个隔离 profile。

## 4. 用户桌面安装（由用户或明确授权的维护者执行）

推荐 **插件 → 添加插件 → 安装第三方插件** 选择 tgz。保持原 profile 与数据位置，先做完整备份，安装后完全退出并重开。不要删除 Bot 或重置数据作为升级步骤。

备用 CLI 方式只适用于能管理该 `desktop` profile 的桌面内置 CLI；普通 npm CLI 不保证可管理它。先正常退出桌面应用，再由用户确认原实例 `DSH_HOME`：

```sh
DSH_HOME="<原桌面实例 DSH_HOME 的绝对路径>" scripts/dsh plugin --profile desktop add "$PWD/dist/dsh-bot-0.6.3.tgz"
```

这不是开发自动检查命令；项目开发任务默认禁止修改正式桌面与 `~/.dsh`。卸载插件与删除 Bot 不同；已有原位升级记录见[0.6.3 桌面验收](acceptance/V063-desktop-install.md)。迁移 Fence 后直接降级不可写入，回退需升级前独立完整备份，并考虑已遗忘内容从旧备份复活的风险。

## 5. 真正发布前的门禁

| 项目 | 当前状态与要求 |
| --- | --- |
| 版本 | 0.6.3，当前维护改动不改版本号；未来正式发布标识由维护者决定 |
| 基础检查与链接 | 按本次实际日志填写 PASS/FAIL，不能照抄历史次数 |
| 历史包/升级 | 独立回归；缺旧包或未跑完整 Host 时写 FAIL/NOT_RUN |
| 同包运行与 UI | 新打包的 hash 对应新运行证据；只改文档不声称产品运行已重新验收 |
| 真实模型质量/精确 rc.2 | 尚未验证，不能标为 PASS；发布时必须披露 |
| 许可证 | 当前 UNLICENSED；用户选择授权、文件与元数据一致后才能声称开源 |
| 安全入口 | 无已确认私密入口，按 [SECURITY.md](../SECURITY.md) 说明；不虚构邮箱 |
| 发布位置 | npm、市场、GitHub Release 均尚未发布，没有 release URL |
| 最终动作 | 维护者完成许可/产物/验收审阅后另行决定发布；本文不执行 commit、push、tag 或发布 |

未来发布时，将审核后的同一 tgz、对应校验和与实际结果附到选定渠道，再把 README 中“尚未发布”改为真实状态和真实链接。文档准备本身不授予上传、推送或发布权限。

## 6. 社区目录提交格式

DSH [官方贡献指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.zh.md) 当前鼓励独立插件和 `dsh-plugin` topic，暂不接受外部实现 PR。社区目录是单独维护的 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，不是将本仓库全部代码合入 DSH 主仓。

准备公开分支、准确的仓库简介、`dsh-plugin` topic 及真实可下载的 Release tgz 后，按目录的 monorepo 规则提交单个条目：

```text
data/plugins/MJ-CJM__DSH-Bot--packages-dsh-bot.yml
```

条目形状如下；此处仅为示例，`tarball` 必须在实际发布后填写真实 GitHub Release HTTPS `.tgz` 地址，不能直接提交占位值。

```yaml
url: https://github.com/MJ-CJM/DSH-Bot/tree/main/packages/dsh-bot
name: MJ-CJM/DSH-Bot#dsh-bot
category: workflow
description:
  en: Personal Bots with memory, workspace group chats and native background tasks for DeepSeek Harness.
  zh: 在 DeepSeek Harness 中提供具备记忆的个人 Bot、工作区群聊和原生后台任务。
tarball: <actual GitHub Release HTTPS tgz URL>
```

英文描述必填，中文可选；描述必须与实际交付功能一致。目录 README 由数据生成，不手工改它们。当前仓库不支持直接从 GitHub 根目录安装，因此使用预构建包路线。若以后支持 Git 源码安装，须按[官方打包文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)提供自包含 `prepare` 与构建授权说明。

目录 `icon` 是可选字段，填写时需使用 GitHub 托管位图；包内 `icon.svg` 继续供 DSH 插件使用。无需为收录改包名、将所有无状态依赖移入 peer，或上传完整开发日志。提交前重新阅读目录当时的规则。
