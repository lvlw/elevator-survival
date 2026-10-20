# DOC-WORLD-QUERY-001 准确 SHA 文档实审 v1.0

## 1. 结论与适用范围

**PASS：三份确定载荷已按批准字节安装，归档及同范围入口附记符合本轮文档任务；无需返修。**

受审提交：`8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3`
父提交：`7a3acd3855aefdde68fdaed13ebe037f3e9bd6de`
Tree：`758c5cf11eb3ae15c543b50f30a7e4f5a703f38c`
分支：`feature/world-route-acceptance-001`

本结论只核准这项文档交付。此前预算任务 F01 关闭、路线异常 F02 保持；不把旧未确认、失败或 DRAFT 的历史倒改。原字段矩阵 3 supported / 12 partial / 9 not-supported 是基线支持记录，**不是本次已实现24字段**。查询工程需由另行任务书授权；本轮未修改玩法、运行时、存档或玩家入口。

## 2. 原件与正式目标的独立核验

主线读取当前已挂载的原 `DOC-WORLD-QUERY-001-Codex-Package-v1.0.zip`，而非按聊天重建载荷。原包10件的 SHA256SUMS 列另9件，清单自身按实际字节另算。

实际执行：

- 原 `verify-doc-package.py` 包内模式：25项 PASS。未运行其完整仓库 `--repo` 模式。
- 独立从10件原文件计算 Git blob；与受审SHA中10件归档blob逐项一致。
- 独立计算3件正式目标的SHA-256/Git blob，与原载荷和准确远端目标一致。
- 将原10件按真实目录结构生成Git tree，结果 `cc83039fdc5814fe1f989520c50d40a9d5f0cc8d`，与准确提交完整归档目录一致。

独立对象核验为14项；与25项包内检查有重叠，不相加包装成新增验证或游戏测试。

| 正式目标 | SHA-256 | Git blob |
| --- | --- | --- |
| player-query-contract-v1.0.md | 3d265ed41ba57a652b7295ce38f500d16fa8b073f96626cfca138be3e01f3623 | ac00f8dde4932e710e3dd4b06cd15d3f82dfa0ca |
| player-query-field-contract-v1.0.json | bb5863b5cbd7330d05b4c633128523194caf7c4f1d0841cc28fcbe29aac9436f | 72a1e8ebb27f04f0c7a23b709148eff469d73d44 |
| player-query-engineering-contract-v1.0.md | f0e84315d28afb5357a64d1a7c43efb6ed43e8818765fbf157c1469a52909f5e | e0ba4059c25a13798937631366149815c0d3ca0e |

三份正式文件与各自 archive/approved-documents 副本是同一blob，未发现润色或偷加条款。

## 3. Git与入口审查

实际读取 commit metadata、patch、Git commit/tree与远端同名branch：SHA、parent、tree一致。23条路径均在原任务白名单，全部位于docs；8份已有文档为末尾附记，15件新增为3正式目标、2作者记录和10原件。

主线阅读附记diff并核对其状态／链接目的：它们把同范围技术候选指向三份正式目标，保留原DRAFT／失败／检查时间点；没有把原矩阵24项升级为生产PASS，没有新增DEC／UIR或开工内容。八份原正文完整字节前缀的逐件重跑仍属于作者证据；本轮主线不冒称执行了该完整前缀脚本。

直接对照父与子提交根目录Git对象：除docs外全部根对象相同，尤其 `src` 均为 `e1748311775dccaf47db1e1d256652e156467ac3`；package、lock、CI、scripts、TS/Vite配置和AGENTS相同。未取得Owner磁盘，工作区干净及其他远端分支在作者操作前后的不变性属于作者交付记录。

W01继承原两份输入七行限定硬换行。当前增量未修改这两份文件；作者报告增量exit0、累计exit2。本轮没有在完整Git checkout中重跑累计diff检查，不把作者记录改成主线执行。

## 4. 技术合同语义审查

