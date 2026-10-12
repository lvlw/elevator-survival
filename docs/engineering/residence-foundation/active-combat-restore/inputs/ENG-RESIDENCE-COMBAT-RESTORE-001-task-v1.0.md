# ENG-RESIDENCE-COMBAT-RESTORE-001（E02-R）完整工程任务书 v1.0

## 0. 本批一次交付什么

把已审E02-P的真实`CombatValue`做成严格、独立的v4字符串与冻结候选，覆盖首次中枢、稳定世界、活战斗玩家决策点、生还中枢、最终死亡；用真实P结果验证往返后继续行动完全一致，拒绝错误场次、错误历史及旧格式。

**不写玩家存储、不安装current、不重放玩法，不执行E02-S。** 本任务为完整长任务，W1—W4内部由Codex自主设计、实现、自查修订，不要求Owner逐字段／逐文件／逐测试转发。

- 仓库：`lvlw/elevator-survival`。
- 起始SHA：`9ada1bd76c768b7bcff676b263e4533854064909`。
- 父SHA：`8512c991adb353775ffa4785599a011e419a81fa`；tree：`8a0c09f43fb3be66a2ff07cf64b928aa6e1a7862`。
- 新分支：`feature/residence-combat-restore-001`。
- 前置结论：E02-P-R2专项PASS；F03关闭，F01/F02保持。
- 新任务允许该分支普通commit／push，完成立即停审，不合并或推main，不强推。

## 1. 读取、权限与真实开工基线

直接定位Owner附上的ZIP，在仓库外临时目录解压；核对同包5份文件，SHA256SUMS记录另4份的摘要。清单本体逐字节与原ZIP比较，不制造自引用hash。不要求Owner解压或手动搬入仓库。

重新实查HEAD、branch、status、普通与cached diff；错基线或非本任务改动必须停并指出，不reset覆盖，不在旧P／设计分支写入。由本任务新建指定R分支，不把旧会话推断当源码。

实际读取AGENTS.md及其要求的正式背景文件；定点完整读取：

- `docs/05-design-decisions.md`中当前有效DEC-049—052及覆盖关系；相关content原件。
- `docs/engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md`。
- `docs/engineering/residence-foundation/active-combat-core-contract-v1.0.md`。
- `docs/engineering/residence-foundation/active-combat-restore-contract-v1.0.md`。
- `docs/engineering/residence-foundation/active-combat-session-contract-v1.0.md`。
- `docs/engineering/residence-foundation/active-combat-batch-plan-v1.0.md`。
- `docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md`。
- 同包R2复审报告；实际core/residence-combat、供给／身份／终局、旧v1/v2/v3编解码及历史校验。

本轮已知长链默认并发可能超时，可直接在命令级设置`VITEST_MAX_WORKERS=2`执行完整`npm run test:run`建立新基线。PowerShell用等价环境设置，结束恢复原值；不可改超时、过滤全量测试、依赖、Vite／package或CI。旧超时保留为历史，不以新成功追改。历史3819不替代本轮实跑。

## 2. 精确路径白名单：最多35条

以下是最大许可集合，不要求全部创建。除第12条可选旧helper窄抽取外，生产实现只在新增v4路径；全部基线测试和helper只读。四个共享文档仅末尾追加，原字节前缀不变。

