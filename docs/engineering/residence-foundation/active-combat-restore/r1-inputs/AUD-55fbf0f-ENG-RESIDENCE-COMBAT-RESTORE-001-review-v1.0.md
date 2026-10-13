# E02-R 准确 SHA 恢复接缝实审 v1.0

日期：2026-10-13。
结论：**NEEDS REVISION，暂不进入 E02-S。** 一项限定问题 R-F01：攻击击杀敌人后，同一动作流血使玩家 HP 归零的合法死亡，可能被 v4 死亡归档校验拒绝。

## 1. 精确对象与证据分层

- 受审提交：`55fbf0f48e6a76bea3030bd77354528816581776`。
- 父提交：`9ada1bd76c768b7bcff676b263e4533854064909`。
- Tree：`94b8f203cb97957ddb3ede1598b5e4938f81a7d9`。
- 远端 `feature/residence-combat-restore-001` 指向受审 SHA；Git commit API 已核对父及 tree。用户本地工作区仍以作者报告为准。
- 作者交付：35 文件，5 修改／30 新增；新增 169 测试、原测试零删改；起始 204 files／3819，最终 213 files／3988，命令级两 workers。主线读取了准确提交的完成记录与变更，不把它作为主线原生执行。
- 主线独立核验 CI #153，run `38288642915`，job `114943016589`：准确 head SHA、completed/success，架构／typecheck／test／build 阶段全部 success。本轮未下载完整 job 日志，3988 的数字仍以作者记录为来源。
- 原任务包 5 件原始输入：由本会话实际 ZIP 字节重算 Git tree `d44810a59b585c5de3b89586fbf69aea78617be7`，与受审提交中 `active-combat-restore/inputs` 的完整 tree 一致。

## 2. 读取范围与成立的部分

主线完整阅读本轮 12 份生产实现：combat-types/schema/policy/validation/expected/history/body-history/codec/index/controlled、shared-supply-history 及旧 supply-history 包装；9 份新增测试和 combat-test-fixtures；并定点阅读 P 的 effects、terminal、validation、test-fixtures、共享清算，以及实际 CTB 计划／归约和正式时序合同。

此次未发现以下责任需要推翻：三键 v4 外壳；受控 policy；候选外 initial execution 与选择、活 battle／最新 closure 锚；同进度分别验证两个完整值后比较；旧 v1/v2/v3 六向拒绝；旧四来源包装；旧 G1/P 流血与休整历史；F01/F02/F03 保护及立即维修接续。此表述不是对无限组合或离线历史真实性的证明。

## 3. R-F01：合法双方 HP0 死亡，被误要求保留活 pending

### 正式规则

`docs/engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md` L02 明确：主要效果先执行，再结该动作流血；玩家 HP0 优先死亡，之后才判敌 HP0 胜利；同归零仍判玩家死亡。L03 明确死亡不收生还胜退费用。P05 还要求保存真实敌伤／击杀和实物消耗。

因此，不能为了保存死亡档而复活被杀的敌人，不能改成玩家胜利，也不能补回不存在的活战斗。

### 当前真实源码链

1. `src/core/combat/combat-transition-plan.ts` 先发敌伤效果，再发动作流血，玩家归零即返回 defeat；不会先发胜利。
2. `src/core/combat/combat-effect-reducer.ts` 在 enemy-health-lost 后，将敌 `defeated` 设为 `healthAfter === 0`；该事实不因玩家也死亡而抹除。
3. `src/core/residence-combat/effects.ts` 的 `composeCombatResolution` 在真实敌 defeated 时将 `site.pending` 写成 `{kind:'none'}`。
4. `src/core/residence-terminal/supply-settlement-shared.ts` 将 `result.site` 原样存入 archive，没有把 pending 改回去；`consumeCombatDeath` 保留 typed 决策和真实死亡结果。
5. 新 `src/state/residence-save/combat-body-history.ts:36-37` 却对所有 combat-death 一律要求归档 `pending.kind === 'combat-required'` 且 enemyId 相同。

第5项与前四项在合法双方归零路径上冲突。问题是 R 的过强归档条件，不是战斗伤害公式错误。

### 修复要求

按已验证的实际本场决策、归档的同一敌人及终态分流：敌人仍活时保留对应 combat-required；敌已真实归零／defeated 时保留真实 none。两者都必须仍是 final dead、真实非空 typed trace、同 execution／battle／revision／位置和死亡收据。完整校验由真实 P 与 R 共同落实；不重复模拟动作，不删除所有 pending 校验，不改候选。

不得把当前 live battle 的 pending 规则一并放宽，不得删 trace、借其他敌人、把死亡改胜利、追加胜退费或发奖励。已有独立 expected 必须原样维持；不能从修补后的候选生成外部锚。

## 4. 主线独立执行：原样源码的限定隔离检查

已执行 `evidence/run-isolated-review.cjs`。三个文件均以完整 Git blob 指纹验证后原样 TypeScript 转译执行：

| 文件 | Git blob |
| --- | --- |
| combat-body-history.ts | ab278b056b5ecd6623e74a4c25cc61b0338fd315 |
| effects.ts | c36cf73bd235bf124881612fdb2264b0d12de856 |
| supply-settlement-shared.ts | 5944faf16f5b76afa983714660c5fe7a4a27adc6 |

最终17项：15符合、2误拒绝、0程序异常、输入不变。两个误拒绝是同一个 R-F01 的基础／蓄力命令形状见证，不是两个独立规则漏洞。敌仍活的死亡对照、缺收据／错绑定／错终态／错位置／丢失 live pending 等反例保持。

**执行边界：**输入是明确裁剪的 TEST 记录；已求值 CTB snapshot 被供给给原 compose；trace 生成、身份关闭、钱包、空物品集合等底层依赖使用显式适配器。没有执行完整 CTB resolver、P readCombatValue、v4 aggregate/encode/decode、真实来源 schema 或全量 npm。隔离验证确认原 compose→archive→死亡归档条件的冲突，不能冒充原生 codec 复现。

原生模板 `native-simultaneous-death.test.ts.template` 已按真实 fixture/API 编写并做转译语法检查，**原生 import/typecheck/runtime 为 NOT RUN**。首个返修工作包必须在完整仓库先运行模板；若 P 已拒绝或具体数值有差异，应报告真实最先失败点，不能篡改生产者来匹配主线预期。

环境：主线尝试 git clone 失败，退出128，github.com DNS无法解析；二进制下载工具未取得仓库。因此没有主线原生全量测试。第一次隔离运行的错误类适配器混淆了错误继承关系，额外产生1项适配器失败；仅修正适配器后得到最终17项结果。该诊断保留，不算源代码缺口或新增测试通过。

## 5. 下一步及范围

下发 `ENG-RESIDENCE-COMBAT-RESTORE-001-R1`，原 R 分支从本 SHA 继续。仅修 v4 死亡归档联合条件和相邻回归，不改 P、旧 CTB、G1/G2、来源／钱包规则、格式、schema、policy、expected 或旧 reader。

生还胜利、敌仍活死亡、双方归零死亡及其错误 pending／身份／trace 必须成对验证；三类入口和 same-progress 均覆盖；冻结／输入不变、零重放及至少两类语义负控保持。原169项及全部更早测试只读。

W01仍仅旧两份输入的七处硬换行；不是本次返修原因。新差异必须无告警；累计exit2如实保留。不能以CI成功或作者测试全绿覆盖本问题。E02-S、E03、current、存储、浏览器与Owner试玩继续未执行。
