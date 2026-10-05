# E01-S 显式 v3 会话契约与支持矩阵

状态：作者工程交付；准确 SHA 会话／保存故障实审待执行。不是新规则来源或浏览器接入声明。

## 入口与所有权

- 普通 `supply-index.ts` 运行时只导出 ResidenceSessionError；类型描述会话、命令与返回值，不提供构造能力。getState/queryKnowledge/subscribe 是只读方法；受控构造后取得的会话另有显式写入口。
- `supply-controlled.ts` 显式导出 createSupplySession 和复用的 createResidenceSessionDomain。
- 与原 v1/v2 共享未修改的 domain registry；九种同型／交叉组合均不能占用第二 writer。没有 release/replace/reset/install 后门。
- 组成验证在 claim 前；复制同步端口外壳而不冻结调用方对象。异步、生成器、getter、额外键、伪 policy/domain 拒绝。
- 唯一玩法状态是私有 current: SupplyValue|null。status、busy、保存结果和不可变初始 execution 锚不是另一份可变身体／库存。
- getState/subscribe 是受控 headless 诊断，不是普通玩家 ViewModel。queryKnowledge 直接消费 P query，不启动规则或随机；E03 玩家安全投影未接入。

## 首建与恢复

真实 read-null 和明确 first startup 同时成立才可 createFirst。首配 provider 只提供原 P 所需材料，先独立构造/校验 expected，再实际 establishSupplyInitial。九种工具×专长组合经过正式初配及出发。首配后不能重选或重新发物，depart 复用 P 的身份激活、G1 和 G2。

非空坏档、错格式、expected 缺失/异常/错版本，以及非字符串读取均不被当作无档。已观察到进度后再次 read-null 不恢复首次资格；合法但非首次的首配材料也锁住首次入口。真正读取异常可 retryRead，但 current 存在后一律禁止重新读旧档覆盖。

冷启动是**受控独立启动材料下的 headless 恢复**：零参数 provideColdExpectation 不接收存档字符串或解析对象；材料在候选交给新 owner 前已独立固定。R decode 验证后安装一次，0 写、0 玩法通知、0 规则重放。不新增 expected 持久化侧车，不声称完成浏览器自举或可信锚部署。

## 命令与原子边界

外层命名空间：depart、move、rest、source、task、task-transfer、inventory、medical、maintenance、terminal。command 只携带原意图和 expectedRevision；禁止 nextState/body/plan/authority 等结果。move 与 inventory.move 不混淆。

对应真实生产者依次为 planSupplyDeparture、planSupplyMove/Rest、planSupplySourceReveal、planSupplyTaskAction、planSupplyTaskTransfer、planSupplyInventory、planSupplyMedical、planSupplyMaintenance 和 planSupplyTerminal。维护保留 resourceResult/unusedPool。

唯一顺序：

1. 严格命令、当前阶段和 revision；
2. 以 current 及同一 policy dependencies 签发 authority，执行原 P producer；
3. assertSupplyPlanCurrent 验真完整前态、原计划和依赖；
4. 死亡行动只消费一次原始计划，再验真最终终局计划；
5. 已知前态、命令类别及验真计划生成 next expected；初始锚和历史前缀不变；
6. R 完整聚合验证与完整 serialize 预编码；
7. 一次 current 引用替换，一次 write 尝试，一批只读通知。

死亡不先提交 HP0 active，不额外增加 revision。terminal 计划不会二次死亡消费。合法 HP0 且现场 combat-required 仍先完成死亡；存活 combat-required 则由 R 拒绝整个安装，不清 pending 或删除敌人。这个限制不是正式免战规则。

## 保存与重入

保存失败保留最新内存；后续操作消费该 current。retrySave 只 R 预编码并写当前值，不重新读档、不通知、不执行初配/动作/周期/随机/终局。新进程只能恢复最后一次成功写入的字符串及对应独立 expected。

busy 覆盖读、外部材料、纯生产者、R 验证/编码、写和通知。递归 bootstrap/retryRead/createFirst/dispatch/retrySave 全部 BUSY，不排队。异常释放 busy；监听错误逐个隔离，不能撤销提交。非 void write 不伪装 saved。

## 支持矩阵

| 状态或能力 | 本批边界 |
| --- | --- |
| first-hub | 严格初配、保存、冷恢复、首次 depart |
| active-world | P 现有任务/来源/搬运/库存/药食/维护、G1/G2组合 |
| living-hub | 只读、保存重试、冷恢复；无第二真实委托出发 |
| dead | 完整终局只读、保存重试、冷恢复；不可复活 |
| H0 正常返回 | 真实 G1 cycle，steps=[]，不补夜 |
| 异地 Day7 截止 | 原有有序周期及 HP0 短路 |
| 活 pending combat | UNSUPPORTED_STAGE，原子拒绝 |
| 两声明历史 | TEST-only，保全旧结果，不注册第二玩家任务 |
| CTB / 浏览器 / 多标签 / React | NOT IMPLEMENTED / NOT RUN |
| O3 发布安排 / E02 / E03 | 未决定／未执行 |

## S01—S12 原生验收定位

全部文件位于 `src/state/residence-session/`，完整测试名称可在定向日志和源码中复核。

| 验收 | 新测试文件（supply- 前缀） | 证据 |
| --- | --- | --- |
| S01 | compatibility.test.ts | 九种域占用、伪域、非法 composition 不占域 |
| S02 | initial.test.ts; longchain.integration.test.ts | read-null、九组合、首建/出发双故障与无 active fixture 长链 |
| S03 | expected.test.ts; initial.test.ts; reentry.test.ts | 四态外部 expected、错值、非首次粘性拒绝 |
| S04 | operations.test.ts; faults.test.ts; longchain.integration.test.ts | 真实任务、T1交换、拆合/快捷/地面迁移及身份守恒 |
| S05 | operations.test.ts; persistence.test.ts; longchain.integration.test.ts | 六药 E0、四维护、首绷/日额、安装与维护竞争 |
| S06 | terminal.test.ts; expected.test.ts; longchain.integration.test.ts | 四终局、H0空步骤、Day6休整死、Day7行动/截止死 |
| S07 | faults.test.ts; persistence.test.ts | clone/stale/body/inventory/dependencies、错 producer、R负控、预编码故障 |
| S08 | initial.test.ts; persistence.test.ts; longchain.integration.test.ts; terminal.test.ts | 四组独立计数与最新内存保存重试 |
| S09 | reentry.test.ts | 十类同步回调、独立启动 provider、监听隔离和异常释放 |
| S10 | expected.test.ts; longchain.integration.test.ts | 四态端口恢复、旧成功/失败两声明历史 |
| S11 | expected.test.ts; terminal.test.ts | 四类 F01 坏历史 blocked；活 pending 拒绝，死亡优先 |
| S12 | session.test.ts; compatibility.test.ts | 精确导出与只读类型；检查/范围记录见 verification-results.json |

未更改任何既有生产或测试文件；旧 v1/v2/v3、P/R/F01 和参数保持。批准参数不是会话层副本。
