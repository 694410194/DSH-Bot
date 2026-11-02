# 社区介绍与安装说明验收

2026-11-01（America/Los_Angeles）。基线 `e1ea980`，分支 `docs/community-showcase`。
用户授权本轮创建分支、提交、推送并创建 PR；未合并 PR、未替换公开 Release、未修改正式桌面数据。

## 改动文件

- 根目录 `README.md` / `README.en.md`：用户定位、功能截图、安装、首次使用、FAQ 与边界；保留开发者入口。
- `packages/dsh-bot/README.md` / `README.en.md`：完整中英文包介绍，供社区语言探测与页面渲染。
- `packages/dsh-bot/assets/showcase/`：10 张新截图，两个语言各含 Bots、群聊过程、资料、记忆和任务页。
- `packages/dsh-bot/screenshots.json`：更新为 5 张中文演示图，供支持该清单的市场展示；英文 README 使用英文图。
- `scripts/community-showcase.mjs` 与 `packages/dsh-bot/tests/community-showcase-profile.mjs`：可重复的隔离 Host 和浏览器截图。
- `packages/dsh-bot/package.json`、`scripts/verify-package.mjs`、`scripts/p34-artifact.mjs`：明确随包携带英文 README，并调整精确文件白名单。
- `scripts/community-build.test.mjs` / `scripts/prepare-release.test.mjs`：英文文档打包与内容一致性回归。
- 本目录：结果、摘要收据及社区模板的本地预览截图。

## 原生复用与演示数据

运行环境是 macOS、DSH CLI `0.2.1-rc.5`，开发依赖仍锁定 rc.2。通过现有 `webHost` 加载当前构建的插件，所有状态位于仓库 `.dsh-dev`。
没有替换页面文字、伪造 DOM、修改宿主样式或修图。Bot 注册、私有记忆、主会话、群派发和子任务均使用已有服务；原生子任务通过 `subagents.startActivation` 创建并执行，截图显示其记录。
每种语言 4 次本地脚本化请求，群成员最大重叠执行数 2；外部真实模型请求 0。脚本化 reasoning 是虚构演示内容，不是对真实模型质量的验证。
每种语言实际捕获 6 页，其中单聊截图仅留本地，公开 5 页。没有启动常驻定时任务，也不宣称实测了关机后运行。
未重新测试 v0.6.3 发布包的安装；README 引用已有发布验收，本轮只重验稳定附件下载与 SHA256。

复现截图（需已安装兼容 DSH CLI、仓库依赖与 Playwright Chromium）：

```sh
scripts/pnpm build
DSH_HOME="$PWD/.dsh-dev" node scripts/community-showcase.mjs --mock-only
```

输出在 `output/playwright/community-showcase/`，隔离资料与日志在 `.dsh-dev/community-showcase/`。
脚本只捕获；复核后才将选定图片复制至公开 assets。旧截图保留，避免破坏历史文档链接。

## 社区页面机制与预览

只读核实 [社区源码](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/tree/2ecbb58b71525850630fae26ae25466e4458201a)：

- `scripts/probe-readmes.mjs` 优先取 monorepo 子目录 README，按内容识别语言并寻找 `README.en.md`；单份上限 48 KiB。
- `scripts/build-site.mjs` 的 `renderReadme` 删除原始 HTML、降一级标题、解析相对路径，并限制图片域名为 GitHub 托管。
- 页面使用 README 内的图片；`screenshots.json` 不会自动生成网页图库。
- `.github/workflows/build-site.yml` 日常推送可能使用缓存，定时全量探测为 UTC 02:23；并不保证到该时刻立即发布成功。

本轮复用该 commit 的实际 `renderReadme`、Marked 18.0.9 和线上页面 HTML/CSS，在本地将新 README 插入站点同一位置。
相对图片 URL 按 GitHub 原始地址生成，浏览器拦截映射到尚未合并的本地 PNG。停用页面脚本，未模拟社区服务端抓取、语言缓存更新、评论或安装按钮交互。
因此六种组合通过说明文档适配当前渲染规则，**不代表线上已更新**。

- 中文/英文 × 1440 / 768 / 390 px：各 5 张图片加载，破图 0，文档水平溢出 0，页面 JS 错误 0。
- 实际包 README 文件可被中英文语言规则分别识别，均低于截断阈值。
- [桌面中文预览](zh-1440-readme.png)、[手机英文预览](en-390-readme.png)；完整截图仅保留本地输出。
- [摘要收据与图片 SHA256](receipt.json)。

## 命令与验收

| 验收项 / 命令 | 结果 |
| --- | --- |
| 中英文用户说明与 10 张演示图 | PASS |
| `DSH_HOME="$PWD/.dsh-dev" node scripts/community-showcase.mjs --mock-only` | PASS：两种语言各 4 次本地请求，真实模型 0，页面错误 0 |
| 社区渲染规则预览 | PASS：6 种语言/宽度组合，图片与布局正常 |
| `scripts/pnpm check` | PASS：构建、148 个测试文件、1271 项通过 / 3 项预期失败、类型检查、lint；lint 只有已有的 1 条 info |
| `scripts/pnpm check:tooling` | PASS：7 项通过，包括真实打包内容验证与英文 README 字节不匹配拒绝 |
| 提交内容的文档链接、格式与 `git diff --check` | PASS：422 个链接 / 223 个 Markdown 文件；1101 个文本文件格式通过 |
| 稳定附件下载与 `shasum -a 256 -c dsh-bot.tgz.sha256` | PASS：匿名下载 tgz 与校验文件，输出 `dsh-bot.tgz: OK` |
| 线上中英文页面访问、安装地址检查 | PASS：均 HTTP 200，稳定 tarball 地址正确 |
| 新 README 已在社区线上展示 | FAIL（等待发布）：检查时两页 README 区块均为 0，PR 尚未合并，社区尚未抓取本轮内容 |

完整检查的首次失败暴露 pnpm 自动包含 `README.en.md`、但本项目两个包白名单不接受它；已补精确许可和随包声明，并增加英文 README 内容不一致的拒绝用例。不是跳过验收或放开任意文件。
文档/格式检查使用只含提交内容的独立快照，避免已有未跟踪的本地设计资料干扰；不删除或修改这些用户资料。

稳定包 SHA256：`6afab5b00a99a199427e4a83ef2f1762cf2d7f829f6acb5f6449fa9f15e6cda0`。本轮未替换 Release 附件。
市场索引快照有 4192 条，未含 DSH-Bot；文档保留直接安装路径，不声称市场已可立即搜到。

## 合并后的收尾

本仓库 PR 合入 main 后，等待社区成功完成新一轮 README 探测与页面构建，再访问[英文页](https://awesome-dsh-plugin.com/p/MJ-CJM/DSH-Bot--packages-dsh-bot/)和[中文页](https://awesome-dsh-plugin.com/zh/p/MJ-CJM/DSH-Bot--packages-dsh-bot/)。
应出现对应语言的完整介绍和 5 张截图，安装链接仍指向 latest 固定附件。
若一次成功的全量构建后仍缺失，检查社区探测日志/缓存，并向社区维护者反馈具体 URL 与提交；不通过重复收录 PR 触发刷新。
