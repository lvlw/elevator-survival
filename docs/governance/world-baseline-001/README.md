# GOV-WORLD-BASELINE-001 当前入口

适用时点：2026-10-31。工程基线为 `a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0`，tree 为 `1f75162b22bcf486796b6c02bc57b3ec38e6616a`。本目录是治理导航与作者自查，等待主线对最终提交准确 SHA 实审，不是新增规则、正式视觉采用或发布批准。

| 要查的事实 | 当前入口 |
| --- | --- |
| 三个版本面、批准子集、真实实现、后续顺序 | [current-state.md](current-state.md) |
| 全部原远端 tip、祖先关系、距离、本地无上游项 | [branch-register.json](branch-register.json) / [分支说明](branch-guide.md) |
| 五份 Owner 批准、技术采纳、23阶段审查与缺口 | [review-evidence-index.json](review-evidence-index.json) / [证据说明](evidence-guide.md) |
| 当前未关闭门槛及责任 | [open-gates.md](open-gates.md) |
| 实际依赖树和审计服务失败 | [dependency-audit.md](dependency-audit.md) / [JSON](dependency-audit.json) |
| 64栅格、17注册SVG、5代码组件、15阶段槽 | [asset-status.json](asset-status.json) / [资产说明](asset-guide.md) |
| 本轮默认检查、治理检查、对象保全 | [verification-results.json](verification-results.json) |
| 来源路径与摘要 | [source-index.json](source-index.json) |
| 范围、自查与交接 | [completion.md](completion.md) |

原任务包保留在 [inputs/](inputs/README-FIRST.md)，包括原字节的 [A 主线审查 MD](inputs/inputs/AUD-a7f0f153-PRESENTATION-PREP-001-v1.0.md)。未收到它所提的 evidence ZIP，不声称已校验。任务包是执行范围与历史输入；本轮直接用户请求授权治理分支工作，包内转述不冒充 Owner 对每个技术细节的逐字批准。

固定检查点 `baseline/world-pre-b1-20261031` 已存在且保持 a7，只读使用。当前工作分支为 `chore/world-baseline-governance-001`。治理提交不会自动进入 `main`；准确最终 SHA、parent/tree 和推送回读见交付 ZIP 的外层回执，避免提交内自引用。轻量包依赖准确仓库基线，不能离线运行整站。

后续：先等主线治理实审，再由主线定稿并另发 B1。A 当前对手安全查询已获限定主线 PASS；B 仍是候选，C 未接入。不要重开身份工程、重复 A，也不要先铺 C。
