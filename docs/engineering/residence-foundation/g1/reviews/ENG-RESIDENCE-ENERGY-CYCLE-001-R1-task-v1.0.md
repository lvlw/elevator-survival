# ENG-RESIDENCE-ENERGY-CYCLE-001-R1：查看与行动计划边界修复

> 任务书v1.0；日期：2026-10-04。
> 已由WebGPT主线依据Owner已有G1执行／修订及任务下发权限下发；直接执行，不再请求开工或内部步骤批准。
> 一次完成F01、相关类型与运行时边界、真实回归、相邻接口自查、全量检查、文档与普通commit/push。
> **仅修复当前G1，不执行G2/G3，不改已批准玩法。**

## 1. 目标、来源与权限

让“查看已知信息”只通过只读查询入口，不得通过公开行动计划调用效果提供者、递增revision、生成身体变化或其他可提交后态。合法E0整理／已揭示物拾取／药食的局部资格继续保留；付费行动、已触发结果与日级周期不重做。

来源：同包AUD-9bbf5aa-ENG-RESIDENCE-ENERGY-CYCLE-001-review-v1.0.md的F01；仓库已批准G1契约E01/E02/R01；原G1任务§5.1及§6。查看不是付费获取新信息的调查／搜索。本次是实现符合性修复，不新增DEC、不改变O1/O2、不要求Owner重选机制。

| 项目 | 锁定 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整SHA | 9bbf5aaa0828b3144949ec6a01a76bb3ba06eceb |
| 分支 | feature/residence-energy-cycle-core-001，沿用，不新建 |
| 原G1起点 | 9dfe21ef7f423c1e5d9801d26e4425b28444cf63，仅作历史与累计差异定位 |
| 权限 | 本任务白名单内修复、补测试、文档，允许本工程同名分支普通commit/push |
| 停止点 | 最终新提交已交付，等待主线准确SHA专项复审；不自动G2/G3 |

不合并、rebase、amend历史或强推；不推main／设计／旧工程分支。不reset/clean丢弃工作，不改SSL／凭据／代理／Git空白配置，不绕过hooks。

## 2. 接手和真实基线

