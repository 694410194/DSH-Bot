# DSH-Bot {{VERSION}}

Personal agents for DeepSeek Harness / DeepSeek Harness 个人智能体插件。

## Features / 功能

- Personal Bots with lasting roles and private memory; explicit sharing and forgetting management.
- Workspace group chat with mentions, replies, attachments, per-member models and independent task cancellation.
- Native background delegation and scheduled delivery; managed MCP connectors and in-app notifications.

支持个人 Bot、长期职责与私有记忆、显式共享与遗忘管理，以及工作区群聊、逐成员模型、原生后台委派和定时投递。

## Installation / 安装

Download `{{ASSET}}` from this Release's assets. Verify it with `SHA256SUMS`, then choose **Plugins → Add plugin → Install third-party plugin** in DSH. Enable the plugin and fully quit/reopen DSH.

下载本 Release 附件 `{{ASSET}}` 并核对校验和，在 **插件 → 添加插件 → 安装第三方插件** 中安装，启用后完全退出重开。GitHub 自动生成的 Source code 压缩包不是安装包。

SHA256: `{{SHA256}}`

The same bytes are also attached as `dsh-bot.tgz`, with the single-file checksum `dsh-bot.tgz.sha256`. The community download URL follows the latest stable Release; the versioned URL remains available for reproducible installs.

同一安装包另提供固定文件名 `dsh-bot.tgz`，下载它及 `dsh-bot.tgz.sha256` 后，在下载目录运行 `shasum -a 256 -c dsh-bot.tgz.sha256`（macOS）或 `sha256sum -c dsh-bot.tgz.sha256`（Linux）。社区入口跟随最新稳定 Release；固定版本地址继续保留。已安装的插件不会仅因链接改变而自动升级。

## Validation / 发布前填写实际验证

This is a candidate template. Replace this section with results for this exact artifact before publishing.
本节是候选模板，发布前须换为本包的实际结果，未运行项必须保留为未验证。

- Actual DSH version and OS / 实际 DSH 版本与系统：NOT_RUN
- Same-artifact installation and cold startup / 同包安装与冷启动：NOT_RUN
- Synthetic Host workflows / 合成 Host 流程：NOT_RUN
- English/Chinese, light/dark browser checks / 中英亮暗界面：NOT_RUN
- Applicable data-preserving upgrade checks / 适用的数据保留升级检查：NOT_RUN
- Real-model quality / 真实模型质量：NOT_RUN

The manifest declares `>=0.2.1-rc.2 <0.3.0`; this is not proof that every version or platform has been tested.

## Upgrade and limits / 升级与限制

Back up the original profile and full data before upgrading. Keep the same profile and storage configuration. Add the new tgz, then fully quit and reopen; do not reset the profile or delete Bots. Memory Migration Fence prevents writes by old versions after migration. Rollback requires a separate pre-upgrade backup; forgotten data may reappear from old backups.

升级前完整备份，保留原 profile、数据位置与存储配置；不要以删除 Bot 或重置数据作为升级步骤。迁移后的数据不能直接降级写入。

Bot homes are not filesystem isolation. Native DSH permissions and sandbox still apply. Real-model quality is separate from synthetic workflow evidence. Ongoing proactive operation, cloud hosting, IM ingress/egress and OS/mobile push have not shipped; background results after forced crashes are not guaranteed. Automatic sharing remains unavailable.

持续主动、云端常驻、IM 收发及系统/手机推送尚未交付；合成模型验证不代表真实模型任务质量。

License / 许可证：{{LICENSE}}. Third-party license texts are included in the package.
