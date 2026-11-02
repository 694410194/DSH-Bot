# S0–S2：群聊原生统计

用户已批准[方案](../docs/design/group-usage-statistics-proposal.md)，跟踪 [Issue #23](https://github.com/MJ-CJM/DSH-Bot/issues/23)。
基线 main `bad056b`，分支 `feature/group-usage-statistics`。

- [x] S0：rc.2 / rc.5 原生 dock、projection、子会话绑定、只读与释放验证。
- [x] S1：成员统计、上下文估算与缺失状态，按唯一 child 去重。
- [x] S2：问题级底栏、范围切换、明细、语言/主题/宽度矩阵与完整检查。

S0 公开 projection 路径通过，独立 dock 组合不支持，采用已批准的 fallback（不导入内部 pill）。见 [验收记录](../docs/verification/group-statistics/README.md)。

未知指标不按零显示，不改调度，不使用私有 UI import，不在正式桌面运行。
