# 来源、实际核对与不确定项

日期：2026-11-03。

## 已读取的设计输入

两份随包inputs文件均来自当前会话的v0.2原件，保持原字节。v0.1故事主线Owner已确认；v0.2并非全部剧情或新增玩法一揽子批准。本包明确限定首段采用，未采用的中后段/长期条款保持原身份。

## 本轮直接读取的GitHub事实

固定SHA `5e4a38b1d32719f3f7478ecee824c8efae454b8c`，仓库 `lvlw/elevator-survival`。

| 位置 | 读取结论 / 本任务如何使用 |
|---|---|
| 远端refs/heads/feature/world-ui-v1-integration-001 | 本轮实时返回同一SHA；没有核验用户本地或服务器 |
| AGENTS.md | 技术栈、正式规则优先、UIR阅读、详细交付与禁止越界 |
| src/state/residence-session/player-types.ts（前轮v0.2已核对）及本轮player-queries.ts | 现有视图有地点/地图/目标/样本等，没有完整故事已读/工单正文权限；在可信适配层新增窄投影 |
| src/state/residence-session/player-inputs.ts | 工具候选已经换成当前opaque selector，便捷输入可基于此，不必由UI查内部实体 |
| src/core/residence-supply/player-inputs.ts | source/task工具方法只需要item时已给公开候选；输入形状不是最终资格，仍走原preview |
| src/state/residence-session/player-facade.ts | 先解析真实命令、原owner.dispatch，再query；可以在可信边界增加有限已提交结果，不重执行 |
| src/state/residence-session/combat-types.ts | dispatch返回CombatSessionCommit及精确current，可绑定真实同笔资源差额 |
| src/app/infected-preplay/controller.ts、types.ts | 原execute/confirm、draft/scope、安全确认与单次adopt；新叙事返回不能放进异步通知结算 |
| src/app/infected-browser/types.ts、schema.ts | 已有BrowserOwner与独占能力；reservation/checkpoint是严格原格式，不在本批改写 |
| src/ui/infected-world/app.tsx | 现有有字段输入即进入ActionForm（除普通first-fit）；存在唯一工具精简的实际接缝 |
| src/ui/infected-world/components/action-information.tsx | 每个动作附常驻ⓘ，支持F1；本批改短hover/focus并保留主动详情 |
| src/ui/infected-world/components/item-inspection.tsx | 真实物品详情与selector失效保护存在，短用途可在此体系加，不改真实对象 |

上列是本轮任务制定依据，不是对全部仓库的新审计，也不是新执行了5041项测试。前一轮R1的PASS和CI185为历史已审证据；作者开工必须实跑。

## 推荐配置依据

沿用此前工程使用建议GPT-6.1 Sol / high / Standard。官方当前推理/部署说明支持high并区分mode与effort：
https://developers.openai.com/api/docs/guides/deployment-checklist
https://developers.openai.com/api/docs/guides/reasoning

这不证明Owner账户实际档位；实际模型无法核验就记录UNCONFIRMED。无需为本批购买新服务或开启加速档。

## 仍不声明已知

服务器实际版本与可达性、本地未提交变化、Owner账号的当前模型菜单、首段剧情真实游玩时长、代入感、完整浏览器兼容均未由本轮验证。