1. `src/state/residence-save/combat-types.ts`
2. `src/state/residence-save/combat-schema.ts`
3. `src/state/residence-save/combat-policy.ts`
4. `src/state/residence-save/combat-validation.ts`
5. `src/state/residence-save/combat-expected.ts`
6. `src/state/residence-save/combat-history.ts`
7. `src/state/residence-save/combat-body-history.ts`
8. `src/state/residence-save/combat-codec.ts`
9. `src/state/residence-save/combat-index.ts`
10. `src/state/residence-save/combat-controlled.ts`
11. `src/state/residence-save/shared-supply-history.ts`
12. `src/state/residence-save/supply-history.ts`
13. `src/state/residence-save/combat-test-fixtures.ts`
14. `src/state/residence-save/combat-aggregate.test.ts`
15. `src/state/residence-save/combat-expected.test.ts`
16. `src/state/residence-save/combat-history.test.ts`
17. `src/state/residence-save/combat-roundtrip.test.ts`
18. `src/state/residence-save/combat-continuation.test.ts`
19. `src/state/residence-save/combat-compatibility.test.ts`
20. `src/state/residence-save/combat-purity.test.ts`
21. `src/state/residence-save/combat-review-regression.test.ts`
22. `src/state/residence-save/combat-history-sharing.test.ts`
23. `docs/03-architecture.md`
24. `docs/08-rule-implementation-traceability.md`
25. `docs/design-drafts/world-infected-001/01-world-overview.md`
26. `docs/design-drafts/world-infected-001/10-decision-queue.md`
27. `docs/engineering/residence-foundation/active-combat-restore/implementation-notes.md`
28. `docs/engineering/residence-foundation/active-combat-restore/contract-and-support.md`
29. `docs/engineering/residence-foundation/active-combat-restore/completion.md`
30. `docs/engineering/residence-foundation/active-combat-restore/verification-results.json`
31. `docs/engineering/residence-foundation/active-combat-restore/inputs/ENG-RESIDENCE-COMBAT-RESTORE-001-task-v1.0.md`
32. `docs/engineering/residence-foundation/active-combat-restore/inputs/OWNER-authority-and-scope-E02-R-v1.0.md`
33. `docs/engineering/residence-foundation/active-combat-restore/inputs/AUD-9ada1bd-ENG-RESIDENCE-COMBAT-CORE-001-R2-review-v1.0.md`
34. `docs/engineering/residence-foundation/active-combat-restore/inputs/BASELINE-AND-INPUTS.json`
35. `docs/engineering/residence-foundation/active-combat-restore/inputs/SHA256SUMS.txt`

### 唯一旧生产helper例外

`src/state/residence-save/supply-history.ts`目前接收旧SupplyValue，其四种receipt来源和G1历史断言不能直接接收combat-death。若需要共享，可将**不依赖格式、且语义不变的公共历史约束**移入新增`shared-supply-history.ts`，旧导出继续以原参数／返回／错误类别执行原四来源限制，v4显式使用新的来源分支。

不能移除旧四来源校验、将combat-death谎称supply-death、删receipt、改steps、把新值强转旧协议自证，或给旧reader开allowCombat/skipValidation开关。不得复制一套更松的来源／结算公式。若无需旧文件改动就可严格复用，应保持其字节；无论用哪种方案都须在详细设计说明复用及不变量映射。

这项许可不延伸到旧`codec.ts`、`terminal-*`、其余`supply-*`、index、schema、policy、expected、全部旧测试或`src/core/`。遇到其它必须改动的具体路径，保留现状并报告精确冲突；不临时改后还原来“过检查”。

## 3. W1：实际schema、policy与接口定稿并实现

### 3.1 唯一技术外壳

严格采用正式R01：

```ts
{ format: 'elevator-survival.residence-headless', formatVersion: 4, state }
```

外壳仅这3个键，未知键／格式／版本拒绝。state以本基线实际`CombatValue`和`residence-combat-pure-v1`为依据，不从设计Python状态候选或旧SupplyValue猜字段；不在外壳另堆metadata／expected，不复制第二身体、敌人、库存、来源或钱包。

P中的`context`、entry、decision、闭场／死亡证据均是待验证的历史记录，不是外部授权；不能仅因这些字段彼此相等便视为已获安装资格。

### 3.2 新入口与policy

采用独立`combat-index.ts`和`combat-controlled.ts`，不要挂到旧index或G4/E01默认消费者。具体TypeScript签名与导出名称在W1定稿，记录精确导出清单并测试，不用通配re-export造成泄漏。

