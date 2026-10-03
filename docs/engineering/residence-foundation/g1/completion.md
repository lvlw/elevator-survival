# ENG-RESIDENCE-ENERGY-CYCLE-001（G1）作者交付

状态：作者实现与完整检查通过；提交后等待主线准确 SHA 源码实审。本文不代表实审 PASS、完整世界可玩或发布。

起点：`9dfe21ef7f423c1e5d9801d26e4425b28444cf63`；初始工作区／暂存区干净。新建分支：`feature/residence-energy-cycle-core-001`。最终 SHA 以本文件所属提交与提交后消息为准，不为自引用 amend。

## 本轮交付

- 唯一可执行配置仅包含批准 configurationId 与 34 数值叶；core 负责严格复制、冻结、期望绑定和安全整数，不注册产品配置。
- 单精力查询／完整动作计划、独立已触发后果。E1 不足价允许最后一动到0，E0不能再开付费动作；免费药食等仅有局部能量资格，不假造完整消费。
- 一份真实身体／时钟输入，按流血、感染、饥饿顺序处理；合法死亡短路，生还才清周期效果、重建额度和重设精力。无回血、止血、治伤、修物或补给。
- A/C独立上游资格、正常返回due、待与期限关闭一次提交的ready、首次D1与后续真实不同委托衔接。完整执行／修订／最新关闭来源核验，不实现全历史或第二关闭账。
- 12组契约与真实测试名逐项见[实现记录](implementation-notes.md)，实际运行／失败修订／工具环境见[验证记录](verification-results.json)。旧医院、mission-lifecycle、保存、普通执行器、golden及原正式规则未改。

## 修改文件

恰好29条授权路径，4修改／25新增：

```text
M docs/03-architecture.md
M docs/08-rule-implementation-traceability.md
M docs/design-drafts/world-infected-001/01-world-overview.md
M docs/design-drafts/world-infected-001/10-decision-queue.md
A src/core/residence-config/types.ts
A src/core/residence-config/validation.ts
A src/core/residence-config/index.ts
A src/core/residence-config/residence-config.test.ts
A src/core/residence-energy/types.ts
A src/core/residence-energy/validation.ts
A src/core/residence-energy/energy.ts
A src/core/residence-energy/index.ts
A src/core/residence-energy/energy.test.ts
A src/core/character-cycle/types.ts
A src/core/character-cycle/validation.ts
A src/core/character-cycle/cycle.ts
A src/core/character-cycle/index.ts
A src/core/character-cycle/cycle.test.ts
A src/core/character-cycle/energy-cycle.integration.test.ts
A src/content/infected-residence-core-v0.1/config.ts
A src/content/infected-residence-core-v0.1/config.test.ts
A docs/engineering/residence-foundation/g1/implementation-notes.md
A docs/engineering/residence-foundation/g1/verification-results.json
A docs/engineering/residence-foundation/g1/completion.md
A docs/engineering/residence-foundation/g1/inputs/ENG-RESIDENCE-ENERGY-CYCLE-001-task-v1.0.md
A docs/engineering/residence-foundation/g1/inputs/OWNER-authority-and-scope-G1-v1.0.md
A docs/engineering/residence-foundation/g1/inputs/AUD-9dfe21e-DOC-WORLD-ENTRY-002-review-v1.0.md
A docs/engineering/residence-foundation/g1/inputs/BASELINE-AND-INPUTS.json
A docs/engineering/residence-foundation/g1/inputs/SHA256SUMS.txt
```

四份旧文档仅追加当前状态，不覆盖任何历史段落。五输入按解压包原字节归档，ZIP本身不入库；临时脚本、逐项测试JSON与完整日志在仓库外。

## 真实验证

- 开工 `npm run test:run`：105文件／2256测试通过，生产写入前实测。
- 新增定向：5文件／145测试通过；不是历史纸面核算数量。
- 完整 `npm run check`：架构、typecheck、110文件／2401测试、build全部通过；50 DEC／235 core生产文件（新增11个core生产文件）。现有Vite大chunk警告保留，不扩范围调构建。
- 首轮类型错误与自查修订完整保留在验证记录；未修改旧测试／依赖掩盖失败。
- 提交前后字节、白名单、LF、相对链接、完整diff和暂存对象核验见验证记录／最终报告；无新空白例外。

## 风险、后置与停止点

本模块产生局部计划，无安装、钱包、物品、关闭、保存或通知权。未来协调器必须独立提供当前事实，验证各owner资格，并将所有子计划组成一次完整事务；不能分别提交能量与身体的revision。局部测试harness不是生产全聚合防回滚证明。

