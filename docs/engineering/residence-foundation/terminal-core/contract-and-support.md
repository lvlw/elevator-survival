# ENG-RESIDENCE-TERMINAL-001（A）实际接口与支持

作者工程记录，不是新规则、主线源码 PASS 或体验验收。正式依据为 [A 契约](../terminal-core-contract-v1.0.md)、[恢复合同](../terminal-restore-contract-v1.0.md)、[批次 Gate](../terminal-batch-plan-v1.0.md)与本目录 inputs 原件。

## 所有权与接口

- `src/core/residence-terminal/index.ts` 精确值导出：`TerminalError`、`queryTerminalEligibility`、`queryTerminalRewardCapacity`。只读资格是 `{deliver,withdraw,deadline}` 白名单，不带 seed、感染进展、现场或实例。
- `controlled.ts` 精确导出：`createTerminalConfig`、`createTerminalAuthority`、`planResidenceTerminal`、`consumeResidenceLocationDeath`、`assertTerminalPlanCurrent`。普通命令只能带 intent、LocationBinding 和 expectedRevision。
- `createTerminalAuthority` 由可信 composition 以当前完整值、独立 G2 authority 及精确配置／内容角色建立不可伪造的技术句柄；WeakMap 仅存完整前态指纹和依赖，不持有可变 current／奖励账。不能声称阻止可信调用者丢掉所有历史；未来 C 承担唯一 current 责任。
- `TerminalSnapshot` 唯一 character／balance／missions；当前 carried+site 对应 ItemState，旧仓独立实物容器；关闭后 site 进入不可访问 archive，不带身体副本。每个实例跨全部可用／不可用域唯一。
- `TerminalDisposition.source` 区分 `prior-effect` 与本次 `terminal`。既有安装／另交／消费／毁失保持不变；收据只引用本次新增处分。收据记录历史 before、reward、penalty、forfeited，不保存派生 after，当前余额唯一。
- `TerminalPlan` 一次包含全部后态；签发检查只验证旧态与技术来源，不安装、不编码、不保存。重复纯计算相同值不等于重复提交授权。

## 真实规则接缝

正常 H0 显式 deliver／withdraw 私下调用一次 G1。真实 `steps=[]`、body/cycle 不变、revision+1、return-due 来源精确；达标不可失败撤出，未达标不可成功。Day7 正常返回不补夜。

Day7 异地 stable、无 pending 才允许 deadline。调用前预检 revision、cycle 及既有 G1 日结算术容量；只检查安全整数，不产生身体结果。一次 G1 有序日结，生还 D+1 且旧 T=7，死亡不推进 D、不补 end-cycle。

G2 死亡入口先核对独立稳定旧边界，再对原生 LocationPlan 做签发／完整旧态验证；不信 clone 或 JSON 副本。之后验证原形状、真实步骤和非自有字段。动作只支持现有付费 move/reveal，允许 E1/cost8 正式截零；休整核对真实 A/C 节点及独立 authority，成本0，保留现场全部字段。真实到达死亡可以保留后态 combat-required；不据此启动 CTB。消费不重跑 G1/G2/RNG，直接承接原 revision。

`src/content/infected-terminal-core-v0.1/config.ts` 是唯一运行时四值生产者：120／0／2147483647／20，独立 configurationId。测试逐键对照批准 JSON；G1 configurationId、34值、rulesVersion 注册均未改。容量守卫已提供，实际 launch 接线留给 C。

成功需两目标和指定真实来源／定义／资源／执行的背包样本，不要求酒店访问。样本在地面、已另交、毁失或身份不符不授予成功。生还普通物及旧仓保留；样本交付／部分交付、专件交回、权限撤销保留真实实例资源。死亡清空当时可用余额／携带／旧仓，既成历史保全。

## T01—T12 API／测试映射

