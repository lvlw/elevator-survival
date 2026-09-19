# 小型完整世界设计资料入口

> 文档归档阶段：Owner已确认部分规则；完整设计未冻结、完整世界未实现，纸面核算不等于生产验收。
> 本目录不是DEC。规则权威仍是 [设计决策记录](../../05-design-decisions.md)；[覆盖索引](../../07-decision-supersession-index.md)仅辅助定位。

## 推荐阅读顺序

先读正式 DEC-046（访问资格）、DEC-047（提前成功）、DEC-048（跨日重访），再读 [Owner确认来源](owner-confirmations.md) 与 [未决项](pending-items.md)。进行内容设计时，以经济骨架v0.2、物流/通信具体遭遇、整局反例及跨日契约的先后修订关系为资料，不以某一旧稿单独替代最新规则。

## 原始附件归档

`archive/`保留原始字节及当时状态，不批量把Proposal改成Confirmed，不回写历史测试结论。名称不同的版本是历史材料，不是多个同名现行正式规则。

| 文件 | 当前用途与限制 |
|---|---|
| [初始交接](archive/world-economy-deadline-handoff_11cc705.md) | 历史工程与讨论起点；不是最新规则或实现证明。 |
| [经济骨架v0.1](archive/small-world-economy-skeleton-v0.1-draft.md) | 历史候选；四次硬前置、旧终日过夜和部分预算已被后续修订。 |
| [经济骨架v0.2](archive/small-world-economy-skeleton-v0.2-draft.md) | 当前候选结构底稿；访问/早离方向已正式化；战斗成本须结合后续遭遇稿。 |
| [物流遭遇v0.1](archive/logistics-work-area-encounter-v0.1-draft.md) | 候选敌人与逐行动反例；包含现场核查后带齐补给、承担真实返程损失的方案。 |
| [通信遭遇v0.1](archive/communication-terminal-encounter-v0.1-draft.md) | 候选敌人与首次兼取材料的200时间见证；不是完整体验通过。 |
| [整局反例审查v0.1](archive/full-world-counterexample-review-v0.1.md) | 顺序、医院后置、准备组合、短探索和材料补救；保留当时跨日缺口停止记录。 |
| [跨日重访最小契约v0.1](archive/cross-day-revisit-minimum-contract-v0.1-draft.md) | 历史提案与条件性接续；确认范围以后续Owner记录/DEC-048为准。 |
| [跨日重访Owner确认](archive/cross-day-revisit-owner-confirmation-v0.1.md) | 接受生命周期与再接战50，分段突破保留实际试玩复审；不确认全部内容数值。 |

## 历史 Proposal 归档

[GOAL-7D-PREP-001 历史 Proposal 归档与提炼索引](legacy/goal-7d-prep-001/README.md)保留两份早期 Draft 的无损原件、来源清单和当前处置说明。它不替代本目录的 Owner 确认、DEC 或原始附件，也不把旧候选方案重新启用为现行工程制度。

## 证据与试玩

[核算包入口](evidence/README.md)保存4个原始ZIP及SHA-256清单，不接入生产或测试链。原报告中的通过、停止和敏感性结论维持原样；本次归档只校验文件完整性，不增加游戏测试或胜率证明。

[分段突破试玩复审](reviews/split-encounter-playtest-review.md)当前OPEN / NOT RUN。自动测试与独立纸面工具不能代替Owner体验。

## 工程与文档边界

本次资料核对锁定最后指定基线 `11cc705a9a923b367919cc9139de5097c006beb7`。新DEC并不表示该SHA已经实现这些规则；运行时仍使用其既有版本。

归档任务应把“设计已确认/内容候选/实现未完成/体验未验收”分开写入正式文档与追踪，不改医院一日历史冻结结果，不迁移旧存档，不自动升级未读的早期Codex提案。

Project Sources后续只替换实际修改的现行正式文件；历史过程材料保留在本仓库目录，不把所有旧稿同名并列上传为正式来源。
