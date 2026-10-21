# 基线、权威与未关闭 Gate

状态：AUTHOR_DRAFT；不覆盖正式合同或历史记录。

起始 SHA `394f59d3c5df2a65ce87186e8988982d76784a71`，父 `8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3`，tree `0431a7f73abe7ce99c070887f6872489007175f0`。实际原分支 world-player-query；HEAD 匹配、普通／cached diff 与 untracked 均为空，创建 `feature/design-world-entry-006`。22 个既有远端头通过 GitHub 只读 API 核对；Git schannel 两次握手失败如实保留，不改 TLS 验证。

## 来源与时态

- [DEC](../../../05-design-decisions.md)：013／025／026／045 为相关旧规则，049—052 对当前新连续驻留的局部覆盖优先。新世界 HP0 实际死亡，正常 H0 无附加夜，Day7 异地稳定截止先结后生还召回，生还无内容不等于死亡。
- [GDD](../../../01-game-design-v0.1.md)、[VS](../../../02-vertical-slice.md)、[Architecture](../../../03-architecture.md)：医院一日历史含义不倒改，后续附记按各自时点读取。
- [UI 当前约定](../../../09-ui-design-record.md)：Stage-First、010—012／015、同源安全信息、分级确认；不把医院 Scene Time、旧感染终末或旧终局按钮直接搬到新世界。
- [查询主合同](../../../engineering/world-integration/player-query/player-query-contract-v1.0.md)、[字段合同](../../../engineering/world-integration/player-query/player-query-field-contract-v1.0.json)、[工程责任](../../../engineering/world-integration/player-query/player-query-engineering-contract-v1.0.md)保持原字节。
- [已有首玩 Gate](../../../engineering/world-integration/route-acceptance/first-play-and-release-gates.md)和[本包实审](inputs/AUD-394f59d-ENG-WORLD-PLAYER-QUERY-001-review-v1.0.md)不把作者全量、主线隔离及浏览器验证混称。

历史作者本地 252/4369、CI160 success 是输入证据，不是本轮新测试基线。本轮只实际执行仓库外 native 探针和文档／架构检查，完整 npm check、typecheck/build、72 样本、UI／浏览器／Owner 均 NOT RUN。

## 开放项与责任

| Gate | 当前事实 | 后继责任 |
| --- | --- | --- |
| 当前感染提示 | facade 明确 unknown | D1 采纳及正式映射；否则保留未知与机制说明 |
| 实际执行公开结果 | 现有 PlayerExecution 只有 kind/view/preview | 必要时补受控安全差异，不从 raw commit 取隐藏结果 |
| 完整 UI 刷新 | 原生通知可 blocked；query 每次构造新 DTO | 应用命令边界发布稳定 ready 缓存，不增加 S 通知 |
| 冷启动 | v4 需要完整候选外 expected | 真实启动材料＋受控 checkpoint handoff，不从 payload 反推 |
| 多标签 | domain 仅同进程 WeakSet | 真实浏览器独占与拒绝／释放验证 |
| 界面／素材 | 旧医院 Shell 与资产存在 | 只复用可替换结构和合法绑定，五图低资产占位 |
| 体验／发布 | Owner 首玩、分段、O3 未关闭 | 真实玩家信息下试玩；公开前独立发布决定 |

本轮无规则冲突。D1 新知识和 D2 兼容范围隔离为 DRAFT；不借设计稿修改正式知识或生产接口。