建议接口角色：创建受控v4 policy、严格完整聚合、serialize、deserialize、same-progress候选恢复。policy绑定实际P的受控dependencies、规则／G1／终局／供给配置、内容和catalog范围、随机算法版本及角色／委托范围；所有标识使用当前真实值，不新增玩法参数。

对未知外部值先严格验证原形状、number/boolean、非空ID、数组/null和有限安全整数，再比较、复制、封顶或访问。拒绝NaN/Infinity/unsafe integer/多余字段/坏tag/缺独立锚。encode必须先验证领域值，不能先JSON.stringify把非法原值抹掉。无效输入产生明确领域错误；导入、类型和程序异常不能充当正确语义拒绝，不用全局吞异常掩盖内部bug。

读取／编解码不得修改或冻结调用方输入、expected、独立committed或依赖原对象；只冻结自己的校验结果／候选。decode／roundtrip不签发CombatAuthority／SupplyAuthority／CombatPlan，不安装current、不建立domain、不读写Storage、不通知玩法。

### 3.3 原则上不改变P

直接调用实际P完整`readCombatValue`及无版本公共校验，叠加R层格式、身份、历史与expected约束。必要历史一致性细化在本R白名单层实现；不能为编码方便放松F01/F02/F03或改P生产者。若真实P自身缺证据导致合同不可满足，报告最小缺口，不伪造见证或偷偷回写core。

## 4. W2：候选外expected、五类边界与历史联合约束

### 4.1 冷恢复expected

expected结构须显式严验，按phase与是否活battle区分：

- 共同：角色／规则／配置／内容与声明范围、phase、revision、cycle、missions、initial执行／选择等必要锚。
- first-hub：首次执行runId／seed／rulesVersion来自独立初始材料，反向核对全部初始来源；不得从候选origins提取后自证。
- 活战斗：实际battleId、entryRevision、from/to/edge、持续enemy、当前queue、intent/count/risk锚。绑定P真实字段，不借固定首场或默认节点。
- 最终关闭：最新关闭binding、outcome、source；combat-death另绑定实际battle及trace的完整性摘要或等价明确证据，不能省略死亡来源后以泛化dead放行。
- 同进度恢复：独立校验candidate与完整committed，两者全值比较；局部锚一致不允许替换物品、历史、旧关闭、敌人或余额。

cold API只接既有独立expected，不提供从candidate/text自动生成expected的便捷入口。未来S的provider不得接收候选文本。测试必须在把字符串交给新恢复API之前，基于独立真实生产／提交记录固定expected，并保留来源说明。

不要求永久另存每场完整身体或所有旧committed。hash仅用于完整性比对，不是签名、防离线重写或防回滚认证。候选和外部材料被一起伪造不在本接口证明范围，但它们的已知矛盾必须拒绝。

### 4.2 五类完整边界

1. first-hub。
2. 稳定active-world，含真实胜利／退却后的已扣费完成值。
3. 活战斗的第一玩家决策点和完整行动后的玩家决策点。
4. living-hub。
5. final dead，含真实combat-death与既有G1/P死亡来源。

活战斗须HP／敌HP均正、唯一site／enemy/pending/entry一致、已遇状态真实、currentCTB=playerNext<=enemyNext。临时防御已消费或到期。尚未初始化的活pending、尚有应结敌响应、逃跑准备、临时防御中间态、待扣费胜利、HP0活动态及私有death proposal均拒绝。不得靠清pending、删battle／trace或隐式多执行一步转成可存。

### 4.3 联合历史约束

完整复用P来源份额、拆合、消费、安装、交样、ItemState、任务关闭、钱包／处分与持续敌人事实。R另落实：