三份批准原文完整读取，24字段、四领域phase／五完整停点和Setup/no-current/blocked边界一致。现行UIR速查已读取；地图仍只读，原相对敌阶段／时序、分级交互和unknown约定继续优先，不引入统一弹窗或全图导航。

审定边界明确且未被附记改变：

1. 身体、实物、来源、敌人、任务、钱包和历史仍为P/R/S唯一事实；不能将raw current JSON删几个顶层键后交玩家。
2. opaque selector只作对象引用，不从seed/execution/origin或其编码派生，不是行动authority；读操作不隐式更新表。
3. current、phase、battle或恢复改变后旧句柄不能误指向新对象；保存失败显示最新内存，纯retry保持对象选择意义。
4. 安全资格／费用复用或窄抽取实际纯owner，不执行计划／生产者／resolver来试探隐藏结果。
5. 资料没有正式公开依据的字段只能明确unknown并保留进入UI前责任；不把unknown当safe，不编新感染或敌人阈值。
6. 未授权UI、浏览器存储、多标签、O3、依赖升级或第二委托。

没有发现需要修改批准载荷或重新交Owner选择的本轮文档冲突。

## 5. 为下一工程实查的必要接缝（不是本轮实现验收）

在同一准确SHA读取并定点核对：
- `src/state/residence-session/combat-session.ts`：current唯一替换、写入、通知、冷恢复与retry顺序。
- `src/core/residence-combat/queries.ts`：现有安全查询是局部输出，action仍含内部目标selector。
- `src/core/combat/combat-selectors.ts`：已有正式公开敌阶段函数 `selectEnemyHealthPhase`；应复用而非为新敌人另设阈值。
- `src/core/residence-location/movement.ts`、`supply-knowledge.ts`：单边资格及调查知情边。
- `src/core/residence-task/shared-actions.ts`、`shared-sources.ts`、`transfer.ts`：资格、工具／材料消费与生产步骤仍部分内联。
- `src/core/residence-supply/shared-medical.ts`、`shared-maintenance.ts`、`shared-inventory.ts`：有真实目标／材料／身体效果；查询不能直接调用这些完整生产函数。

上述事实用于下一任务精确白名单与保护要求，不是把本轮文档PASS等同于新查询已安全。下一任务应允许必要的纯资格窄抽取，并用新的玩家入口与旧诊断入口分离；不得以保护旧文件为由改用试跑生产者。

## 6. CI与执行证据分账

准确SHA的 **CI159 / run39458623851 / job118751927647**：本轮首次读取为in_progress，随后读取run与job均为completed/success；安装、architecture、typecheck、test:run、build各步骤成功。

本轮未下载CI159完整日志重新统计测试数；不把历史4318数字冒称为本轮日志逐项核验。作者本地的生产test/typecheck/build是NOT RUN，远端自动CI成功不能倒改这项本地记录。

主线容器曾尝试通过精确GitHub API取得提交供程序化读取，DNS解析失败。因此未取得完整仓库，未跑npm或原生路线。可用证据是实时GitHub连接器原文件/元数据、原包字节计算及包内25项检查。

作者52项仓库脚本、55处链接／锚点、1407项范围外字节、architecture及本地diff结果保留为作者证据；本轮没有完整独立复跑。

## 7. 推进与停止点

文档可作为 `ENG-WORLD-PLAYER-QUERY-001` 的正式依据；另行完整工程任务可以下发。完成一次安全查询／同源资格／受控选择目标后即准确SHA实审，不自动进入UI、浏览器或O3。依赖审计与bundle维护仍独立保留，不能借本轮顺便升级。

来源定位（准确SHA）：
- Git提交：`https://github.com/lvlw/elevator-survival/commit/8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3`
- 正式合同目录：`docs/engineering/world-integration/player-query/`
- 文档原件：同目录 `adoption/inputs/`
- CI：`https://github.com/lvlw/elevator-survival/actions/runs/39458623851`

证据包内包含原包、包内检查结果、14项独立对象核验和仓库/CI观察摘记；观察摘记不是完整API日志原字节归档。
