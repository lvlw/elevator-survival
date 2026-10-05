# 当前生产能力与唯一所有权

审查基线：`0921df3f219f368479d1bf3401d8fecddc0d5f71`；parent `b9b1e0fee0e779669ca40e088ac9a867016bff82`；tree `f835130ec111dcb387619168cd8bfccce7c72963`；src tree `98c840dd0b6b1a6cc014df4ac9165bc94bf2c794`。这些是实际读源码的对象，不是完整世界版本。

| 现有文件／精确符号 | 已有能力 | 本批所需增量与边界 |
|---|---|---|
| `src/core/residence-energy/energy.ts`：planResidenceAction、planTriggeredResidenceConsequence | G1能量资格、最后超额、绑定后果；`character-cycle/cycle.ts`：planCharacterCycle | 不负责医疗库存或CTB战斗；不能把旧Scene Time当E。G1公式与38配置保持 |
| `src/core/residence-location/movement.ts`：planResidenceMove、assertResidenceLocationPlanCurrent | G2移动、到达伤害及战斗/死亡协调，真实能力签发 | 活战斗pending只表示必须协调，不等于已有战斗session |
| `sources.ts`：planResidenceSourceReveal；`items.ts`：planResidenceItemTransfer | 一次来源、确定身份、地面实例、ordinary整件显式拾放 | nonordinary任务件明确拒绝；缺提取、安装、部分消费、拆合来源合同 |
| `src/core/residence-terminal/settlement.ts`：planResidenceTerminal、consumeResidenceLocationDeath | A唯一终局资格及结算生产者；真正G1结果／原G2死亡提案；`dispositions.ts`保留旧处分 | 现有policy只把已存在facts和样本映射到资格；不是任务完成生产者。新动作死亡需受控能力接缝 |
| `src/state/residence-save/terminal-history.ts`：validateTerminalEntityHistory | B整来源输出完整性；`terminal-expected.ts`、`terminal-codec.ts`恢复与严格编码 | 整实例数量相等不支持部分消费。不能删检查让新数据通过。新阶段和来源分配须正式版本边界 |
| `src/state/residence-session/terminal-session.ts`：buildTerminalResidenceSession | C唯一current，先验证/编码再commit；read/write/factory受控；保存失败保留current；retrySave只重写 | 九命令：launch/move/reveal/pickup/drop/rest/deliver/withdraw/deadline。没有任务/药食/战斗命令，没有React入口 |
| `terminal-transitions.ts`：proposeTerminalTransition；`terminal-context.ts`：terminalActiveContext | 非任意安装后态；活pending拒绝；原G2死亡送A且不重跑 | 未来医疗/任务与战斗须各自签发、验真、单次current安装；不是统一setState口 |
| `src/core/combat/combat.ts`、`enemy-persistent-state.ts` | 旧CTB、敌意图与持续敌人校验可复用 | 旧战斗依赖旧场景runtime；需明确新能量/流血边界、活态保存及真实风险游标 |
| `src/core/medical/medical-content.ts`：getAvailableMedicalTargets、buildMedicalPrimaryPlan | 旧药效目标与主要效果纯函数 | 不消费新驻留实物，不刷新G1额度，不是复活授权；外层先验HP>0及活动资格 |
| `src/core/item-state/item-state.ts`：consumeCommittedResource、restoreItemResource | 真剩余耐久/电量、耐久允许最后不足额、电量须足额 | 恢复原语满值可返回0，调用者仍须拒绝无目标消费；不能重建full state |
| `src/core/inventory/`、`quick-slot/quick-slot-operations.ts` | 格位、堆叠、显式拆出、单份快捷、失败原态不变 | 旧拆出身份需要与来源分配、ItemState配对；快捷不自动补货 |

B符号以实际export为准；文件内局部helper不是公开API。当前四保存态是fresh-hub、active-world稳定点、living-hub、dead；活战斗仍未支持。原C实审的PASS仅适用于其准确SHA与合同，历史作者测试和主线隔离审查不计入本轮成绩。

## 增量所有权

- 委托身份/关闭资格：继续mission-lifecycle；不新建任务SDK或第二套可接列表。
- 角色身体/周期/日额度：继续G1单份body；医疗只生成经验证的变化，战斗不得保存第二份可用身体。
- 当前地点、已揭示知识、来源、持久敌人、任务事实：继续G2 site；内容适配者只能以明确action生产事实。
- 实物：carried/ground/warehouse是互斥容器，ItemState是同实例资源索引；来源证据是不可用历史，不是另一库存。
- 终局积分、历史处分、封存：A；B只验证/编码，不能补奖、猜完成或重放随机；C独占current与提交。
- 未来战斗：一个受控战斗plan同时拥有队列、意图、游标、敌人和身体/装备变化；C当前聚合是持久真相，不并行保存旧医院runtime。
- UI只发选择；玩家读安全查询。getState含种子、隐藏感染与诊断，只能用于headless检查。

## 源码观察结果的适用范围

[原生探针](validation/native-api-probes.mjs)直接加载上述TypeScript，无复制规则，无改源码。现有test-fixtures仅提供隔离图和绑定：尤其A-success夹具手工放入任务件/事实，明确只证明消费者。已读C八份测试及helper、B/A/G1/G2相邻验证与旧模块相关测试；本轮不重跑生产全套。

原生输出见[独立结果](validation/native-api-results.json)，未来路线见[有限结果](validation/results.json)，不相加。没有发现可据本轮有限探针认定的生产规则缺陷；不能扩大为全面审计结论。发现的是明确的未支持边界，留给三项后续契约，不越界修基础模块。