- actual entry执行、revision、from/to/edge、首次／再入、旧退出及持续count/risk关系。
- DecisionWitness正式命令时长、敌动作身份／间隔、蓄力延后、退却锁定、同点顺序及F01队列关系。
- F02 typed trace实际时点／请求量／防具防御次序、HP不足截零、真实快捷药耗、首绷历史、流血检查点和死亡短路。
- 每次闭场elapsed与一次扣E相符，不重复收据；首次、后继和再入不能互借锚。
- combat-death使用真实最近decision／entry，不把治疗写负伤害，不把HP0后风险补回，不借旧普通source豁免。
- 旧G1/P死亡的行动流血／周期流血实扣量、历史休整节点资格、Day6／Day7来源界限和有序步骤；不能因新增combat-death而丢弃此前E01-R-R1修复。
- H0正常生还返回仍允许真实steps=[]；空G1日结不等于跳过任务／实物／钱包关闭。
- 正常旧成功、交样、失败扣款、安装和来源历史，不被后继TEST执行中的战斗死亡倒改。
- 最新已完成战斗资源篡改仍拒绝；真实战后立即维修或其后死亡是新完成值，不能用旧decision资源误拒绝。旧历史不强绑最新身体／防具状态。

所有历史验证仅校核已记录证据与确定约束；不得调用CTB resolver/reducer、RNG、药物生产、G1或终局清算重算“正确历史”。

## 5. W3：原生往返、继续执行、反例、计数与负控

### 5.1 真实生产者与冷候选

五类边界均由真实P生产。覆盖三敌初入、行动、退却、再入、胜利及死亡；恢复前后结构等值、再编码字节稳定、输入不变，结果深冻结。初配不能手拼赠物；战斗不能清敌／写completed或手造闭场收据。

低HP／末次资源等边界可以明确标TEST初始化，但主要场次和终局必须由实际生产者产生。成功整链尽量复用已存在的真实三敌／任务安装／样本交付链，不把“危险已清除”替代本轮活战斗覆盖。

对继续执行做成两条独立测试分支：同一个真实完整停点，一支直接用真实P继续；另一支encode→decode，然后测试中的受控协调边界另外提供P所需authority再继续。两支使用相同正式命令与确定随机源，应得到相同完整领域结果／风险进度／来源和费用。

codec阶段监测与测试继续行动阶段分别清零并记录。继续行动是新的真实命令，不能把它算作解码重放；解码也不能偷偷代替调用方授予authority。

至少真实覆盖退却→立即维修→往返→再入、胜利→立即修外套→往返、维修致死／治疗后战斗死亡→往返，以及后继场次死亡。新R必须保住刚通过的F03。

### 5.2 成对反例

每类有合法对照，不能全部拒绝：错版本／profile／规则／配置／catalog／身份／执行／expected原值；错battleId／边／entryRevision；联动篡改队列时长、间隔和逃跑锁定；过期敌响应；伤害来源／时点／请求量；错风险／intent/count；旧场次借锚；重复胜退费用；药物／首绷／日额回滚；份额混拼、已消耗复活、错误安装／交样；旧关闭／钱包／archives／chronology矛盾；缺候选外expected。

将原F01三项、F02五项、F03相关原始资源篡改与合法即时维修，通过新aggregate、encode和decode实际入口验证。拒绝坏后态不能只在同进度全值比较中被兜住：格式／历史本身错误也须在相应冷decode层拒绝。

### 5.3 旧格式隔离

原生证明六个方向：v4拒绝v1、v2、v3；旧v1、v2、v3各自拒绝v4。旧三个schema／reader／codec／默认消费者及旧测试原字节保持。不得迁移、兜底重建、写空槽、改当前角色或自动启动下一任务。

若可选抽取supply-history公共断言，新增专门差分测试：针对旧来源合法及非法值，原旧接口仍给相同合法值／错误类别；旧供给死亡F01及旧107+22组相关回归不能弱化。新combat-death分支只存在新格式的调用路径，不通过公共布尔开关影响旧reader。

### 5.4 零玩法调用

夹具构造完后独立清零，分别观察aggregate／serialize／deserialize／same-progress restore的合法和拒绝分支。监测实际存在的G1行动／周期、G2移动／转移、P生产者／初配／用药／维护／实例与来源、CTB求值／计划／归约、随机draw、activate／terminate／死亡消费、Storage读写与通知。

