# 社区首发候选验收

日期：2026-11-01（America/Los_Angeles）。分支 `codex/community-release-ready`，基线 `05634b9`。本报告是本地准备完成、提交前的验收快照，区分候选材料、实际运行和公开发布；记录时未 commit/push、创建 tag、发布 Release 或提交目录 PR。后续提交与远端 CI 结果以该分支 PR 的提交和 Checks 为准，不改写以下本地验收证据。

## 实现范围

- 用户选择 MIT，Copyright (c) 2026 MJ-CJM；根目录、包内许可证与当前说明同步，保留第三方告知和历史收据。
- 复用既有打包审计生成候选 tgz、SHA256SUMS、来源清单、Release notes 模板与社区目录 YAML；重复生成拒绝覆盖，未定许可或过期包拒绝生成。
- 增加手动候选 CI，只上传 artifact，无发布权限；更新主 CI 的工具回归入口。
- 修复 Host 验收夹具的包白名单与许可证断言，支持现有第三方许可告知；没有修改产品 API。
- pnpm 的版本管理器数据目录也固定在仓库内；测试并发限制为两个 worker，保持断言、超时与预期失败语义。
- 用现有 SVG 渲染市场位图；展示图来自实际隔离 Web Host 的合成数据，不使用旧版本截图或生成的 UI 示意图。

## 最终包身份

- 包：`dsh-bot@0.6.3`，MIT，Copyright (c) 2026 MJ-CJM。
- SHA256：`c609d3bcead8251ec988822bed2a07720402f52513e2898ddbfacf397a39033b`。
- 候选目录：`dist/release-candidates/v0.6.3-c609d3bcead8/`。安装包、校验和、实际结果版 Release notes、来源记录与社区 YAML 一并交付；尚无公开下载地址。
- 构建：macOS 26.6.2 arm64，Node 25.9.0，pnpm 11.28.5。实际隔离 CLI/Host：**DSH 0.2.1-rc.2**。仅合成适配器，真实模型请求 0。
- 代码基线 `05634b9` 加本分支未提交改动；`release.json` 如实记录 dirty 状态。维护者提交后须核对最终 tag 包含这些来源改动。
- 运行验收后整库重新构建，再次逐字节审计候选与当前构建相符；没有用另一个同版本包替换已验收产物。

## 命令与实际结果

以下命令均从仓库根运行；所有 Host 命令设置 `DSH_HOME="$PWD/.dsh-dev"` 与 `DSH_BOT_ARTIFACT=.dsh-dev/community-release-ready/final-artifact/dsh-bot-0.6.3.tgz`，完整 Host 串行执行。

