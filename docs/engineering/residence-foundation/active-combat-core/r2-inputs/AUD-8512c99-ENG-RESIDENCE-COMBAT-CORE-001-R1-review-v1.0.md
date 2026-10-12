# E02-P-R1 准确SHA专项源码复审 v1.0

日期：2026-10-12。
结论：**NEEDS REVISION。原F01／F02八个反例的修复方向成立；新增相邻回归F03必须限定修复，暂不进入E02-R。**

## 1. 准确基线与授权边界

- 仓库：lvlw/elevator-survival。
- 受审SHA：`8512c991adb353775ffa4785599a011e419a81fa`。
- 父SHA：`9f0eaacfbb83e49401c52fb57c3cfa061b2ef026`。
- Tree：`06dee9c83e2b00075f5a0103d6c87211d7c22744`。
- 分支：`feature/residence-combat-core-001`。
- 通过GitHub连接器读取提交和远端ref，均与以上一致。本地主机工作区和其他远端未变继续是作者证据，不冒称主线读取E盘。
- 本次不改正式规则／参数，不撤销已审E01-S。不批准v4/current，不重新开放战斗设计。

## 2. 原F01／F02已核对的修复

原始上下文由实际动作前态捕获，history-context与history-queue按真实命令时长、敌动作间隔、蓄力延后、退却锁定及严格先后验证队列；trace联合核对来源、时点、请求量、外套／防御及真实消费引用。通用HP截零检查仍是通用算术，不擅自变成护工专用验证。

主线以原样源码执行前轮20个裁剪见证（为R1新增的context字段补充独立TEST材料）：20项均符合，其中8个原误接受反例均拒绝。此结果是隔离执行，不替代作者已实际运行的原生模板／58项新增回归。

## 3. F03：刚结束战斗后的合法维护被当成原始资源篡改

### 3.1 精确源码因果链

1. `src/core/residence-combat/trace.ts:102-108`新增保护：当历史decision.revision等于当前character.revision时，最新实物资源必须与该条战斗结果一致。这对完整已完成值的原始篡改拒绝是必要保护，应当保留。
2. `src/core/residence-supply/shared-maintenance.ts:34-48`先恢复真实资源、消费材料，构造尚未推进character.revision的私有候选；第46行`context.read(next)`在G1行动和最终签发之前。
3. `src/core/residence-combat/stable.ts:19-30,44-45`将这个候选读取直接接到完整`readCombatValue`。刚退却／胜利且中间没有任何别的命令时，闭场decision.revision等于before.revision，合法修复后的资源因此被上述检查误判。
4. 一旦有别的合法命令先推进revision，就不再命中相等分支。现有R1维修组合用例在退却后先搜索、拾取才维修，恰好避开直接相邻情况；它证明较后维修有效，不能证明立即维修有效。

### 3.2 本轮实际隔离见证

追加12项；四项期望合法但被误拒绝：

| 分支 | 原闭场值读取 | 立即维护 | 独立TEST revision后移对照 |
| --- | --- | --- | --- |
| 退却后修管 | 接受 | `Latest real resource differs from decision evidence` | 接受 |
| 退却后修外套 | 接受 | 同上 | 接受 |
| 胜利后修管 | 接受 | 同上 | 接受 |
| 胜利后修外套 | 接受 | 同上 | 接受 |

两个原闭场读取、四个后移对照及两个原始资源篡改拒绝，共8项符合。追加12项与原20项合计32项：28符合、4误拒绝、0异常，输入与依赖均未被修改。四个后移对照不是推荐玩家多整理一次背包，也不构成合法生产可达性证明。

执行原样stable／shared-maintenance／validation／history／context／queue／trace；Zod、供给验证、受控授权、签发、资源、材料及G1等外围适配器明确替换。机械/外套维修的具体配方、位置、日额与真实CTB前态尚须完整仓库原生复现；包内7项原生模板主线 **NOT RUN**。