| 组 | 实际 API 与原生证据文件（`src/core/residence-terminal/`） |
| --- | --- |
| T01 | queryTerminalEligibility / planResidenceTerminal；terminal.test.ts：目标缺一、样本地面／假ID／错定义／未揭示、重伤完整成功；queries.test.ts 零副作用白名单 |
| T02 | planResidenceTerminal；terminal.test.ts P0/19/20/47 与错误 intent；history.test.ts 已另交样本不重复交付 |
| T03 | planResidenceTerminal deadline；terminal.test.ts 期限生还、血／感染／饥饿死亡；integration pending 拒绝 |
| T04 | planResidenceTerminal normal；terminal.test.ts Day1/7 成功／失败四例；step-semantics.test.ts 原 G1 结果故障组 |
| T05 | consumeResidenceLocationDeath；terminal.integration.test.ts 移动／随机揭示／E1末次行动／A-C休整／到达pending死亡；step-semantics.test.ts 签发拒绝与明确 post-proof 故障分组 |
| T06 | disposeTerminalAssets + complete validation；history.test.ts 原实例／耐久／电量／旧仓／先前处分／实际两声明成功及失败后来死亡 |
| T07 | authority/plan WeakMap；authority.test.ts 精确导出、完整前态篡改、clone、JSON、旧授权、独立 stable/rest 资格 |
| T08 | readTerminalSnapshot（内部联合校验，不是 B codec）；history/validation.test.ts 最新 body/trace、闭合来源、金额、处分引用与历史 |
| T09 | terminal.integration.test.ts 独立调用计数；step-semantics.test.ts 输入前0、坏结果已调用1、原 current／原提案不修改不冻结 |
| T10 | config/validation/step-semantics.test.ts 严格普通数据、数值、上限恰满、组合溢出、无隐式修正 |
| T11 | authority/queries/validation.test.ts 限定导出、未知命令拒绝与安全查询；不接 CTB/医疗/UI/Store/Save |
| T12 | content config.test.ts 逐键 oracle；原身份、G1/G2/G3/G4 定向与全 check；范围/原件/保护审计见 verification-results.json |

## 独立调用计数

实测断言位于 `terminal.integration.test.ts`，spy 观察真实函数，不替换正例结果。下表 `G2` 是 move/reveal/rest 对应生产者次数，`计划` 是 A 完整计划次数。IO 是对浏览器存储写调用的观测0加源码无IO接线，不宣称发生任何内存提交／持久化。

| 路径 | 阶段 | G1 cycle | G2 | 随机draw | terminateMission | A计划 | IO |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 正常返回 | A | 1 | 0 | 0 | 1 | 1 | 0 |
| 期限生还／死亡 | A | 1 | 0 | 0 | 1 | 1 | 0 |
| 移动死亡 | 已签发前 | 0 | 1 | 0 | 0 | 0 | 0 |
| 移动死亡 | A增量 | 0 | 0 | 0 | 1 | 1 | 0 |
| 随机揭示死亡 | 已签发前 | 0 | 1 | 1 | 0 | 0 | 0 |
| 随机揭示死亡 | A增量 | 0 | 0 | 0 | 1 | 1 | 0 |
| A/C休整死亡 | 已签发前 | 1 | 1 | 0 | 0 | 0 | 0 |
| A/C休整死亡 | A增量 | 0 | 0 | 0 | 1 | 1 | 0 |
| 非法 intent/绑定/revision | A | 0 | 0 | 0 | 0 | 0 | 0 |
| G1 故障结果 | A | 1 | 0 | 0 | 0 | 0 | 0 |

## 支持限制

B 字符串 codec／恢复安装、C 会话预编码／提交／写入／通知、原 G3/G4 改造、真实五图生产者、真实后继玩家委托、出发前衔接死亡、CTB／医疗／商店／专长、UI／浏览器／多标签／Owner试玩均未执行（NOT RUN），O3 未决定。测试的第二声明明确复用本试用终局政策，不泛化全部未来任务。测试 helper 提供未接入的任务内容初值与真实样本整实例迁移，不伪装 G2 普通拾取，不进入生产导出。

完整报告与实际检查见 [completion.md](completion.md)、[verification-results.json](verification-results.json)；修订轨迹见 [implementation-notes.md](implementation-notes.md)。