| 命令或检查 | 结果与范围 |
| --- | --- |
| `scripts/pnpm install --frozen-lockfile` | PASS；pnpm 11.28.5，393 包，lockfile 无改动；下载有慢网络告警 |
| 首次 `scripts/pnpm check` | FAIL；默认并发下 6 个失败：4 个测试超时、2 个工作流等待断言超时。保留日志，不计为通过 |
| 5 个失败文件以 `--maxWorkers=2` 重跑 | PASS；63 tests。随后将默认 worker 上限设为 2，未放宽断言、超时或跳过测试 |
| 最终 `scripts/pnpm check` | PASS；144 文件、1244 tests passed、3 expected fail；构建、类型检查、lint 均成功。保留原 quota-process 的一条 lint info 与 Node localStorage 提示 |
| `node --test scripts/community-build.test.mjs scripts/prepare-release.test.mjs` | PASS；7 项，包含不接受未定许可/过期包、原样复制校验和、拒绝覆盖候选、Host 审计兼容告知，以及 pnpm 目录约束 |
| `scripts/pnpm -C packages/dsh-bot pack --pack-destination ../../.dsh-dev/community-release-ready/final-artifact` | PASS；选定上述唯一最终包，保留前期包 |
| `node scripts/verify-package.mjs <final-tgz>` | PASS；实际包元数据、所有文件字节、Client 闭包及 185 个 Host 模块摘要一致；整库重建后再次通过 |
| `node scripts/onboarding-native-runtime.mjs --mock-only` | PASS；rc.2 安装/热启动、8 次合成请求、同包重装、冷恢复 0 请求；用户输入优先与取消场景通过 |
| `node scripts/onboarding-crash-runtime.mjs --mock-only` | PASS；6/6 真实 SIGKILL 边界；pending/uncertain/completed 状态符合预期，无未知状态自动重放 |
| `node scripts/live-persona-runtime.mjs --mock-only` | PASS；hot 7/cold 2 合成请求，原生审批、热/冷职责与群 worker、主会话历史保留；群 root 模型请求 0 |
| `node scripts/onboarding-ui.mjs --mock-only` | PASS；中英 × 亮暗 × 1360/390，8 cases、320 检查、80 截图；pageErrors=0，18 次合成请求，0 真实请求 |
| 展示素材与 `screenshots.json` | PASS；三张当前包实拍直接复制、PNG 尺寸与相对路径核对；目视检查。市场 icon 为现有 SVG 的 256px 位图；没有上传 profile 或私有会话 |
| `scripts/pnpm check:docs`、`scripts/pnpm check:format`、`git diff --check` | PASS；本地文档文件链接与空白格式检查通过；不包含外链/锚点验证 |
| `scripts/pnpm release:prepare <final-tgz>` | PASS；生成候选包、SHA256SUMS、来源记录、Release notes 和目录 YAML；最终回读校验和一致 |
| `scripts/pnpm test:release` | FAIL（缺原始包）；0.3.2/0.4.0/0.4.1 原包不在本机，beforeAll 明确失败，6 项未执行；没有静默放行或重造旧包 |
| 新发布候选工作流在 GitHub 上运行 | FAIL（NOT_RUN）；本分支未推送。既有 PR #6 的 Linux/macOS CI 成功不替代新分支远端检查 |
| 真实模型质量、正式桌面安装、Windows/Linux Host | FAIL（NOT_RUN）；本轮仅隔离 rc.2 macOS Host/Web，没有使用真实密钥或修改正式桌面 |

## GitHub 设置与发布状态

- PASS：`gh repo edit` 补充仓库简介与 `dsh-plugin`、`deepseek-harness`、`ai-agents`、`mcp` topics，`gh repo view` 回读一致。
- PASS：通过 GitHub API 启用私密漏洞报告，随后 GET 回读 `enabled: true`；SECURITY.md 已链接真实入口。未发送测试报告。
- FAIL（NOT_RUN）：提交、推送、tag、Release 公开、公开下载复验与社区目录 PR。生成 YAML 的下载地址是计划中的固定 tag 地址，必须在 Release 实际公开后才提交。

## 本地证据与剩余边界

原始日志位于 `.dsh-dev/community-release-ready/`；具体运行目录如下，仅供本机复核，不随 clone 提供：

- Native：`.dsh-dev/onboarding-native/1793519948508-16865/`。
- Crash：`.dsh-dev/onboarding-crash/1793519957648-17332/`。
- Persona：`.dsh-dev/live-persona/1793519979581-18082/`。
- UI：`.dsh-dev/onboarding-ui/1793519985021-18239/`。

以上四组对应同一最终 tgz。前期验证包与首次失败日志仍保留，不能混用为最终包收据。

本候选具备新安装及同版本重装的证据，**不声称已完成历史版本迁移回归或真实模型任务质量验收**。首发说明必须保留这些限制；若要承诺旧版原位升级，需要维护者提供固定 hash 的原包后补测。实际发布仍由维护者完成来源/tag/附件核对并上传同一已验收 tgz，不能重新构建后沿用本报告 hash。

改动文件清单见 [community-release-ready-files.txt](community-release-ready-files.txt)。后续操作见[社区发布说明](../community-release.md)。