在当前Codex工程会话继续，由Codex检查：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin refs/heads/main refs/heads/feature/design-world-entry-002 refs/heads/feature/design-world-infected-world-001 refs/heads/feature/mission-lifecycle-core-001 refs/heads/feature/residence-energy-cycle-core-001
```

应为上述起点和分支、干净工作区。其他引用以BASELINE-AND-SCOPE.json为参照；有漂移或他人改动先说明，不覆盖。重复收到任务应识别已执行进度，不重置成果。无需新建会话或worktree。

完整读取当前AGENTS及适用嵌套规则；按AGENTS阅读正式背景，重点重读已批准G1契约、DEC-050、原G1任务、原实现／验证记录及相关源码。原12组验收、唯一配置与原首核心保护继续有效。

生产修复前实际执行`npm run test:run`，保留R1真实基线。2401只是前次作者／CI历史参照，不预填本轮结果；原G1开工2256也不能被R1结果覆盖。依赖现成则不用安装；确需补依赖只按现有lockfile执行npm ci，不升级依赖、不运行audit fix。

## 3. 先复现，再修复

包内evidence分两层：

- `isolate-view.cjs`及输出是主线已执行的函数隔离，不是完整Zod/Vitest证明；不要将其中替代端口复制到生产或真实回归中。
- `full-api-probe.mjs`是待在真实仓库运行的外置复现工具，使用仓库已安装Vite加载实际TS公开模块。主线未运行，收到后自行核验，不把文件存在当通过。

在仓库外选日志输出目录，运行：

```text
node <输入包绝对目录>/evidence/full-api-probe.mjs <仓库绝对目录> <仓库外输出目录>
```

原9bbf5aaa预期4个对照匹配、X01/X02两个策略断言不符、exit1。必须记录真实结果和原始失败，不改预期迎合现实现。工具加载失败须记为执行失败而不是发现已闭合；可改用既有energy.test.ts的真实夹具补入等价Vitest反例并在修复前实际跑出失败。无需为工具兼容更新依赖或修改项目配置。

至少原生重现：

1. 合法stable/active、E0、HP12、revision0，view/free0送planResidenceAction、零效果provider：当前不应生成revision1计划，却会生成。
2. 同前态、provider返回healthLoss12/exposuresAdded1：当前会调用provider并生成死亡计划；应在provider之前拒绝view。
3. 对照：queryResidenceAction(view)重复读取不改变状态；正常move E1/cost8与E0 organize继续合法。

完整真实测试必须导入实际公开index和真实配置／scope／验证器，不mock readCycleContext、parseResidence或身体后果来宣布修复通过。

## 4. 实现要求

### 4.1 收口查看与执行分类

主推荐：查询请求可以表示view，执行请求排除view；公开`planResidenceAction`对unknown输入中的view做运行时严格拒绝。类型可以分为查询／命令或用等价窄类型，不固定新符号名。

拒绝必须发生在效果提供者被调用之前，不能只拒绝provider的非零效果、只把结果HP改回原值、或先建议revision后当作成功返回。不得把view包装成可提交noop，也不添加allowEffects／force／isQuery之类旁路。

`queryResidenceAction`继续支持view的局部能量资格，不调用provider、不生成plan、不推进revision／周期／药效。不能为修复而禁止查看本身，或把整个free类别都禁用。

正常整理、已揭示物拾取、免费非战斗药食不是“只读查询”：它们的真实物品行为由上游负责，G1仍保留既有局部能量资格和合法行动计划。不能扩大为免费治疗效果或直接实现物品命令。

`ResidenceCompletion`、效果结果校验及公开导出应反映分类，避免类型上仍把view标为带效果的完成事实。可以改局部schema组织，不建通用命令总线，不拆出新的生产目录。

### 4.2 相邻检查与保留

本轮一次自查所有本G1公开query／plan／trigger入口：只读查询是否进入效果路径、合法free变更是否被误禁、付费类是否可冒充free、旧revision是否在provider之前拒绝、独立触发是否仍能E0结算。

若发现同类且可在白名单内修复的接口分类问题，可在本批修复并给出先失败后通过的证据。若牵涉周期规则取舍、范围扩张或不在白名单，报告具体问题，不借本轮重写周期、首核心或恢复。

不得为填长任务提前实施G2/G3，也不增加玩家入口、保存／通知、钱包、实际地图内容、医疗效果、CTB或专长。

## 5. 必须补齐的实际测试

至少覆盖下列语义，不以表格行数算测试数量：

| 组 | 预期 |
| --- | --- |
| VQ1 | view在E0及正E重复query；query没有provider参数或调用，输入／revision／cycle／身体／额度全保持 |
| VQ2 | view误送plan，合法零效果provider未调用，拒绝且无返回可提交计划 |
| VQ3 | 会计数、会抛异常、会返回损血／暴露的provider，对view均调用0次；不能先调再抹结果 |
| VQ4 | active及至少一个合法first-ready/return-due/deadline-ready稳定上下文做只读／执行分界见证，不改变原生命周期资格 |
| VQ5 | mutable和deep-frozen输入；不变更也不冻结调用方，输出只读；拒绝无计划 |
| VA1 | 四种合法free非query类别保留：organize、revealed-pickup、medical、food；E0不额外行动流血，仍不实现其完整业务 |
| VA2 | move等paid错配free仍拒绝；E1/cost8到0，下一边拒绝，旧revision在provider前拒绝 |
| VT1 | E0独立合法trigger保留；查询不制造trigger，不借新布尔授予触发资格 |
| VC1 | 全部既有周期／deadline-ready／无内容／合法死亡／配置parity真实回归 |

原`E0 free %s...`测试中的view应拆成只读与执行拒绝见证；删除错误断言时必须明确替代测试，不以删覆盖降低测试数换绿。

可用同一个隔离测试harness为未来提交端计数，证明错误路径不提交／不保存／不通知；必须标注只是harness，不声称G1新增了真实Store或浏览器保存。

修复后重跑外置公开API见证（或注明实际采用的等价Vitest替代），以及五个原G1测试文件的定向集合，再运行完整`npm run check`。不把原145、R1新增和重复运行累加成虚构新增数量。

## 6. 精确白名单（最多15条，不要求全部修改）

### 允许修复的既有源码／测试（6条）

```text
src/core/residence-energy/types.ts
src/core/residence-energy/validation.ts
src/core/residence-energy/energy.ts
src/core/residence-energy/index.ts
src/core/residence-energy/energy.test.ts
src/core/character-cycle/energy-cycle.integration.test.ts
```

本轮不新增生产文件。原cycle.ts/validation/types/index及配置源码均只读；确需改动这些文件必须先指出为什么现有边界无法修复，不悄悄扩白名单。

### 本轮交付记录（3条，可更新但保留原执行历史）

```text
docs/engineering/residence-foundation/g1/implementation-notes.md
docs/engineering/residence-foundation/g1/verification-results.json
docs/engineering/residence-foundation/g1/completion.md
```

用最新R1区说明F01修复／测试及待主线复审。原G1基线、2401/145成绩与错误分类的发现过程保留历史，不改成9bbf5aaa当时已通过主线审查。JSON可加入R1对象、保留原执行记录；不能覆盖原baseline。

### 四份状态文件只末尾追加必要R1状态

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

完整保留本任务起点字节前缀；追加“G1-R1作者修复待准确SHA复审”，不自行写主线PASS。没有必要更新的文件可以不动。

### 新增原件归档（2条）

```text
docs/engineering/residence-foundation/g1/reviews/ENG-RESIDENCE-ENERGY-CYCLE-001-R1-task-v1.0.md
docs/engineering/residence-foundation/g1/reviews/AUD-9bbf5aa-ENG-RESIDENCE-ENERGY-CYCLE-001-review-v1.0.md
```

只将本任务书和同包审查报告按原字节归档。evidence、ZIP、外置脚本、日志、BASELINE-AND-SCOPE及校验清单留仓库外，必要摘要进R1验证记录，不新增仓库路径。

### 所有其他对象保护

原G1五份inputs、DEC001—050、两正式合同、批准JSON、唯一content配置、residence-config、原character-cycle生产代码、mission-lifecycle、全部旧医院、state/app/UI、依赖/lock、AGENTS、构建／CI／Git配置、历史设计与验证原件均不改变。沿用原规则权威、单实例实物与统一结算原则。

## 7. 自查、检查与提交

一次完成修复、类型／运行时／原生反例、相邻分类逆向阅读及必要修订。可使用只读专项助手核查query与command分离，根会话唯一写者/Git执行者；作者／助手／主线证据分开。

执行并记录：

```text
npm run test:run
npm run test:run -- src/core/residence-config/residence-config.test.ts src/content/infected-residence-core-v0.1/config.test.ts src/core/residence-energy/energy.test.ts src/core/character-cycle/cycle.test.ts src/core/character-cycle/energy-cycle.integration.test.ts
npm run check
git diff --check
git diff --cached --check
git diff --check 9bbf5aaa0828b3144949ec6a01a76bb3ba06eceb
git diff --name-status 9bbf5aaa0828b3144949ec6a01a76bb3ba06eceb
```

第一条基线在写代码前执行；其后定向和check在修复后执行。完整check按实际package.json确认architecture/typecheck/test/build，原有告警保留真实输出，不调整阈值。

检查全部实际变更（含untracked）属于白名单；两原件字节／Git index匹配、四状态文件原前缀、原5输入和保护对象不变；34配置叶保持、UTF-8/LF/无BOM、新增链接和所有diff检查通过。只暂存明确文件，不git add .。

本任务无新空白例外。报告更新后重新暂存，核验index与已测源码一致，再普通commit；建议message：`fix: keep residence view queries out of action plans`。

只推当前分支：

```text
git push origin HEAD:refs/heads/feature/residence-energy-cycle-core-001
```

提交后报告最终完整SHA、实际diff／原件与远端验证、工作区与其他分支不变。网络失败允许本任务内一次普通重试，持续失败保留提交并如实PUSH BLOCKED，不强推／改安全设置／重做提交。

## 8. 完成报告与停止

报告包含R1起始／最终完整SHA、分支、F01原生复现与修复、实际测试基线、新增及重构测试、完整check、配置及范围保护、首失败与修订、普通commit/push结果、未完成与NOT RUN。

不要为自包含最终SHA反复amend；最终SHA由提交后消息和Git对象确定。

```text
ENG-RESIDENCE-ENERGY-CYCLE-001-R1：COMPLETE／BLOCKED，待主线专项实审。
起始SHA：9bbf5aaa0828b3144949ec6a01a76bb3ba06eceb
最终完整SHA：...
F01真实复现：...；修复及query/free/paid/trigger回归：...
R1实际基线：...；新增/重构测试：...；最终check：...
原件／范围／配置／diff：...
commit/push／远端／工作区：...
真实保存、浏览器及Owner试玩NOT RUN；未执行G2/G3。
已停止，等待准确SHA专项源码复审。
```

本批只要完成这些内部步骤即可交付，不再让Owner为各个测试、文件或普通修订逐项确认。
