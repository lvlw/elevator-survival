# WORLD-ENTRY-006｜集中 Owner 审阅页

状态：AUTHOR_DRAFT / 候选与隔离证据交付。不是 DEC、UIR、正式采纳或生产开工许可；不决定 O3。

## 已有通过与真正仍缺

输入[准确 SHA 实审](inputs/AUD-394f59d-ENG-WORLD-PLAYER-QUERY-001-review-v1.0.md)对 394f59d3c5df2a65ce87186e8988982d76784a71 的 headless 玩家查询／选择接缝限定 PASS。真实 P/R/S、23 项公开映射、opaque 选择、保存失败保内存已经存在；不是 UI、浏览器或 Owner 首玩 PASS。

真正缺的是：新世界当前感染公开映射；应用层完整 ready 刷新／就地结果合同；候选外恢复材料的浏览器落点；持久化和跨标签真实接线；低资产玩家入口及 Owner 试玩。当前通知订阅可能只收到 blocked，写端口只有 text，不能直接拼成完整 React Store 或浏览器启动器。

## 主推荐与两个真正待采纳项

### D1：是否增加当前病程负担的粗分档（新增玩家知识，DRAFT）

主推荐：采用[身体提示稿](02-public-condition-and-feedback-draft.md#d1)的四档当前病程负担，技术映射仅引用既有 `health.infection_damage` 的分段边界；不显示进度数、潜藏暴露数、未来扣血或死亡预测。最低档不叫“健康／未感染”。内部阈值已批准不代表公开已批准；这会揭示当前进度的大致区间，需 Owner 采纳并由后续任务正式落文，查询合同的对应 unknown 才能局部更新。

备选：首轮保留 unknown＋机制解释，不增加知识。代价是玩家对感染资源的取舍仍不充分，首玩不能宣称条件提示问题已经关闭；需要在首轮反馈中专门记录，不能永久搁置。

可复制采纳文本（仅供 Owner 选择，本文不代表已采纳）：

> 采纳 D1 当前病程负担四档候选。仅公开当前分档，不公开 infectionProgress、潜藏暴露计数或未来日结答案；最低档不代表未感染或安全。沿用现有结算参数，不改变 HP0 死亡制。请主线限定正式落文范围后再下发实现。

### D2：首玩入口范围（发布／兼容承诺，DRAFT）

主推荐：仅显式 DEV 感染世界入口＋独立新命名空间封闭试玩，不切换默认旧医院入口、不读写／清理旧槽、不批准永久双产品。首轮只支持通过真实独占检查的单标签环境；浏览器保存和刷新风险必须先验收。O3 留至公开发布前独立决定。

代价：Owner 要明确进入新入口；暂时不能替换公开默认产品；不支持环境应阻止进入而非降级为无锁多 writer。

可复制采纳文本：

> 采纳 D2 封闭首玩范围：显式 DEV 新世界入口、独立命名空间，旧医院入口／旧槽不变。真实启动、保存、刷新及单 writer 验收通过后才首玩；不据此决定 O3、自动迁移、清档或永久双入口。

没有要求 Owner 逐字段选择存储结构、组件、CSS 或函数；这些是有依据的技术推荐，详见[浏览器合同](04-browser-bootstrap-and-persistence.md)及[刷新合同](06-integration-ownership-and-error-flow.md)。

## 最近三批及停止点

1. [基础准备候选](contracts/01-preplay-foundation-contract-draft.md)：采纳范围内的安全提示／必要 metadata、就地结果与 ready 更新接缝。D1 未采纳则感染继续 unknown，不擅自公开。
2. [浏览器 owner 候选](contracts/02-browser-owner-contract-draft.md)：候选外启动材料、唯一持久化、失败和跨标签保护。涉及保存接缝，必须准确 SHA 专项实审后才能接 UI。
3. [低资产 UI 候选](contracts/03-low-asset-ui-contract-draft.md)：五停点、真实完整玩家链、浏览器恢复、Owner 首玩。不是一次不停审的大 Goal。

当前只交付候选，不自动归档为正式条款、不执行上述工程。首玩、分段突破、九组合体验、O3 仍 OPEN / NOT RUN。

## DOC-WORLD-ENTRY-006：Owner 审阅事项已局部采纳

Owner 直接批准 D1/D2 及限定顺序，主线技术定稿不冒称 Owner 对每一实现细节逐字决定。原 DRAFT 推荐保留为历史；同范围后继正式合同见链接。本轮仅落文，等待本轮准确 SHA 实审，未开工生产。

依据：[DEC-053](../../../05-design-decisions.md#dec-053)、[同范围后继正式合同](../../../engineering/world-integration/preplay/batch-plan-v1.0.md)。本轮文档与 T01 交付仍待准确 SHA 实审；批准／定稿不等于生产或体验验收。
