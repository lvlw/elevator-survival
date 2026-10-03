# G1 实现记录

状态：作者实现收口；实际执行结果见[验证记录](verification-results.json)，不替代主线准确 SHA 源码实审。起点 `9dfe21ef7f423c1e5d9801d26e4425b28444cf63`，分支 `feature/residence-energy-cycle-core-001`。

## 需求复述与设计（生产实现之前记录）

依据 [唯一 G1 契约](../energy-cycle-contract-v1.0.md) 与 DEC-050，实现受控注入的纯 TypeScript 局部计划。

- residence-config 校验形状、配置标识及安全整数；唯一可执行参数在 content 的 config.ts，测试逐项核对批准 JSON 的 34 数值叶及键集合。
- 身体只在 CharacterCycleState.body 持有：现有 condition 类型包含 HP、实际伤口、挫伤、流血、镇痛与暴露；其旁仅一份精力、感染进展、饱食、实际抑制和剩余额度。
- 独立 authority 提供身份、revision、角色周期、活动执行或最新关闭来源、稳定上下文及真实可接委托。请求不能提供 eligible、alreadyTriggered 或下一状态。
- 时钟分为 active、first-ready、return-due、deadline-ready。ready 携带期限执行与已结周期引用，消费时须与独立最新关闭事实一致。截止先产生待提交计划，不要求预先提交关闭。
- 精力动作验证前提和安全成本后才能调用受控效果提供者；产物绑定规范化命令、完整执行和 revision。已触发结果使用独立受控事实，E0 仍可产生身体后果。
- 精力模块复用周期模块的窄身体后果函数；行动流血仅结一次。免费查看、整理、已揭示物拾取、非战斗药食无额外行动流血。
- 周期固定流血→感染→饥饿→仅生还结束药效与重建额度→推进时钟／重设精力。死亡是合法结果；未执行段不改变。不回血、清伤、修物或补给。
- 所有计划只建议一次 revision 递增，无安装、保存、通知或关闭权；未来协调器将局部计划与任务／物品／经济组成一次完整提交。

## 状态矩阵与威胁边界

| 当前边界 | 请求 | 结果 |
| --- | --- | --- |
| active，稳定，T1—6 | A/C休整 | 生还D/T+1；死保留旧时钟，后段短路 |
| active，稳定，含T7 | 正常返回 | 身体/E/额度不变，return-due |
| active，稳定，T7 | 截止周期 | 生还D+1，无旧T8；ready计划须与期限关闭一起提交 |
| first-ready，D1 | 真实首次可接出发 | 不补昨日，消费首次ready |
| deadline-ready | 最新关闭来源匹配的不同委托出发 | 不重结，不清刚在中枢使用的药效／额度 |
| return-due | 真实不同委托出发 | 最新身体结周期；死不激活新执行，不改旧结果 |
| 无可接委托 | 查询／请求出发 | 查询no-content；请求拒绝，无身体或时钟后果 |

受控scope、配置和当前事实由未来组合层注入；不防御恶意替换整个协调器，不宣称全历史／离线防回滚。严格解析拒绝访问器、非普通对象、未知字段、无效数字、错版本／执行／revision。危险乘积与增量先校验再截零。

## 实际验收映射

以下测试名均为实际 Vitest 用例（参数化名称用标题模板），结果为本轮定向执行 PASS；最终全量与新增数量以 [verification-results.json](verification-results.json) 的实际执行为准。

| 组 | 实际 API | 文件／测试名称与见证 |
| --- | --- | --- |
| E01 | queryResidenceAction / planResidenceAction | residence-energy/energy.test.ts：`repeated queries are pure; E1/cost8 completes at E0 without debt or HP penalty`；冻结／可变输入、确定性、一次 provider |
| E02 | queryResidenceAction / planResidenceAction | energy.test.ts：`E0 free %s has only local energy eligibility and no action bleed`（五类）；`E0 new paid %s is rejected before provider`（七类） |
| E03 | planTriggeredResidenceConsequence / planResidenceAction | energy.test.ts：`E0 controlled %s still resolves and can kill`；energy-cycle.integration.test.ts：`each edge uses the public entry; final positive-energy edge completes, next edge cannot trigger effects` |
| E04 | createResidenceActionRequest / calculateResidenceActionCost / readCycleContext | energy.test.ts：`invalid paid base %s rejects BEFORE provider and clamp`、`unsafe/invalid cost %j rejects`、`multiplies all rational factors before a single ceiling`、`%s rejects without provider effects`；配置测试拒绝各类坏数字、表与假配置 |
| C01 | planCharacterCycle | cycle.test.ts：`old infection %i grows to %i and NEW progress determines HP %i`、`actual suppression/exposure: I%i exposures%i suppression%i -> I%i HP%i`；59→69、89→104、110→130、实际抑制110→115、暴露转换／增长截0 |
| C02 | planCharacterCycle | cycle.test.ts：`%s death short-circuits unexecuted stages and clock`（流血／感染／饥饿）；`deadline death creates neither new day nor ready/closure`；I120仍生还 |
| C03 | planCharacterCycle | cycle.test.ts：`rest E%i/%s resets to %i without healing/clearing real injuries`；integration 多边→立即结果→C休整保留实际伤口和外部装备见证 |
| C04 | createCycleRequest / planCharacterCycle | cycle.test.ts：`normal Day7 return at E0 never settles a night or resets resources`、`%s rejects without mutation`；Day7 rest、D/T、角色／执行／版本／revision、边界递增拒绝 |
| C05 | planCharacterCycle / readCycleContext | integration：`deadline -> current hub medication -> consume ready -> normal return -> next due settles exactly once`、`ready forgery %s rejects without mutation`；cycle：`deadline builds pending ready without demanding a precommitted closure; cannot consume it before closure` |
| C06 | queryCycleDeparture / planCharacterCycle | cycle：`first D1 consumes ready once without an imaginary previous day`；integration：`%s with no different commission never settles or consumes ready`、`future departure death preserves prior %s and does not activate the next mission` |
| R01 | 全部新增导出入口 | 五份真实 TS 测试使用独立固定期望；未读取旧 Python／expected；`current authority rejects replayed prior state even when the candidate remains internally consistent` 只证明局部受控修订边界 |
| R02 | 唯一配置／现有全量检查 | config.test.ts：`matches the exact approved recursive key set, identifier and 34 numeric leaves`；`npm run test:run` 开工基线与最终 `npm run check`；仓库外审计脚本核对依赖、原件、文档原前缀、白名单与保护对象 |