### 3.3 严重性与处理

这是P已承诺“战后真实维护接续”的正确性回归，不能留到R编解码中补救。它不意味着保存已损坏或材料已被持久扣掉；尚未接current/存储，隔离检查中原值也没有变化。

要求在完整已完成检查点、受控操作内部候选及最终计划之间明确验证时点。保留原前态严格验证和最终完整值验证，合法维护只付一次精力／一次材料／一次G1／一次revision；合法维护引发流血死亡仍完成原身体结果并一次关闭。不能删除最新资源保护、放宽所有历史、补虚假修订、自动先发空动作或对外提供skipValidation。不要复制维护公式或另建维修版战斗引擎。

F03先原生复现，再做最小修复；无需改规则、参数或Owner策略。

## 4. CI、测试与并发证据

主线已读取CI #151元数据、check作业步骤及完整日志：run38260725990 / job114850215158；检出准确SHA `8512c991adb353775ffa4785599a011e419a81fa`，201文件／3781项通过，52 DEC／329 core，typecheck/build成功。日志中新增三个测试文件分别44／9／5项，与58项增量相符。

作者本地两次默认并发超时保持历史身份；随后仅用VITEST_MAX_WORKERS=2建立基线并完成完整检查，没有删测试／改超时。这个运行方式可接受为本轮作者验证，但不抹掉失败经过。CI的`npm run test:run`也已全量成功，不能把本次F03解释成单纯机器慢。

CI同时有既有大包警告及npm安装审计提示5项（2 moderate／3 high）。本次没有做依赖漏洞可达性分析，不宣称漏洞可利用，也不执行audit fix或扩大源码任务。上述警告留为维护记录。

主线没有本地完整npm复跑、生产源码改写、真实CTB实例长链运行、浏览器／真实存储／试玩。

## 5. 原件、源码和阅读范围

7份本轮隔离执行源的Git blob全部与准确提交一致，详见source-integrity。从实际P原包5份、R1原包16份字节独立重算归档Git tree：

- inputs：`e59555f0f0edf35bf20a3b8070934a9c609f1f87`。
- r1-inputs：`b062407a753397964026257977cd81f7372a18cc`。

均与远端受审目录一致。完整阅读修订的context/queue/trace/history/effects/schema和相邻maintenance/stable/inventory/G2 transfer；定点核对原生修复／组合回归及正式P合同。没有将未阅读全文的所有文件都宣称为独立逐行实审；作者全保护对象、全diff及UTF-8检查仍归作者证据。

W01保留且只保留原E01-R任务书第7—9行、原E01-P审查报告第3—6行的七处硬换行；本轮未新增例外。本次复审不因空白而返修。

## 6. 后续安排与停止点

按Owner已有下发权限，直接给同一Codex工程会话 **ENG-RESIDENCE-COMBAT-CORE-001-R2**，从上述受审SHA继续同工程分支。集中完成原生复现、F03与相邻维护／死亡组合、原F01／F02和完整回归、自查、普通commit/push。

为避免权限冲突，本次R2明确允许必要的shared-maintenance及新战斗内部候选验证窄接缝；不是继承旧116路径写权。旧P/R/S、CTB语义、G1/G2、配置、正式合同、state和旧测试保持。

完成提交后再次准确SHA源码复审；本次不进入E02-R/S/E03。

## 可追查入口

源文件均按上列准确SHA读取。重点路径：
- `src/core/residence-combat/trace.ts`，102—108行。
- `src/core/residence-supply/shared-maintenance.ts`，34—48行。
- `src/core/residence-combat/stable.ts`，19—30及44—45行。
- `src/core/residence-combat/review-history-integration.test.ts`，其维修分支先搜索／拾取再维修。
- `docs/engineering/residence-foundation/active-combat-core-contract-v1.0.md`，P01／P02／P07的P10。

实际执行边界和结果见同包evidence目录；它们不是仓库完整归档或生产SAVE证明。
