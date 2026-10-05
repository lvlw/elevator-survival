# W1 — 已批数据、运行时来源与窄缺口

DEC-052优先，数据来自[唯一103键配置](../../../content/infected-world-entry-test-config-v0.1.json)和[限定内容](../../../content/infected-world-entry-content-v0.1.json)。本轮只读逐项绑定：103键、193数值叶及数组顺序保持，原两份34+4配置保持；候选源JSON不修改。本表是读取视图，不建立第二配置源。

## 三敌逐动作绑定

basic/special顺序对应content中数组下标0/1；固定循环basic→special→basic，已行动数与下一循环位置共同验证。伤型、风险、弱点读content；HP、first、damage、wait读同敌parameter key。

| 实例／节点 | HP | 首敌CTB | 两动作伤害 | 两动作CTB | 伤型 | 伤势风险 | 暴露风险 | 钝击弱点 |
|---|---|---|---|---|---|---|---|---|
| orderly / H4 | 14 | 70 | [3, 7] | [100, 140] | laceration/bite | high/very-high | none/high | true |
| porter / L2 | 16 | 150 | [6, 3] | [240, 100] | contusion/laceration | high/high | none/none | false |
| technician / C2 | 16 | 60 | [2, 5] | [110, 180] | contusion/bite | medium/high | none/medium | false |

受控静态声明已由`src/content/infected-world-v0.1/enemies.ts`生成，但actions仍以scratch/lunge-bite表示两槽。旧`createCombatEnemyActionPrimaryPlan`按这两个kind读取同一infectedOrderly表，旧transition只生成撕裂／咬伤。这不等于真实新敌实现，尤其装卸工首击挫伤及240CTB不能变成护工抓挠。

最小技术扩展：内容工厂生成按definitionId/actionId索引的readonly EnemyActionProfile（damage/ctb/woundKind/injuryTier/exposureTier/firstCtb/bluntWeakness）；旧医院适配器输出现有同值profile，新世界从已批两JSON对应运行时数据构造。通用调度按profile读效果；挫伤用`addMinorContusion`，开放伤用`addOpenWound`＋bleeding。无新技能、概率或敌种。

公开意图元数据也须随真实动作profile绑定：porter首击是慢重直接攻击，technician普通/特殊的伤型与暴露不同；不能沿用静态“basic=normal, special=slow”的旧标签冒充已验收信息。具体玩家呈现与非泄露验收归E03，原生diagnostic可先验证真实profile。

## 其他数据及继承边界

| 项 | 当前来源／值 | 新世界接线要求 |
|---|---|---|
| 身体/周期/日额 | 34项G1 runtime `infected-residence-core-v0.1/config.ts` | HP上限12、共享E及真正周期重置使用原G1，不复制夜间公式 |
| 终局 | 4项terminal runtime `infected-terminal-core-v0.1/config.ts` | 120/20等保持，战斗胜利不等于委托成功 |
| 武器 | 103配置 pipe.basic=4/100、signature=6/180，wear=1/3；capacity.pipe30 | 旧医院6耐久不移入；末次正耐久不足额截零继承DEC-036 |
| 外套及工具 | capacity.coat12/crow12/lamp8/toolbox6 | 初始发放与真实ItemState从P接续；不是probe的旧6/4 |
| 战中药 | bandage.hp1 / survival.hp2，bandage.ctb80 / painkiller.ctb80 | 首绷替换基础值而非相加，生命封顶；快捷位、目标和来源消费联合 |
| 退却 | normal80/overloaded110、伤口10封顶20、镇痛减10；reentry.player0/enemy50 | 新伤不追改已锁完成点；不用旧场景移动倍率修CTB |
| 退出E | combat.minimum6/ctb_step100/energy_step4 | 仅胜退一次，截零，不叠旧Scene Time10/100/10 |
| 现有CTB共通规则 | DEC-031/035/036；旧runtime `hospital-v0.1/rule-config.ts` | 防御80/50%，临时攻击2/140，风险0/20/40/60/80，外套减伤1／伤势降2／暴露降1／本击完整保护继承；不要复制整份医院运行配置及其感染终末/维护/初装 |
| 蓄力控制 | DEC-031明确基础140、对应弱点另60；content仅护工bluntWeakness=true | 旧实现固定200只适用于护工；按数据为另两敌140，不新增103键、不改批准参数；这是已批CTB规则与已批弱点数据的组合推导，须技术实审核对 |

两份旧runtime及103运行时均只读；E02-P可增加唯一适配profile，但不把医院名称和旧场景费用强行装入新数据。既有34/4/103配置已在content受控工厂使用，本批未注册任何新rulesVersion或保存版本。

## 配置与来源保护摘要

- `docs/content/infected-residence-core-test-config-v0.1.json`：SHA-256 `377aa63f5fc0d1110cfb056d6252d6f3ef35705d250512fbae679274d5a4e1c9`。
- `docs/content/infected-terminal-core-test-config-v0.1.json`：SHA-256 `a42a0689a32f8ed88b9ac025a0da1800dda01d51e0f5a285ce5383198e212c18`。
- `docs/content/infected-world-entry-test-config-v0.1.json`：SHA-256 `15624fee92e615e1d4ffcec39d071057b10a8de6ce16408cca0ffb4e94f5d8e6`。
- `docs/content/infected-world-entry-content-v0.1.json`：SHA-256 `05dabf10796ee027ea31037641ae91b95fc9346b9b98f032f1b7c99dada88925`。
- `docs/design-drafts/world-infected-001/entry-004/parameter-candidate.json`：SHA-256 `4cea3a0584d12562afb3fb8dacaf766e3e8a757faf78856c1e2501ff772a11e5`。
- `docs/design-drafts/world-infected-001/entry-004/content-candidate.json`：SHA-256 `6bdf46b42035bf3cd8ce71772a9c00e97cb2ffdd09ba27393e3928763bb722b7`。

不新增H2固定消毒剂、粮食、敌掉落或任务。无初粮、工具箱电子与安装竞争、酒店可绕、三专长九组合仍按批准内容。TEST低HP/E、旧医院队列、有限trace、条件路线和旧重复供给都不是生产初态或通关保底。真实三敌适配及全路线仍为后续工程／体验门槛，无新平衡采纳项。
