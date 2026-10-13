# E02-R-R1 准确 SHA 专项复审 v1.0

日期：2026-10-13。
结论：**PASS。R-F01 关闭；允许由主线下发 E02-S 独立工程任务，不自动跨入 E03。**

## 1. 精确基线

- 仓库：`lvlw/elevator-survival`。
- 受审提交：`29a018a2ad64f8d5cbe56257381568bf3527cd08`。
- 父提交：`55fbf0f48e6a76bea3030bd77354528816581776`。
- Tree：`b7abd390b7a94d3367a79876588e87c1850feeac`。
- 远端分支：`feature/residence-combat-restore-001`，本轮重新查询时指向受审提交。
- Commit：`fix(state): preserve simultaneous combat death restore`。

提交及父／tree、远端当前引用、实际差异由主线连接 GitHub 核对。Owner 本地 HEAD、status 和其他本地分支仍是作者报告，不冒称主线读取了 E: 磁盘。

## 2. 结论和玩家含义

真实攻击击杀敌人后，同一次动作流血使玩家 HP0，仍然是玩家死亡：不复活、不改判胜利、不产生生还胜退费或任务奖励。R1 保留 P 的真实 final dead 与已发生的击杀事实，修复了 v4 错误要求此时仍有活 pending 的问题。

`combat-body-history.ts` 的新条件不是全局放行 `none`。它先确认完整最终死亡、收据／entry 绑定、归档位置、同一敌实例及其生命和 defeated 与实际 decision 一致，然后分两支：

1. 敌已被本次攻击击杀：攻击命令为已有三类攻击之一、原敌 HP 正、末次身体步骤为动作流血，归档必须是 `none`。
2. 敌仍活：归档必须保留该敌的 `combat-required`。

完整 P 校验先于本函数执行；本函数不替代 P 的全部 schema、队列、伤害来源、真实消费或权限校验。R1 也未改变 codec、独立 expected、同进度全值比较或动作签发能力。

## 3. 实际源码和测试阅读

完整阅读本批唯一生产改动、两个新测试文件及新 TEST helper，并对比准确提交差异与上一版原件：

- `src/state/residence-save/combat-body-history.ts`，blob `43ccddccd3b08a639f94983df3ccc928677891d1`。
- `combat-review-simultaneous-death.test.ts`：原模板12项及相邻23项。
- `combat-review-simultaneous-purity.test.ts`：9项独立计数。
- `combat-review-simultaneous-fixtures.ts`：入场前明确 TEST 身体边界，实际初配、移动、CTB和终局生产；不是伪造敌死亡或制造胜利收据。

本批差异仅上述四份源码／测试、工程记录／共享文档附记和14份输入归档；可选 `combat-history.ts` 未改。P、旧 CTB、G1/G2、格式、policy、expected、旧169项及更早测试不在本批变更列表。

原生测试真实覆盖普通／蓄力击杀后死亡、再入场、后继 C2 敌人死亡、敌仍活的直接伤害／动作流血／治疗后死亡、原HP多1的生还胜利，以及错误 pending、实例、trace、处分、收据和金额。独立 expected 在候选复制／编码之前从真实生产记录固定；same-progress 仍比较完整独立 committed，而不是只比较局部死亡锚。

额外核对既有 P 的 effects／settlement、当前受控动作返回路径、domain 与已正式归档的 E02-S 合同，用于判定后续接线边界；没有把它们视为本批新实现。

## 4. 主线实际执行——隔离检查，不是原生 codec

在主线容器重建并核对 Git blob，执行完整原样的：

- `combat-body-history.ts`：修前／修后各一份。
- P `effects.ts`。
- P `supply-settlement-shared.ts`。

外围解析、CTB结果、来源消费、状态原语和生命周期等采用明确适配器；输入为裁剪的 TEST 记录。该执行验证组合后的归档与死亡校验分流，不证明完整 P 可达性、原生 v4 或存储正确性。

