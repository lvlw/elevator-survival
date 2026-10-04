# G4 受控首次出发与驻留事务合同

依据 [G4 原任务](inputs/ENG-RESIDENCE-ACTIONS-001-task-v1.0.md)、[Owner 范围记录](inputs/OWNER-authority-and-scope-G4-v1.0.md)、[G3 准确 SHA 限定实审](inputs/AUD-60e9c30-ENG-RESIDENCE-SESSION-RESTORE-001-review-v1.0.md)、DEC-049/050 与 [O2 恢复补充](../runtime-restore-supplement-v1.0.md)。本合同记录作者实现，不是新规则、主线审查 PASS 或 Owner 试玩结论。

## 唯一状态与受控入口

保留 G3 私有会话 current、域单 writer、read-null 才允许显式 createFirst 的启动状态机。`createFirst` 只提交 fresh-hub，绝不自动 launch；无档、坏档、读失败不互相替代。原严格冷候选及独立 expected 恢复接口完全不改。

`ResidenceSessionComposition.provideFirstExecution?: () => unknown` 是受控 composition 注入的首次执行材料入口。无默认 RunIdentity、seed 或环境熵；未配置时既有 G3 bootstrap/move 继续工作，而 launch 不可用。函数在创建 owner 时捕获，只在 ready/fresh、revision、身份、真实目录对应声明等检查全部通过后调用一次，并复用 `readExecution` 严格复制 RunIdentity。异常只报 EXECUTION_PROVIDER_FAILED；非法材料保留正式身份校验错误。该函数不能提供初态／费用／计划或安装 current。

普通 index 只导出 constructor、错误类、只读类型；没有 install、replace、setCurrent、commitExternalPlan。内部 launch/transitions 函数只返回提案，不能保存。诊断 getState 包含内部身份，不是玩家 ViewModel；queryKnowledge 继续只调用原 G2 玩家安全查询。

## 六类请求与阶段

| kind | 严格字段（加 kind） | 适用当前态 | 唯一正式规则入口 |
| --- | --- | --- | --- |
| launch | identity、expectedRevision、commissionId | fresh-hub | activateMission → planCharacterCycle(depart) → establishResidenceLocation |
| move | binding、expectedRevision、edgeId | active-world | planResidenceMove |
| reveal | binding、expectedRevision、sourceId | active-world | planResidenceSourceReveal |
| pickup | binding、expectedRevision、instanceId、placement(x/y/rotated) | active-world | planResidenceItemTransfer |
| drop | binding、expectedRevision、instanceId | active-world | planResidenceItemTransfer |
| rest | binding、expectedRevision | active-world | planResidenceLocationRest → planCharacterCycle |

四类位置命令复用 `createLocationCommand`，不复制来源、几何、carry-limit 或行动资格。launch/rest 复用现有严格数据、身份、绑定和整数 schema。view 仍只读，不产生 noop；全部字段 exact，不接受 seed/runId 注入、费用、结果、flags、多边、部分数量或调用方选择 A/C。

## 连续性与本地行为

- 首次出发：只从 D1/first-ready 及声明全集均未接出发，只激活 catalogRef 的唯一声明。原身体、能量、伤势、药效、额度、实物和资源不刷新，cycle 不增长；revision+1，D1/T1/startCycle1，同一 root identity、目录和新执行绑定，其他委托事实不变。已活动现场不再初始化。
- move/reveal/pickup/drop：使用真实 G2 签发计划，`assertResidenceLocationPlanCurrent` 校验完整前态和签发来源。identity、execution、catalog、mission facts、cycle 和整个 clock 不变，revision 恰+1。
- reveal：固定来源零随机，choice 来源沿原稳定 cursor 取一次；仅放到当前真实地面，满背包不阻止揭示。已兑现不可重发；错来源／隐藏／远程／缺条件/E0 在抽取前拒绝。正 E 最后一动与流血按 G1，不增加 wrapper 自创资格。
- pickup/drop：仅普通整实例／整堆及当前节点；pickup 显式 placement，drop 仅背包到当前地面。保持真实 instance、quantity、ItemState，E0 可免费操作，不结行动流血。无拆分、自动整理、装备或快捷位操作。
- rest：真实节点决定 A/C，G1 按流血→感染→饥饿→生还重置处理，C 的 E95 会变为85，不补生命或伤势。D/T 恰+1，startCycle不变，完整 site/carried/itemStates 和任务事实不变。T6→7 合法，T7拒绝，不创建 Day8。

## 一次事务、保存与冷恢复

busy → 严格意图/revision → 正式规则提案 → 连续性／支持后态校验 → 原 aggregate validator → 原 codec 预编码 → 唯一 current 替换 → write一次尝试 → 一次通知分发。

存档仍为 `elevator-survival.residence-headless` / `formatVersion=1`，fresh-hub/active-world schema 不改，没有持久化 authority、派生缓存或第二份身体／clock／来源库存。write失败保留已提交最新 current；重复旧请求拒绝，后续命令消费最新 current；显式 retrySave 只保存当时 current，不重激活、重抽、重结周期、补实例或通知。冷恢复不观察到达、不抽取、不重建、不保存。

read、factory、execution provider、规则执行、write、notify 期间所有写 API 重入均 BUSY；只读查询与订阅取消无玩法副作用。监听器异常逐个隔离，不回滚、不阻断后续监听，不泄露原异常详情。

## 支持边界与 OPEN

仍只提交生还稳定的首次 active-world。到达损血／暴露事件在 move plan 前拒绝；入口或移动 live enemy、reveal/rest合法致死、其他 pending/combat/death 提案不安装，零部分提交。这是尚未接玩家入口的开发期支持限制，不是玩家逃避死亡或改规则的机制。

关闭历史、完整返回／截止／死亡协调、第二委托、钱包、奖励清算、战斗、五图玩家内容、医疗／装备／专长、工具箱完整路线、安全感染提示、浏览器存档、跨标签、发布兼容 O3 及 Owner 分段突破／恢复负担试玩继续 OPEN / NOT RUN。

## 原生验收映射

| 组 | 实际测试文件／定位 |
| --- | --- |
| A01/A02 | `launch.test.ts`：read-null、三正式 API、provider 前拒绝、材料严格性、entry enemy、carry-forward |
| A03 | `operations.test.ts` 的 real source operations：固定/随机、满包、E1/E0、claimed及五种资格反例 |
| A04 | `operations.test.ts` 的 whole-instance pickup and leave：pipe/lamp/stack、几何/负重/任务/远程、E0 |
| A05/A06 | `operations.test.ts` 的 real rest and unsupported consequences：真实A/C有序手算、T7、六种致死提案、arrival/combat |
| A07 | `session.integration.test.ts` 的 real no-save long chain：同一个 owner 十次完整提交 |
| A08 | `operation-persistence.test.ts` 的五个 cold checkpoints：launch/reveal/pickup/drop/rest，严格等价及继续 |
| A09 | `operation-persistence.test.ts` 的两条独立 fault chains 及五类逐命令 write failure |
| A10 | `launch.test.ts` provider busy/copy；`operation-persistence.test.ts` 五回调重入及throwing listener；既有G3域/只读测试 |
| A11 | `launch.test.ts` command and stage contracts；原 `session.test.ts` 保留view/close/combat/medical和输入注入反例 |
| A12 | 原身份103、cold23、G1/G2、G3 save及旧session回归；完整check与保护对象审计，见验证记录 |

测试源码均位于 `src/state/residence-session/`；夹具明确只用于测试，不注册真实五图或把测试参数升级为正式内容。