无已发现规则冲突或本轮未完成实现项。准确SHA源码实审尚待主线；G2/G3未执行，五图、钱包、完整CTB、专长、玩家入口、浏览器保存与Owner试玩均未接／NOT RUN。未修改DEC、批准配置JSON、合同、AGENTS、旧源码、依赖或Save格式。不推main、设计分支或旧工程分支，不合并／强推／改历史。

按任务明确授权，在最终检查通过后只进行本分支一次普通commit／push；随后停止，不自动进入下一工程。

## ENG-RESIDENCE-ENERGY-CYCLE-001-R1 作者修复交付（2026-10-04）

本节为最新状态，上文是原 G1 交付历史。起始 SHA `9bbf5aaa0828b3144949ec6a01a76bb3ba06eceb`，沿用 `feature/residence-energy-cycle-core-001`，接手时工作区／暂存区干净；受保护远端参照与 R1 输入一致。原源码实审为 NEEDS REVISION，不是 PASS；本批修复 F01 后等待新准确 SHA 专项复审。

### 实现与原生反例

view 属于只读 ResidenceQueryRequest；不再属于 FreeResidenceAction、ResidenceActionRequest 或 ResidenceCompletion 的带效果完成事实。执行入口以同源严格 actionSchema 在 provider 前拒绝 view，查询入口不产生计划／revision，不新增任何旁路布尔。四类免费变更、付费最后一动、独立触发结果、现有周期生产代码与规则保持。

包内未经改写的 full-api-probe.mjs 在真实公开 API 上运行：修复前 exit1，4/6对照匹配；X01 零效果 view 生成 revision1，X02 损血12／暴露1 view 生成死亡后态。修复后 exit0、6/6匹配，X01/X02均为 INVALID_INPUT、provider0次、HP12／E0／revision0前态不变、没有返回计划。未使用隔离脚本的替代验证端口。

### 本批修改文件

共15个授权路径：13修改、2原件新增；不新增生产文件。

```text
M src/core/residence-energy/types.ts
M src/core/residence-energy/validation.ts
M src/core/residence-energy/energy.ts
M src/core/residence-energy/index.ts
M src/core/residence-energy/energy.test.ts
M src/core/character-cycle/energy-cycle.integration.test.ts
M docs/engineering/residence-foundation/g1/implementation-notes.md
M docs/engineering/residence-foundation/g1/verification-results.json
M docs/engineering/residence-foundation/g1/completion.md
M docs/03-architecture.md
M docs/08-rule-implementation-traceability.md
M docs/design-drafts/world-infected-001/01-world-overview.md
M docs/design-drafts/world-infected-001/10-decision-queue.md
A docs/engineering/residence-foundation/g1/reviews/ENG-RESIDENCE-ENERGY-CYCLE-001-R1-task-v1.0.md
A docs/engineering/residence-foundation/g1/reviews/AUD-9bbf5aa-ENG-RESIDENCE-ENERGY-CYCLE-001-review-v1.0.md
```

### 实际验证和保留边界

- R1修改前基线：110文件／2401测试，exit0，原始日志已保存在仓库外。未覆盖 G1 原105文件／2256基线。
- R1新增25项展开测试，替代原错误 view 执行行1项，净增24项；四类免费行强化不另计数。定向5文件／169测试（21＋1＋67＋54＋26）全部通过。
- 完整 npm run check：architecture PASS（50 DEC／235 core生产文件）、typecheck PASS、110文件／2425测试 PASS、build PASS（419模块）。原有超过500kB chunk告警保留，无构建调整。
- 首次typecheck曾因新增测试的宽联合变量读取source失败；仅修正测试的类型收窄，复跑通过。反例修复前失败及该类型失败均保留在 r1 验证记录。
- 类型／运行时、E0/E1、mutable/frozen、零／抛错／损血 provider、四种周期上下文、provider伪造view、旁路字段、旧revision和独立trigger均有真实回归。相邻周期查询／计划只读自查，没有改周期生产实现。
- 两份R1原件逐字节匹配；原五输入保持；四状态文件保留完整原字节前缀；批准配置34叶／键值保持。完整白名单、UTF-8/LF、相对链接、diff和提交对象检查的实际明细见[验证记录](verification-results.json)r1及仓库外审计结果。

无已发现规则冲突或本批未完成实现项。源码专项复审仍为 PENDING；真实保存、浏览器、Owner试玩 NOT RUN，G2/G3未执行。不接新入口、钱包、地图、完整战斗或专长；不改DEC、参数、合同、Save格式、依赖或其他分支。按本任务授权仅在核验后一次普通commit与同名分支push；最终SHA与远端结果由提交后消息报告，不为自引用amend。
