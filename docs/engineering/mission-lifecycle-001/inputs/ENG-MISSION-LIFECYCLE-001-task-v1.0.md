# ENG-MISSION-LIFECYCLE-001：具体委托身份与关闭资格纯核心

> 任务书 v1.0 · 主线下发日期：2026-10-03。
> **已获 Owner 执行授权。收到完整输入包后，直接执行本任务；无需再次申请开工或逐步骤批准。**
> 类型：一个可独立验收的纯 TypeScript 工程 Goal。不是完整世界接线或新玩家内容发布。
> 停止点：完成本 Goal、普通提交／推送后，等待主线对最终准确 SHA 的独立实文件评审。不得自动进入下一 Goal。

## 1. 目标、依据与权限

### 1.1 本项交付

让系统可靠区分“哪个角色的哪份具体委托、哪一次执行”，并从同一权威生命周期事实提供首次资格、同一活动执行继续资格、已终止不可重接和合法无可接委托的查询；完成受控首次建立、首次激活、受控终止与窄值严格恢复。

这是从详细设计、实现、正反例与组合测试，到自查修订、最终检查、文档记录和普通 commit／push 的一个完整任务。类型命名、函数拆分、测试组织和不改变规则的实现选择由 Codex 自行完成，不把内部步骤拆成需要 Owner 回传确认的小任务。

本项完成后仍无新玩家界面、五图运行、奖励发放或真实保存接线。资格核心只是后续完整出发／终局事务的组成部分，不是完整出发许可、死亡判定器或生产提交入口。

### 1.2 来源及权威

- 正式玩法：固定基线的 `docs/05-design-decisions.md`，尤其 **DEC-049 A1—A6** 及其局部覆盖与保留。
- 唯一已批准首工程契约：`docs/design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md`，**B1—B10、K01—K22 全部有效**。文件名保留 draft 不表示当前合同尚待批准。
- 本次执行授权：输入包 `OWNER-authorization-ENG-MISSION-LIFECYCLE-001-v1.0.md`。
- 文档前置审查：输入包 `AUD-6b48b3d-DOC-WORLD-ENTRY-001-review-v1.0.md`，对本工程起始提交的限定实审 PASS。它不是本次工程通过证明。
- 本任务书只锁定本 Goal 的工程组织、路径、验收与 Git 权限，不新增 DEC、不改写已批准合同。其摘要不得用来遗漏合同条款。

先前文件中“工程未授权”的日期性描述，是其当时状态；本次 Owner 授权解除本 Goal 的执行等待，不追改那些归档原件。其他工程、经济数值、专长效果、日级结算和发布兼容仍按各自实际状态处理。

### 1.3 Git 权限

只授权从下述准确基线建立 `feature/mission-lifecycle-core-001`，并向该同名远端分支普通 commit／push。本次不向设计分支写入或推送，不更新 main，不合并、强推、rebase、删除分支、创建标签或自动发布。不得绕过 hooks／检查。

Owner 已授权主线直接安排已批准范围内的任务书；本次 Codex 不需要再索要任务书生成或执行确认。该安排不允许自行接手下一阶段，也不取消以下白名单和范围外限制。

## 2. 固定基线与开工检查

| 项目 | 指定值 |
| --- | --- |
| 仓库 | `lvlw/elevator-survival` |
| 工程起始 SHA | `6b48b3de6521d9a9c296754a4d8135c7f7c7ca35` |
| 只读来源分支 | `feature/design-world-infected-world-001` |
| 本项新建工程分支 | `feature/mission-lifecycle-core-001` |
| 下发时远端 main | `a76e9c1c998051fc1643b6e0c3d53443fa55feed` |
| 下发时远端工程分支 | 未存在；本地是否存在须 Codex 实查 |

主线只核验远端，不声称读过 Owner 的本地磁盘。输入包的 `BASELINE-AND-INPUTS.json` 保存本轮来源与关键 Git blob；它不是实时状态替代品。

### 2.1 写入前完成