存储／通知本批未接线，监测只能说明未调用，不能写成真实保存故障或重入通过。纯验证辅助调用不叫玩法重放。异常拒绝不得修改输入、expected或independentCommitted。

### 5.5 至少两类仓库外语义负控

独立复制源后：

- 撤销某个候选外身份／实际battle锚核对，对应篡改必须被误接受并导致测试业务断言失败；避免其余兜底遮蔽负控。
- 撤销某个v4历史联合约束或退却费用唯一性约束，对应坏记录必须被检出为语义失守。

保留正常源码通过结果；不在生产内放测试开关。类型／导入／fixture／缓存权限错误不是成功负控；负控无效就补合适见证，不改坏正常规则凑数量。以前P/R1/R2的负控未重跑如实写NOT RE-RUN，不累加。

## 6. W4：完整回归、归档及交付

实跑新R全部定向用例、P原102+R1 58+R2 38的回归，以及受影响旧供给／终局／身份／v1-v3恢复／session回归；最终按实际package执行完整`npm run check`，命令级2 workers允许，不改默认超时／配置。

四份共享文档只追加E02-R作者状态，不追改P历史。新四份工程记录给实际TypeScript结构／导出、来源与不变量所有权、验收映射、失败修订及边界。即使实现方便也不能宣称浏览器已可读档。

将同包5件输入原字节归档到`docs/engineering/residence-foundation/active-combat-restore/inputs/`，原P/R1/R2输入全部只读。逐值核对原批准配置／内容未变，旧v1/v2/v3格式保持；核查35条路径、旧测试及受保护Git对象、相对链接／锚点、UTF-8、源／暂存／最终commit字节。

普通／cached／起点到最终增量`git diff --check`须exit0。W01累计对照`8c19ca0d28058cf743b41c8547cc2629c8eac767`保留真实exit2，仅原E01-R任务书7—9行与旧审查报告3—6行七处硬换行；新包／新文件不在例外中，不改旧原件或whitespace设置。

## 7. 十二组验收映射

| 组 | 最低真实证据 |
| --- | --- |
| R01 | 实际P schema、三键v4外壳、受控版本配置／内容／随机绑定 |
| R02 | first-hub独立execution，完整初配／选择不重发 |
| R03 | 五类边界及尚未完成的pending／drain／escape／HP0拒绝 |
| R04 | 三敌真实初入／完整行动往返、同点／计数／风险锚 |
| R05 | 退却／胜利／再入／立即维护后的往返与真实接续等值 |
| R06 | 实际场次typed死亡、后继场死亡及原G1/P死亡/H0规则 |
| R07 | F01/F02/F03冷入口与同进度回归、最新资源与历史区别 |
| R08 | 来源／消费／安装／交样／日额／首绷／钱包／旧历史 |
| R09 | expected自身严格校验、完整independentCommitted全值比较 |
| R10 | 旧1/2/3与4六向拒绝；可选旧helper抽取语义不变 |
| R11 | 零规则／IO调用、输入不变、冻结结果与两类有效语义负控 |
| R12 | 真实基线／全量check、旧测试保护、原件／路径／W01／Git |

## 8. 最终报告、Git及停止点

允许普通commit与仅`HEAD:feature/residence-combat-restore-001`的push；网络失败可普通重试。不得改写旧提交／rebase／merge／force，不推main、P、设计或其他旧分支。

报告起始／父／最终完整SHA与tree、分支与commit message、修改文件、真实起始测试及worker方式、新增／替换／删除／净增、R01—R12实际API与测试定位、五类往返／继续执行、六向拒绝、独立expected来源、调用计数、负控、所有实际失败修订、最终check、原件与范围、W01和CI实际状态。远端未完成写UNCONFIRMED或in_progress，不能称PASS。

完成后停止，等待当前WebGPT主线准确SHA的**v4恢复接缝实审**。任务内长链不等于可自动启动E02-S；current、实际写存储／浏览器／多标签、玩家入口／UI、E03、O3、商城／身体服务、第二真实委托均范围外。