## 实际 API、数据与错误边界

- `createResidenceConfig(unknown, expectedConfigurationId)`：严格复制／冻结；配置句柄由受控组合层建立。WeakSet 只记录本工厂验证过的对象，不存玩法或历史；同名普通对象不能伪装句柄。不同合法参数仅隔离测试可注入，不开放热改或生产注册。
- `queryResidenceAction`：只判断局部能量开始资格，不执行 provider，不改变任何状态。`planResidenceAction` 完整验证自身前提后最多调用一次受控 provider，其 completion 必须准确绑定规范化命令、完整执行、identity、revision 和 E 前后；不返回可自授权 Effect。
- `planTriggeredResidenceConsequence`：独立受控 triggerId／执行／revision 与当前 unsettled 上下文匹配，E0 仍执行；不是玩家 `alreadyTriggered` 选项。上游须只提供尚未消费的实际事实；G1 不伪装全局去重账本。
- `planActionBodyConsequences` 是内部窄组合函数，不在 character-cycle 的公共 index 导出；只合成受控损血／暴露与有资格行动流血，不产生医疗或战斗命令。主要后果死亡则不重复行动流血；精力模块与周期模块不分别提交。
- `readCycleContext` 严格读取完整身体与独立 authority。`rest` 由上游内容／位置 owner 给出 A/C 或 null，请求不能把 C 提升为 A。scope、rulesVersion、最新生命周期和 departure 均不是由请求自行声明的世界资格。
- `planCharacterCycle` 返回 base、完整局部 snapshot、已执行 steps、alive/death、deathCause 及可选 requiresDeadlineClosure。后者是未来完整事务应核对的未提交关闭要求，不是“已关闭”的证据。
- 身体只有 condition 中一份 HP／伤口／挫伤／流血／暴露／镇痛；energy、infectionProgress、satiety、suppression、quotasRemaining 各一份。抑制与实际已耗 suppressant 额度一致；不凭空清伤或修理外部物品。
- 成本倍率分别检验正安全整数与分子／分母合成乘积，最终 BigInt 商余一次 ceiling。乘积已限制安全后，合法正分母不可能产生更大的不安全 ceiling；MAX_SAFE 的真实 ceiling 边界仍有测试。溢出不靠精力截零掩盖。
- 周期在任何效果前预检完整结构与感染乘积／增量、D／revision 递增；执行阶段合法死亡才短路。药效／额度只在生还 end-cycle 步骤更新。
- 错误为 `ResidenceError`：INVALID_INPUT、CONFIGURATION_MISMATCH、BINDING_MISMATCH、STALE_REVISION、INVALID_CONTEXT、ACTION_NOT_AVAILABLE、NO_AVAILABLE_COMMISSION、CHARACTER_DEAD、SAFE_INTEGER_OVERFLOW、PLAN_MISMATCH。无内容是查询结果，真实死亡是计划，不吞异常兜底身体。

## 逆向作者自查与修订

1. 重复周期／ready：对源执行的 seed/runId/委托/版本、旧D、最新普通返回、同委托、同runId、首次伪造和旧revision逐个反例。截止生成与消费分离；新任务的普通返回形成新due。发现休整类型应有独立内容资格后，补入 authority.rest，并新增 C→A／null 拒绝测试。
2. 非法数字／副作用：负数、布尔、分数、字符串、NaN、无穷、不安全整数、无效表、分子／分母乘积、感染加法、revision/D 溢出；坏值即使随后死亡或截零也先拒绝。补入感染总和溢出、实际抑制不一致、重复伤口与重复身体字段负例。
3. 范围／唯一来源：新 core 只读类型与纯依赖，参数只来自受控 content 句柄；旧 src 全部保护。五输入按原字节，四既有文档仅追加。无副Agent参与；作者自查不称主线独立审查。

第一次类型检查曾发现 CycleRequest 联合标签收窄问题，改为独立判别分支。第二次发现测试环境无 node:fs 类型及 readonly fixture 的赋值错误，改为测试专用 JSON import 与明确可变副本；未加依赖。随后 typecheck 与首轮138项、修订后145项定向回归通过。未通过修改既有测试期望或规则回避问题。

## 后续责任与停止点

上游完整规则 owner 验证位置、路线、目标、实例、容量与真实资源；统一协调器提供独立当前事实、核验所有子计划、只递增一次事务修订并原子安装。G1没有 Store、任务账、钱包、物品 owner、保存、订阅或恢复安装。测试中额外委托及药效状态是隔离合法夹具，不是第二生产内容或新药物效果。

G2/G3、真实浏览器／保存／Owner试玩均未运行，未注册新玩家入口。准确 SHA 源码实审是当前下一门槛，不自动启动任何后续工程。
