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
