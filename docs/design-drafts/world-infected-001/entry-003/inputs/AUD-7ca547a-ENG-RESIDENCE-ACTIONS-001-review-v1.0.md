# G4：准确提交源码实审

> 标识：AUD-7ca547a-ENG-RESIDENCE-ACTIONS-001 / v1.0
> 日期：2026-10-04
> 结论：**PASS（限定 G4 任务范围），无需返修。**
> 审查提交：`7ca547ab8ab4f411d1102a79baf8c0796f4b082c`
> 父提交：`60e9c30732c5e22cfe9ff58b9b381de64b945180`
> 当前根 tree：`4b5a39ef32f5b24e2cfa56076403bf301654324e`

## 1. 结论与授权边界

G4 的首次出发与活动驻留事务链满足本次已授权的 headless 边界。没有发现需要阻断本批验收的生产缺陷。原 G3、G2、G1 与首身份核心的历史审查保持原范围，不由本次 PASS 扩大。

通过的是：真实 read-null 后显式创建 fresh-hub、受控首次 launch、move/reveal/pickup/drop/rest 的正式规则组合、一次完整内存提交与保存尝试、保存失败后继续、窄字符串恢复与只读通知。

**没有通过或开放：**真实五图产品、医疗／战斗／完整终局、钱包与奖罚、关闭历史安装、浏览器槽／刷新／多标签、O3 发布安排或 Owner 试玩。G4 对死亡／战斗等完整结果的拒绝仍是获准的开发隔离，不是玩家可规避死亡的新机制。本次不合并 main、不发布、不修改 Project Sources 或项目配置。

下一步采用一项集中设计任务 WORLD-ENTRY-003，准备终局、清算、关闭态恢复的局部规则与工程准入。该设计任务不是立即修改生产代码或批准剩余数值。

## 2. 审查输入与实际阅读

输入为当前会话的 G4 原任务 ZIP、前置审查原件，以及 GitHub 固定提交实文件。已解包并阅读 G4 完整任务、授权／范围和基线清单；未把作者完成报告当作规则来源。

本轮实际阅读／对照：

| 材料 | 范围 |
| --- | --- |
| G4 生产实现 | commands.ts、types.ts、launch.ts、transitions.ts、session.ts 全文；index.ts 的完整小型导出差异 |
| 新测试 | launch.test.ts 194行、operations.test.ts 226行、operation-persistence.test.ts 162行；分段补读截断内容 |
| 既有测试与夹具 | session.integration.test.ts 全文及新增无档长链；session.test.ts 的类型收窄和五项旧不支持命令差异；test-fixtures.ts 新 firstHarness 与调用链 |
| 交付文档 | G4 contract-and-support、implementation-notes、verification-results，完成记录及四份共享文档追加差异 |
| 固定边界 | 实际 AGENTS；G4 原任务引用的 DEC-049/050、G1/G2/G3 合同与此前已读取源码边界；当前 decision-queue 与经济 Draft 的状态分层 |
| Git / CI | commit 元数据、父SHA、root tree、远端分支引用；CI #133、check job 步骤及完整日志 |

未重新通读全部 GDD／旧医院历史，也未把已有源码审查重计为本轮新的完整审查。

## 3. 关键源码判断

### 3.1 请求与首次出发

commands.ts 先通过共享数据检查读取 tag，再使用 launch/rest 的严格 schema 或原 G2 完整命令解析；不是用宽松 tag 解析后的缩减对象继续执行。view、任意费用、seed、nextState、批量边和调用方休整等级均未成为写入口。

session.dispatch 在 busy 下先要求 ready/current，再解析命令、核对 expectedRevision 和适用 phase。launch.ts 进一步核对角色、D1/first-ready、声明全集未接、受控 catalogRef 对应委托及执行材料能力。revision 安全加一先于 provider。