完整读取输入包五文件，核对 SHA256SUMS 中四项校验。随后在实际仓库执行并记录下列命令的结果（命令可按当前 shell 等价书写，语义不得省略）：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git rev-parse --verify refs/heads/main
git ls-remote --heads origin refs/heads/main refs/heads/feature/design-world-infected-world-001 refs/heads/feature/mission-lifecycle-core-001
git show-ref --verify refs/heads/feature/mission-lifecycle-core-001
```

最后一条在新分支尚不存在时非零是预期探测结果，记录为“未存在”，不虚构成命令成功。检查 remote 时不得把 URL 中可能存在的令牌写入交付记录；只记录脱敏后的仓库身份。

确认没有进行中的 merge／rebase、他人未提交修改、同名分支冲突或同时写同一工作区的任务。若输入包被放入仓库内，不得混入提交；将本任务输入保留在仓库外再开始。发现非本任务改动时停止并报告，不自行 stash、reset、clean 或丢弃。

首次开工预期当前 HEAD 为指定基线。若 HEAD、远端来源／main 或关键基线对象与任务不一致，先报告准确差异，不自行选择新 SHA、拉取合并或改变本任务起点。同名工程分支已存在时不得覆盖；同一任务中断后恢复，只有能够证明它来自本任务、基线和当前改动归属均清楚时才继续，并重新检查状态。

核对 `BASELINE-AND-INPUTS.json` 的关键 blob，可使用：

```text
git rev-parse 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35:docs/05-design-decisions.md
git rev-parse 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35:docs/design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md
```

如本地缺少基线对象，可以只读 fetch 指定来源分支以获取对象；不得以 pull、rebase 或重置现有分支来“修复”状态。仍无法取得准确基线则报告阻塞。

### 2.2 由 Codex 创建分支

前项全部符合后，在干净的实际工作区执行：

```text
git switch -c feature/mission-lifecycle-core-001 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35
```

立即复核 branch、HEAD、status 和两类 diff。该命令是本任务已授权操作，不要求 Owner 手动建分支。本次不额外创建 worktree，不改现有 main 或设计分支指针。

### 2.3 必须建立真实生产基线

在任何生产代码写入前记录 Node、npm 版本并执行：

```text
node --version
npm --version
npm run test:run
```

如果依赖未安装，只允许按现有 lockfile 使用 `npm ci` 恢复依赖，不更新 package／lockfile、不执行依赖升级或 audit fix。遵守实际环境权限，不绕过安全机制。环境故障可做不改项目规则和配置的排查；测试基线仍失败则停止实现并报告，不把修旧模块并入本 Goal。

保存真实命令、退出码、测试文件数／测试数、跳过和失败。不得引用历史2153、004模型170、27项审查或文档49项作为本工程基线。

## 3. 必须读取的实际材料

### 3.1 规则与合同

先完整读取仓库实际 `AGENTS.md` 及目标路径适用的额外 AGENTS；按其要求读取 `docs/01-game-design-v0.1.md`、`docs/02-vertical-slice.md`、`docs/03-architecture.md`、`docs/05-design-decisions.md`，并定点读取相关 `docs/content/` 生命周期条款。重点是旧规则范围、DEC-049 的局部覆盖，以及 B1—B10 的全部合同。

同时读取 `docs/08-rule-implementation-traceability.md` 的本首核心记录、设计目录 `01-world-overview.md`、`10-decision-queue.md`、`readiness/02-source-gap-and-ownership.md` 和 `readiness/04-evidence-and-playtest-gates.md`。设计盘点用于定位，不替代实际源码；不需要从001起重读全部历史模拟。

原确认需要澄清时再定点读取003C／003D锚点，不重新打开已经选择的失败重接方案。Project Sources 可能是旧副本，本项正式依据是上述准确 SHA 的仓库文件。

### 3.2 复用与隔离检查

读取实际源码及邻近测试：

| 路径 | 本次阅读目的，全部保持只读 |
| --- | --- |
| `src/core/domain/run-identity.ts` 及其测试 | 复用 runId／seed／rulesVersion；明确现有工厂的 trim 与普通 Zod 解析不等于新边界严格恢复 |
| `src/core/config/` 的导出及冻结实现 | 复用现有 deepFreeze／DeepReadonly；不新建另一套全局工具库 |
| 若干邻近纯核心模块与其测试 | 遵循现有错误、输入校验、不可变结果、模块出口和测试组织约定 |
| `src/state/command-execution/stable-run-command-execution.ts` | 旧普通命令禁止切换 RunIdentity，不放松这项保护，也不从新 core 导入 state |
| `src/state/run-save/run-save-types.ts` 及 codec 相关绑定边界 | 确认旧 phase／保存不属于本项；不把窄恢复包装为浏览器存档支持 |
| `src/app/hospital-new-run-transaction.ts` | 确认不能用医院 New Run 创建角色后覆盖状态来模拟接续 |
| `package.json`、现有 TypeScript／Vitest 配置、`scripts/validate-architecture.mjs` | 使用实际脚本；不改配置来容纳越界实现 |

只读范围可为必要追踪适度扩大，写范围不得扩大。切换会话后重新读取，不把旧会话的符号猜测当作源码事实。本次不涉及 UI 修改；不得借任务重新设计交互或更新 UIR。

## 4. 精确写入白名单

白名单同时限定路径和用途，进入允许目录不表示可以加入范围外能力。

### 4.1 新生产代码与测试

**只允许新增 `src/core/mission-lifecycle/` 下本 Goal 必需的 `.ts` 文件**，包括模块内类型、严格校验、资格查询、纯转移、窄值恢复、必要 `index.ts`、同目录或子目录的 `.test.ts` 与测试夹具。

此目录由本任务首次明确授权，不是以前已有模块。开工确认没有不属于本任务的同名内容。最终结构由 Codex 决定，不要求按功能拆成固定文件数。

不修改任何既有生产 `.ts`／`.tsx` 文件；不新增根级公共出口，不改 `src/core/domain/` 或 `src/core/config/`。测试从本模块明确出口及合法内部测试边界访问，不为演示接入 application、React 或正式内容注册表。测试夹具与受控 harness 不得从生产公共出口导出。

### 4.2 允许最小同步的四份既有文档

| 精确路径 | 允许内容 |
| --- | --- |
| `docs/03-architecture.md` | 本模块实际路径、职责、导出和后续接线责任；只记本项实现事实，不新增玩法或全局保证 |
| `docs/08-rule-implementation-traceability.md` | 本项实际实现／测试及K矩阵证据入口，标明作者完成、待主线实审；保留后续NOT RUN |
| `docs/design-drafts/world-infected-001/01-world-overview.md` | 一个有日期的首工程进度附记与交付链接，整包仍Draft；不改写004历史结论 |
| `docs/design-drafts/world-infected-001/10-decision-queue.md` | 本 Goal 已执行／待实审的进度附记；不关闭后续未审规则或新内容事项 |

不为每个内部步骤新增状态文档，不全局替换“未实现／待审”为“通过”。旧日期记录保留为历史；新附记应明确本项最新状态，避免把文档归档时的“工程未授权”继续当成当前阻塞。

### 4.3 本项新增交付文件：仅以下八个

```text
docs/engineering/mission-lifecycle-001/implementation-notes.md
docs/engineering/mission-lifecycle-001/verification-results.json
docs/engineering/mission-lifecycle-001/completion.md
docs/engineering/mission-lifecycle-001/inputs/ENG-MISSION-LIFECYCLE-001-task-v1.0.md
docs/engineering/mission-lifecycle-001/inputs/OWNER-authorization-ENG-MISSION-LIFECYCLE-001-v1.0.md
docs/engineering/mission-lifecycle-001/inputs/AUD-6b48b3d-DOC-WORLD-ENTRY-001-review-v1.0.md
docs/engineering/mission-lifecycle-001/inputs/BASELINE-AND-INPUTS.json
docs/engineering/mission-lifecycle-001/inputs/SHA256SUMS.txt
```

`docs/engineering/mission-lifecycle-001/` 是本次指定的新工程记录位置，不是已有业务模块。五份 inputs 原字节归档，不改审查报告里原来的历史停止点，也不复制整个设计包或审查 ZIP。原合同继续是唯一工程规则正文；implementation-notes 记录实现映射和责任，不另创平行合同。

### 4.4 明确禁止修改

上述集合之外均只读，尤其：`docs/05-design-decisions.md`、`docs/07-decision-supersession-index.md`、首契约全文、旧医院 Freeze、UIR、Content、其余设计稿与历史 evidence／reviews；既有 `src/` 文件、`src/state/`、`src/app/`、`src/content/`、`src/ui/`、package／lockfile、tsconfig、Vite／Vitest配置、`scripts/`、CI、AGENTS、README及项目配置。

不上传或替换 Project Sources，不更改 ChatGPT／Codex 的全局配置。正常工具生成的忽略项如 node_modules、dist、缓存和增量构建文件只作本地环境产物，不纳入提交。因实际契约无法在白名单内交付时，停止该扩展并指出最小依赖，不自行豁免白名单。

## 5. 详细设计与实现要求

### 5.1 先完成内部需求复述，再在同一任务内实现

在 implementation-notes 中简要记录：目标与非目标、输入／输出、唯一事实归属、合法转移、严格恢复期望绑定、公开／受控／内部／测试出口、复用位置及K矩阵安排。

这不是新增 Owner 审批门槛。能够在已批准合同内解决的详细设计问题，自行给出有依据的选择并继续。只有实质改变玩法、生命周期含义、可信边界或必须修改范围外文件的情况才报告阻塞。

### 5.2 身份、声明与唯一事实

角色、世界、模板、具体委托、执行、规则／契约版本分别表达，不用标题、seed、版本变化或新runId制造新委托资格。活动和终止状态保留必要的同一次执行绑定；资格从这一份生命周期值派生，不另存可改closed／claimed清单或重复完成布尔值。

只读声明通过受控依赖注入。通用core不硬编码《封锁区·未完成的转运》的名字或世界ID，不引入任务供给器。需要验证“当前唯一委托关闭后列表为空”时，用隔离测试中明确声明的一份委托；异委托夹具只作K12等测试。不得把它们注册为玩家内容，也不为此创建新的生产rulesVersion。

可使用本窄值所需的格式标识、规则版本检查依赖或最小只读声明结构；它们不是新浏览器保存格式、完整规则配置或未来SDK。绑定检查不能全部从待校验对象自己反推期望值。

### 5.3 查询、首次建立、激活与继续

查询只读，不抽随机、取时间、生成身份、保存、通知或推进任何游戏后果。合法“无可接任务”与非法“缺事实／未声明／绑定错误”分开；缺记录不能默认为未接。

首次建立只用于受控的首次事实构造；首次激活只从合法未接前态生成一次活动后态。活动或终止前态再次激活必须拒绝。继续只认当前同一完整执行身份，不重新初始化，也不恢复任何资源。

角色生死、身体／装载资格、场景与日级条件不归本模块裁定。通过生命周期查询不等于玩家现在可以出发；首核心不以受控引用代替后续完整验证。

### 5.4 受控终止与不可变纯转移

区分成功、主动失败、期限失败及实际死亡导致的当前执行关闭；本模块只接收受控结果，不计算样本、设施、日期或HP条件。

先校验本模块全部前提，再生成完整不可变后态。未激活终止、跨角色／委托／执行终止、重复终止及改结果终止均拒绝，调用方输入及已关闭事实不变。不要用宽泛success布尔值或任意nextState作为公开命令入口。

重复终止的拒绝以当前已终止的权威前态为依据；纯函数对旧活动前态重算的确定性，不得冒充应用层已经防住并发重复提交或旧档回滚。

受控终止能力与普通资格查询／候选校验应在API用途、输入类型、导出及测试中清晰分责。具体表示由Codex设计；不得只添加“UI不要调用”的注释却开放通用状态写入器，也不预建完整终局协调器、权限平台或状态Store。

### 5.5 严格恢复、候选与安装权

严格检查根与嵌套字段、类型、合法身份、已知版本、独立期望绑定和状态组合。未知字段不能被剥离，缺值不能补默认，不类型强制转换，不通过trim修复非法身份，不静默迁移版本。复用旧RunIdentity前先通过本边界的严格检查，不改旧工厂。

恢复未接／活动／终止只还原同一语义，不自动激活。构造或解析一个合法候选不代表它有权覆盖当前已提交事实；API与返回值不能把恢复伪装成通用replace。禁止reset、reopen、恢复失败退空、换版本后从未接重新开始等旁路。

K19必须通过实际导出面和受控测试harness观察：已有关闭事实仍是正式操作依据，旁边解析的未接候选不自动替换它。测试不能仅写一个与模块无关的手工拒绝函数、或检查几个函数名字就宣称解决关闭旁路。

同时遵守B5的证据限制：纯函数不能从一份自洽值证明调用方从未丢弃历史；类型品牌、冻结和JSON解析也不是最新可信存档证明。不得为“证明全局安全”增加数据库、历史账、签名或持久化令牌。真正当前状态的唯一owner、首次／恢复安装权、跨全部委托活动唯一性、身份复用与合法终止结果产生，仍须后续实际接线验证。

### 5.6 纯核心、复用与后续统一提交

生产模块只依赖本Goal必要的纯TypeScript职责及现有Zod／冻结／身份能力。不依赖React、Zustand、浏览器、应用状态、具体内容、钱包、物品工厂、健康或日期结算，不引入新依赖。

不消费环境熵，不修改旧普通executor、医院New Run、Scene Launch、Daily Settlement、phase、保存或随机派生。新增模块可以被测试调用，但不被接入现有玩家命令或生产composition。

首核心输出是未来完整事务的窄组成部分，没有生产提交权。后续规则体系仍可在有序、确定性编排中提出计划，由唯一入口验证完整后态；展示／提交后订阅只读，不能异步补关闭、奖罚、身体或保存。本项不实现事件总线、通知或完整协调器。

## 6. 验收：原K01—K22及实际证据

以下22行按固定基线首契约B8保留，是验收条件，不是预设测试数量或已经执行的结果。本轮须给每行对应的实际测试名／文件或接口审查证据，并明确该行后置部分。

| 编号 | 验收输入／动作 | 必须观察到 | 证据层 |
| --- | --- | --- | --- |
| K01 | 合法未接前态及已声明绑定，重复查询 | 首次生命周期资格稳定，输入不变 | 首核心单元 |
| K02 | 从合法未接前态首次激活 | 仅生成一个完整活动后态，绑定该执行；无熵、保存或其他副作用 | 首核心单元 |
| K03 | 活动态再次激活，使用相同或不同执行编号 | 均拒绝，不刷新状态 | 首核心单元 |
| K04 | 同一活动执行继续与错执行继续 | 前者只读成立，后者拒绝；不创建新初态 | 首核心单元 |
| K05 | 分别提交成功、主动失败、期限失败结果 | 每种合法结果均形成唯一终止事实；随后拒绝重接 | 首核心单元，结果来自受控夹具 |
| K06 | 活动执行接收实际死亡结果 | 当前执行关闭；不复活、不改写其他已终止结果 | 首核心局部；跨全角色接线另验 |
| K07 | 未接时终止、终止后重复／矛盾终止 | 明确拒绝，原终止事实不变 | 首核心单元 |
| K08 | 关闭后换执行编号、种子、标题或显示名称 | 不产生新资格；未被接口接受的字段须严格拒绝 | 首核心与导出面审查 |
| K09 | 替换角色、世界、模板、具体委托、规则或契约版本 | 与声明／期望绑定不一致则拒绝，不能重置为首次 | 首核心严格负例 |
| K10 | 以部分交付、旧设施、历史任务件或保管理由请求重开 | 接口不提供旁路；这些理由不能改变终止事实 | 首核心与接口审查，不搭相关生产系统 |
| K11 | 唯一真实委托已关闭 | 合法可接列表为空，不生成任务、不返回角色死亡判定 | 首核心查询 |
| K12 | 同世界下独立显式声明的异委托测试夹具 | 按各自具体委托事实判断，不因同世界一律封禁 | 测试夹具，禁止注册玩家内容 |
| K13 | 未声明的任意新委托 ID 或缺失生命周期值 | 拒绝，而非当作新内容或“从未接过” | 首核心严格负例 |
| K14 | 未接／活动／终止合法值恢复 | 得到同一语义及绑定，不自动激活或改变资格 | 窄值恢复 |
| K15 | 根／嵌套缺字段、多字段、错类型、非法身份及版本 | 严格拒绝；不丢字段、不转换、不补值 | 窄值恢复负例 |
| K16 | 状态与执行／终止结果矛盾、交叉引用 | 严格拒绝；不修复为合法前态 | 窄值恢复负例 |
| K17 | 激活、查询、终止、恢复接收冻结输入 | 不修改调用方对象或受控只读声明，输出满足不可变契约 | 首核心单元 |
| K18 | 合法闭环：初始化→查询→激活→恢复活动→继续→终止→恢复终止→再接 | 仅在活动阶段可继续；最后再接拒绝，无重复事实 | 首核心组合测试 |
| K19 | 在已有关闭事实旁另造未接候选 | 构造／解析不形成替换权；正式操作仍使用关闭事实；无公开重置替换入口 | 接口和受控 harness 审查；不冒充跨存档证明 |
| K20 | 检查模块依赖与导出 | 无 React、Zustand、浏览器存储、钱包、物品工厂、日期结算、身份熵或事件总线；无 UI 任意成功入口 | 实文件审查及适用自动检查 |
| K21 | 全量旧医院回归与范围检查 | 旧身份、普通命令、phase、保存及随机意义保持；无新生产内容注册 | 本轮真实 npm 检查及准确 SHA diff |
| K22 | 说明跨委托活动唯一性、可信恢复安装及完整终止事务 | 责任明确，未接线事项保持 NOT RUN，不包装成第一核心已保证 | 契约审查；后续真实接线门槛 |

### 6.1 测试执行要求

- 在实现前明确主要正例与负例的预期；实现失败时修代码或合法测试构造，不把原本应拒绝的输入改成允许来获得绿灯。
- 表驱动覆盖身份／版本各轴、不同终止结果和嵌套未知字段。测试应断言具体拒绝类别及输入不变，不能只接受任意异常作为全项通过。
- 至少用一条通过模块出口的完整K18组合链，包含活动恢复与终止恢复；不同阶段重复查询不改变值。同一输入重做产生语义一致结果。
- K15包含与实际表示对应的根／嵌套缺字段、多字段、错类型、空白／非规范身份、未知版本；集合存在时才增加重复／冲突引用负例，不为了测试凭空加集合。
- K19检查实际候选／受控转移边界与公开出口；测试harness不得成为生产状态owner、公共调试入口或第二份关闭账。不能用大范围类型断言、any或跳过运行时验证来伪造受控输入。
- K20除适用架构检查外还须实际审阅导入、导出及副作用。合法固定测试身份不从系统时间／随机生成；没有调用某个注入spy不代表已证明整个浏览器没有副作用。
- K21采用本轮真实全量检查与准确SHA diff；不能只跑新增模块。K22交付后续责任映射，不实现后置体系来凑通过。

详细测试函数命名和文件数量自主决定。不设最低测试数，不把参数化展开、重复跑或旧套件数量累加成新增能力。

## 7. 一次完成的工作流程与质量检查

### 7.1 内部执行顺序

基线核验与新分支 → 真实生产测试基线 → 输入归档与需求复述 → 窄接口／校验设计 → 实现与针对性测试 → 反例／导出面自查 → 修订 → 真实全量检查 → 文档最小同步与范围检查 → 普通commit／push → 最终报告与停止。

不要在查询完成、激活完成等内部节点停下来要求Owner发下一条任务。必要的工具执行权限提示仍按实际环境处理，不绕过权限。

### 7.2 自查组织

至少进行一次区别于编码顺序的反例自查，重点审B4／B5、K09／K13／K19及新旧隔离。工具支持时，可使用至多两个只读辅助审查，分别核对“合同／身份／恢复”和“导出面／副作用／范围”；它们不写入、不递归派生任务，根执行者负责修订、测试与Git。

无可用辅助工具时自行进行明确记录的第二遍审查，不因此要求Owner另开会话，也不把它写成独立主线审查。作者与辅助审查均不能宣布自己的最终SHA已经获主线通过。

### 7.3 实際命令

开发期间跑针对性测试：

```text
npm run test:run -- src/core/mission-lifecycle
```

完成实现、测试和文档后，按实际package脚本执行：

```text
npm run check
git diff --check
git diff --name-status 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35
git ls-files --others --exclude-standard
```

固定基线的check包含 architecture、typecheck、test:run、build。不得用四项中部分成功冒充整条成功；新增模块若违反架构检查，修正实现，不改检查器或关闭规则。任何最终代码修改后重新执行对应测试及完整check，不复用修改前的全绿结果。

另外执行并记录：全部变更（含未跟踪文件）对第4节白名单的检查；全部既有生产文件、DEC／首合同、保存／UI／内容／依赖／CI与历史证据相对基线未改；新增文件严格UTF-8；实际修改文档的新增／变更链接和锚点；inputs五文件原字节与清单一致。

阅读新增生产核心文件，确认没有环境随机、时间取熵、浏览器调用、异步补结算或运行时内容注册。固定基线的架构脚本只是适用自动检查之一，不能单独证明所有边界。

本项不要求浏览器、真实存档恢复、Owner试玩、完整世界模拟。全部保持NOT RUN／未接线，不为了“体验验收”临时加入演示按钮或存档。

## 8. 交付文件要求

### implementation-notes.md

集中记录需求复述、实际结构与公开／受控／内部边界、生命周期转移图或表、严格输入与独立期望绑定、候选不具有安装权的实现方式、只读依赖、错误语义及K01—K22到测试／源码的映射。

单独列“后续接线责任”：唯一当前事实owner、受控首次建立／恢复安装、跨全部委托的活动唯一性／身份复用、实际终局结果产生、完整事务、浏览器保存和版本兼容。说明本模块能保证什么、不能保证什么，不把责任表当作后续模块已经存在。

### verification-results.json

记录实际环境、起始SHA、分支、命令与退出码、基线／最终测试数量、针对性运行、全量check各阶段、K映射结果、范围和输入完整性、失败与修订、作者／辅助证据区分及NOT RUN。可以记录运行中真实文件行号或符号，不复制长篇历史结果或全部测试输出充体积。

临时检查脚本允许放仓库外执行；交付记录须说明具体检查方法和关键命令，不只给一个无法解释的PASS数量。生产回归可由仓库实际测试再次运行。

### completion.md

先给一页摘要：交付能力、未接线内容、真实基线与最终检查、变更文件、新增测试数及统计方法、发现和修复的问题、剩余项与停止点；详细内容指向上述两文件。

仅能写“作者完成、已提交、待主线实审”等真实状态，不能把本轮生产代码标成主线PASS／完整Design Freeze。旧文档首契约正文保持原字节，不因进度更新而改写B1—B10或K矩阵。

同一提交中的报告无法自包含最终commit SHA时，准确记录起始SHA并注明最终SHA在提交后消息中给出，不为此循环amend或伪造未来结果。

## 9. 提交、推送与提交后核验

本Goal范围内实现、相关测试和最终check全部符合要求，且没有未解释阻塞后，可以普通提交。推荐一次清楚的完整提交；需要范围内修订时可用普通追加提交，不改写已推历史。

只暂存第4节明确路径；不要用不经检查的全仓 `git add -A`。暂存后执行：

```text
git diff --cached --check
git diff --cached --name-status
git diff --cached --stat
```

再次核对白名单、输入原件和没有漏掉新增测试。检查后提交，例如：

```text
git commit -m "feat: add mission lifecycle identity core"
git push --set-upstream origin HEAD:refs/heads/feature/mission-lifecycle-core-001
```

只推上述一个明确引用，不push全部分支／标签，不推main或设计分支。推送拒绝、远端意外前移或hooks失败时报告，不force、不rebase、不换分支偷推。

提交后记录并核验：

```text
git rev-parse HEAD
git branch --show-current
git diff --check 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35 HEAD
git diff --name-status 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35 HEAD
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git ls-remote --heads origin refs/heads/feature/mission-lifecycle-core-001 refs/heads/feature/design-world-infected-world-001 refs/heads/main
git rev-parse --verify refs/heads/main
```

确认最终SHA与远端新工程分支一致，原分支／main没有被本任务修改；如果远端被其他人推进，报告实际观察与本任务推送范围，不谎称它们未变。CI没有实际读取就写NOT CHECKED；本地check不等于远端CI通过。

若有未通过检查，保持工作区可审查并报告具体阻塞，不把半成品按“已完成”推送，不丢弃改动。已获普通commit／push权限不等于必须隐瞒失败以用完权限。

## 10. 完成后给 Owner 的最终消息格式

开头采用下面的结构，填真实结果即可，不要求Owner自己从长日志提取SHA：

```text
ENG-MISSION-LIFECYCLE-001：COMPLETE 或 BLOCKED（按真实结果）。

起始SHA：<完整SHA>
最终SHA：<完整SHA；未提交则明确未提交>
分支：feature/mission-lifecycle-core-001
commit／push：<真实结果；远端是否匹配>
工作区：<实际status与普通／cached diff>

交付：<首核心实际能力；不接玩家入口>
测试基线：<实际命令、文件数／测试数、退出码>
新增测试：<实际数量及口径>
最终check：<各阶段实际结果>
K01—K22：<本项证据状态及后置NOT RUN，详细映射路径>
未完成／冲突／越界：<无或具体内容>

报告：docs/engineering/mission-lifecycle-001/completion.md
证据：docs/engineering/mission-lifecycle-001/verification-results.json

已停止，等待主线对最终准确SHA的实文件评审。
未合并或推main，未自动进入下一工程。
```

本任务到此结束。不要生成下一份生产任务并自行执行，不让Owner重新确认本Goal内部已授权的小步骤，也不要把“工程完成”解释成已经可以试玩新世界。