| 本轮同一37项隔离集 | 符合 | 不符 | 程序异常 | 输入保持 |
| --- | ---: | ---: | ---: | --- |
| 修前原样 helper | 20 | 17 | 0 | 是 |
| 修后准确 helper | 37 | 0 | 0 | 是 |
| 外部负控：击杀后仍强制活pending | 31 | 6 | 0 | 是 |
| 外部负控：删除活敌pending约束 | 35 | 2 | 0 | 是 |

修前17个不符**不是17个原生漏洞**：部分检查在完整系统由上游校验负责，只是此处直接 helper 的局部保护对照。也不是原审查17项的未经修改复跑。本轮使用新增必要字段的统一37项裁剪见证，保留脚本和完整结果，未宣称对应37条真实战斗路线。

范围包括两种敌终态、三类允许攻击、不同节点／场次、非首条归档索引、错误最终phase／身体／位置／实例／pending，及已知业务错误转换与程序异常透出。负控只改变仓库外副本，未改远端仓库、旧测试或生产开关。

## 5. 作者、CI与主线证据分开

作者报告及实际新增测试源码支持：

- 起始真实基线：213 files / 3988 tests。
- 原模板修前8 PASS / 4 FAIL；修后12/12。
- 新增44项（35＋9），替换0、删除0；最终215 files / 4032 tests。
- 命令级 `VITEST_MAX_WORKERS=2`；未改测试超时、配置或旧测试。
- 四个恢复接口、合法／拒绝、敌存活／死亡分支，每次36个观察入口和注入draw均零玩法调用。
- 实际末次攻击的CTB求值／计划／归约、死亡消费、终止和清算各1次；与codec计数分开。

主线重新查询 CI #154 / run `38399164095`，核对 head_sha 为本次受审SHA，状态 `completed/success`；job `115302021328` 的 architecture、typecheck、test:run、build 四阶段均 success。未重新下载完整日志计数，因此4032保持作者原生执行记录，不称为主线全量复跑。

主线尝试取得准确仓库ZIP，但容器对 `codeload.github.com` DNS失败（curl exit6）。因此本轮原生 npm、完整codec和浏览器均 **NOT RUN**；没有用隔离脚本代替这些证据。GitHub连接器读取正常，源码实审与CI核验未受此影响。

## 6. 原件指纹和范围

从本会话实际挂载原ZIP字节独立重算全部成员及递归Git tree：

| 输入目录 | 件数 | 重算与远端一致的tree |
| --- | ---: | --- |
| 原E02-R inputs | 5 | `d44810a59b585c5de3b89586fbf69aea78617be7` |
| 本R1 r1-inputs | 14 | `40418f7fecad4c335fee264e684216041402eaa5` |

两份SHA256SUMS分别4项、13项全部核对。总19件原字节及目录结构与准确提交一致。主线没有完整复跑作者的所有保护对象、链接、工作树或暂存区审计。

W01继续仅保留原E01-R task第7—9行及原E01-P review第3—6行的七处Markdown硬换行；本轮不扩大、不重写旧原件，不把累计exit2写成全部干净。R1增量exit0保持作者审计证据。

## 7. E02-S必须承接的门槛

- 开工从本次通过的准确SHA，另建工程分支，重新实跑测试；不是从旧P或main开始。
- 仅接显式v4会话；复用已有domain，与v1/v2/v3共享writer占用。
- 直接使用真实P组合。`resolveResidenceCombatAction` 已对死亡消费一次；`planCombatMove`及稳定动作也可能已返回完整终局。S不得照搬旧Supply逻辑再关闭一次，或因producer由combat/maintenance变terminal而拒绝合法死态。
- R-F01两种敌终态、P-F01/F02/F03、真实战后立即维修及维修致死，均须带到提交、写失败、retrySave和冷恢复。
- 唯一current提交前验真P计划、R完整验证并预编码；失败后只保存最新内存，不重播规则，不回读覆盖。
- 冷启动expected来自候选外既存材料；合法已签发P结果可在受控编排中生成本次提交的期望，不与冷候选自证混淆。
- 本批不包含实际浏览器存储、多标签、玩家入口、O3、E03路线平衡或体验验收。

**停止点：E02-R-R1 PASS，R-F01关闭。E02-S须使用另行下发的完整任务书，完成后再次准确SHA实审。**