provider 返回仅经 readExecution 解析为完整执行材料；实际 activateMission、G1 planCharacterCycle(depart)、G2 establishResidenceLocation 都在提案阶段完成。body、cycle、carried、itemStates 和其他委托事实保持；入口需要战斗时不安装。直到完整聚合校验及编码成功，session 才走唯一 commit。

firstHarness 不调用预建 active 的 G2 fixture 来替代首次路径。新增长链从 read-null、createFirst、launch 开始；G3 预置 active 用例只作为原有恢复／移动回归。

### 3.2 活动操作与周期

transitions.ts 每种操作调用对应 G2 原入口，并保留 assertResidenceLocationPlanCurrent。普通操作维持整个 clock 和 cycle；rest 单独要求 taskDay/cycle 各推进一次、startCycle 等其余 clock 字段保持，并要求整个 site/carried/itemStates 不变。不是为接入 rest 而删除所有时间连续性检查。

揭示、物品迁移、几何／负重、精力与日结算法仍由原核心所有。G4 没有自写第二套费用、来源抽样或疾病公式。测试覆盖整实例及整堆、真实资源状态、E0 免费迁移、95→85 临时休整、T6→7 与 T7 拒绝。

### 3.3 单提交、保存与重入

六类操作最终共享 session 中同一个 commit。顺序为：规则提案及连续性校验 → aggregate validator → serialize → current 替换 → 一次 write 尝试 → 一次通知分发。写失败不回滚、不重读，不重新调用规则；retrySave 只编码并写入最新 current。

provider、factory、read、write、notify 内的写操作受到同一 busy 保护。通知异常逐监听器隔离，不撤销已经提交的世界后态；内部诊断含身份／seed，不等于玩家投影。

### 3.4 未支持结果

入口遭遇、到达事件、活动遭遇、reveal/rest/move 的合法死亡提案继续由 headless 层拒绝完整安装；不删掉 HP0 或 pending 再保存。源码与测试都没有将该隔离误写为生产“免死”。

完整终局是下一接缝：不能简单删除这些拒绝分支而不处理任务事实、资产、周期来源及可恢复终态。

## 4. A01—A12 验收映射审查

| 组 | 本轮核实的证据 |
| --- | --- |
| A01/A02 | firstHarness 与 launch 测试：无档创建，三正式规则入口，非法请求/provider 材料、错目录声明及旧 revision 拒绝；身体和实物不刷新 |
| A03/A04 | operations 测试：来源已兑现判定、固定／随机抽样次数、满包留地、真实实例与 placement、E0 和任务物拒绝 |
| A05/A06 | A/C 有序周期、六次休整至T7；真正返回死亡／战斗提案但零提交的用例，不只测试畸形输入 |
| A07 | 新增十次 current 替换长链（含首次创建），每步验证 revision、write、notify 和字符串等价 |
| A08 | launch/reveal/pickup/drop/rest 五处冷恢复；恢复零规则/写入/通知，并继续下一真实命令 |
| A09 | 两条独立保存故障链；当前引用替换独立计数，原生规则 spy 不替换实现 |
| A10/A11 | 五种回调重入、provider 捕获、监听异常隔离、严格六类命令及阶段拒绝；普通 index 未暴露安装/commit 权 |
| A12 | 原核心、G3保存、旧医院回归和远端完整 CI；历史成绩与本轮新增分开 |

## 5. 验证证据的归属

### 5.1 作者本地证据（已核对仓库记录与测试，不冒称主线本地复跑）

本轮作者基线为121文件／2681项；最终定向20文件／638项；最终全量124文件／2791项。三份新文件114个展开用例，加既有 integration 的1条新长链，共115项新增；替换5项 G3 历史不支持命令行，净增110。103、23、169、115、61等回归数量不再次算为新增。

两条故障链的源码断言与报告对应：

