# Community preview assets

These are actual screenshots of DSH-Bot 0.6.3 in an isolated DSH 0.2.1-rc.2 Web Host on macOS, using synthetic fixture data and zero real-model requests. No image editing or generated UI mockups were used. The group image shows the empty conversation and composer, not a completed group task.

本目录为当前版本实际界面，使用隔离环境与合成演示数据；群聊图展示空态及输入区，不代表群任务成果。

| Asset | Captured state |
| --- | --- |
| current-role.png | English/light, current-role dialog, 1360 × 1000 |
| group-chat.png | Chinese/dark, group conversation empty state, 1360 × 1000 |
| first-greeting.png | Chinese/light, synthetic first greeting, 1360 × 1000 |
| icon-256.png | Existing ../icon.svg rasterized at 256 × 256 |

The three screenshots are byte-for-byte copies from local run `.dsh-dev/onboarding-ui/1793519985021-18239/`. Its tgz SHA256 is `c609d3bcead8251ec988822bed2a07720402f52513e2898ddbfacf397a39033b`; all eight language/theme/width cases passed. Full scope and remaining limitations: [acceptance](../../../docs/acceptance/community-release-ready.md).

The icon is rendered with `scripts/render-market-icon.mjs` using an existing browser selected by `DSH_BOT_CHROMIUM`. These assets are repository/storefront content and are excluded from the runtime tgz by package.json's files allowlist.