| 计数 | launch失败→reveal→重试 | reveal失败→pickup→rest失败→重试 |
| --- | ---: | ---: |
| provider／factory | 1／1 | 1／1 |
| activate／establish | 1／1 | 1／1 |
| G1 cycle／action | 1／1 | 2／2 |
| G2 reveal／transfer／rest／move | 1／0／0／0 | 1／1／1／0 |
| draw | 1 | 1 |
| current替换（含创建） | 3 | 5 |
| 原owner read／write／notify | 1／4／3 | 1／6／5 |

链二的新隔离domain冷恢复单列read1、write0、notify0、factory/provider/规则0。它不是整个真实浏览器冷启动验收。

作者753份保护文件、34参数、24链接、最终测试至提交指纹及本地工作区检查作为作者证据保留；主线没有访问 E:/ 或 C:/ 上的报告，也没有完整重跑该本地审计套件。

### 5.2 远端CI（主线实际读取）

CI #133：run `37180698693`，job `111372505080`，head SHA 与本报告一致。完整日志核对：architecture 50 DEC／246 core production files；typecheck成功；124文件／2791项成功；build成功，419 modules。新测试分别56、40、18项；session.integration为8项、session为41项。

日志同时保留既有包体提示、依赖审计4项告警及Actions运行时提示；本次未调整阈值或依赖，也未据CI成功宣称发布安全审计通过。CI成绩不与作者运行累加。

### 5.3 主线实际执行

- 解包原G4输入；四条SHA-256清单匹配，五件原件大小与Git blob均与固定提交inputs目录元数据一致。
- 复制 launch.ts、transitions.ts、session.ts 供本轮隔离验证；三者 Git blob 均匹配固定提交。核对结果见 source-fingerprints.json。
- 用 Node v22.16.0 内置 TypeScript 转换执行上述三个文件的原控制流，移除模块导入并注入显式测试替身。**36项控制流检查全部符合预期**；删除 stale-command guard 的负控确实允许重复 rest，探针检测到该错误。
- 这些测试替换了底层 identity/G1/G2、命令schema、aggregate及codec，不是原生G4、Zod、完整规则、实际库存或真实保存验证。不能把36项计入生产新增测试。
- 通过提交差异核对25个变更路径落在原27条白名单内；现有共享文档为末尾追加，生产改动限定在session层，未变更core、residence-save、规则、参数、依赖或玩家入口。

主线容器尝试获取完整Git工作副本时因无法解析 github.com 失败，连接器仍能读取固定提交。**主线全量npm、原生测试、真实浏览器、刷新、多标签、Owner试玩均NOT RUN。** 未用隔离脚本或CI冒充主线全量复跑。

## 6. Git范围与状态

远端G4：`7ca547ab8ab4f411d1102a79baf8c0796f4b082c`。
远端G3：`60e9c30732c5e22cfe9ff58b9b381de64b945180`。
远端G2：`d7953bbf96dc842d2953e019f950275cd693bf09`。
远端G1：`942b2d93916c649f4c2ec6cd399035151269d2ca`。
远端design-world-entry-002：`9dfe21ef7f423c1e5d9801d26e4425b28444cf63`。
远端main：`a76e9c1c998051fc1643b6e0c3d53443fa55feed`。

远端引用由主线连接器读取；Owner本地HEAD、工作区及push执行细节仍是作者报告。本轮主线没有执行仓库写入、commit、push或合并。

## 7. 后续安排

WORLD-ENTRY-003集中准备：四种终局的真实资格和顺序、最小钱包／奖罚及任务物处置、关闭态完整恢复、有限反例验证与最近最多三个工程契约候选。成功120、余额初值／上限、商品与服务等仍按来源分层，不能一起自动批准。

不重开已确认的单驻留、不重接、失败min(P,20)、正常返回不补夜、Day7先结后召回等方向。尚未正式落文的条款只形成待审正文，不自行分配DEC编号。

生还关闭后无新内容保持静态中枢；死亡不继承当前资产、不倒改既成历史。三专长、工具箱完整路线、战斗及医疗、玩家安全提示、真实五图、O3与Owner首玩仍有后续验收责任。
