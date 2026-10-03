# G1-R1：准确提交专项源码复审

> 审查标识：AUD-942b2d9-ENG-RESIDENCE-ENERGY-CYCLE-001-R1 / v1.0
> 日期：2026-10-04
> 结论：**PASS。F01关闭；G1在942b2d9所代表的当前限定实现通过源码准入实审，可以进入单独下发的G2。**
> 不将9bbf5aaa原提交追认为当时通过；不代表完整新世界、真实保存、发布或Owner试玩通过。

## 1. 决定与玩家含义

R1修复了唯一要求返修的“纯查看进入行动效果计划”缺口。`view`仍可查询，但公开执行请求、执行schema、Completion及provider返回结构均不再接受它。`planResidenceAction`先解析执行请求，再检查当前上下文、计算revision并调用provider；因此view不能生成可提交noop、身体后态或死亡计划。

查看本来正确的只读路径没有被删除。整理、已揭示物拾取、药食四类免费可执行动作仍保留G1的局部资格；实际目标、容量和资源等仍由对应规则负责。没有通过禁止所有免费行为、删除回归或把保护推给未来UI来解决问题。

结合原G1完整源码评审中其余职责的有限结论，本轮关闭F01后，当前G1可作为后续持续现场工程的基线。首身份核心的原PASS、DEC-050、已批准G1契约和O2补充合同保持原身份。

## 2. 固定基线与远端

| 项目 | 本轮实际核对 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| R1起始／直接父SHA | 9bbf5aaa0828b3144949ec6a01a76bb3ba06eceb |
| R1最终SHA | 942b2d93916c649f4c2ec6cd399035151269d2ca |
| commit tree | 27995aee63ddcba9703d18e47641e605b418da3f |
| 工程分支 | feature/residence-energy-cycle-core-001，指向本轮最终SHA |
| main | a76e9c1c998051fc1643b6e0c3d53443fa55feed |
| entry-002设计分支 | 9dfe21ef7f423c1e5d9801d26e4425b28444cf63 |
| 原世界设计分支 | 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35 |
| 首身份核心分支 | d1d3b7927c6733cff709a4bfd617fb1e85e7485a |

以上来自本轮GitHub连接器的提交对象和远端引用。工作区干净、普通push实际退出码以及用户磁盘上的临时日志是Codex交付证据，主线没有访问E:或C:磁盘。

## 3. 本轮读审范围

完整读取四个变更生产文件：residence-energy/{types,validation,energy,index}.ts；完整读取energy.test.ts，读取energy-cycle.integration.test.ts新增用例、上下文构造及保留回归的相关段落。另核对全部15条变更路径、四份文档附记、实施／完成记录增量及verification-results.json的R1区。

完整读取输入包原R1任务书和前置审查报告；按准确SHA读取AGENTS与DEC-050。原G1未变的周期／配置等完整读审沿用前次报告，不声称本轮重新逐行审查全部旧源码。

变更为原任务允许的13个修改文件和2份新增原件；生产修改仅四个residence-energy文件，另外两份测试修改。没有修改周期生产文件、residence-config、唯一content参数、mission-lifecycle、旧医院、state/app/UI、保存、依赖或正式玩法条款。保护依据是精确提交的变更集合；701个对象逐字节保护、四文档原前缀和全量diff检查仍区分为作者检查，不冒称主线完整clone复跑。

## 4. F01关闭依据

### 4.1 类型及运行时

- `types.ts`：FreeResidenceAction只含organize、revealed-pickup、medical、food；ResidenceQueryRequest额外包含view。ResidenceActionRequest和ResidenceCompletion的request保持可执行集合。
- `validation.ts`：actionSchema不含view；querySchema组合actionSchema与严格view/free0分支。completionSchema引用actionSchema，providedSchema引用该completionSchema，执行完成事实不能被provider改名成view。
- `energy.ts`：queryResidenceAction使用查询constructor；planResidenceAction第一条实际语句调用执行constructor，严格拒绝在provider及revision计划之前发生。独立trigger分支没有为了此次修复被删掉。
- `index.ts`：新增查询constructor及查询类型导出，原查询／行动／trigger入口保持，不新增allowEffects、force或isQuery旁路。

### 4.2 真实回归覆盖

新增测试通过实际公开index、实际配置与mission scope，不mock Zod或周期校验。覆盖view的E0/E1、mutable/deep-frozen、重复查询、零效果／抛错／损血provider均0次调用且无计划；测试专用acceptPlan没有被冒称真实Store。

四种周期上下文active／first-ready／return-due／deadline-ready均验证查看只读、误投行动／周期／trigger入口拒绝。还覆盖provider将organize完成事实改成view、请求多字段旁路、旧revision失效以及合法E0独立触发后果。

原“E0 free view可执行”参数行被纠正：新增25项展开测试、替代原错误行1项，净增24；四种合法free行强化但不算新测试。全部原G1定向集合当前为169项，不将多次运行累加。

## 5. 执行证据分层

| 证据 | 本轮核对及限制 |
| --- | --- |
| 作者R1基线 | 110文件／2401项；已读取R1记录，非主线容器执行 |
| 作者原生6项探针 | 未改full-api-probe；修复前4/6、exit1，修复后6/6、exit0。读取仓库记录中的摘要和指纹；没有直接取得作者C:临时原始结果 |
| 作者最终check | 110文件／2425项，架构、类型、构建通过；定向5文件／169项 |
| 远端CI | 本轮读取CI #130，run 37143698990、job 111263210732的metadata、steps和完整decoded log；checkout恰为942b2d9，50 DEC／235 core，类型检查、110文件／2425项及构建通过 |
| 主线独立静态核对 | 四份变更生产源码Git blob逐一匹配；运行10项AST／源码结构检查，10项通过，检查的是schema引用、类型集合及调用顺序，不是生产单元测试 |
| 主线原件核对 | 本包R1任务书与前置报告的真实字节、SHA-256、Git blob匹配准确提交reviews目录的对象 |
| 主线本地npm／原生API探针 | NOT RUN。容器clone实际exit128：无法解析github.com；没有仓库Zod／Vite／Vitest依赖，不用替代校验器冒充原生API执行 |
| 真实新保存／浏览器／Owner试玩 | NOT RUN／未接线；不以既有医院UI测试替代新世界体验 |

CI安装过程仍报告依赖告警（2 moderate／2 high）、既有chunk及Actions运行时弃用告警。本轮没有新增依赖审计、修复或可利用性评估，不宣布发布安全通过。

## 6. 主线可复核文件

附件保留source四份源码、source-manifest.json、verify-structure.cjs、structure-results.json、archive-checks.json、ci-observation.json和clone.log。源码由连接器全文重建，只有Git blob一致后才用于静态检查。

| 文件 | Git blob |
| --- | --- |
| types.ts | 95985ce05f59907d3f7aeb193bf0b73595900717 |
| validation.ts | f7d617cabb99d98f2fcd98335b7f291d04b903d9 |
| energy.ts | 8fffac9a7d14c19cfb4c10b0fe50711e66ee847f |
| index.ts | 8b824d7147323ed149cf2adbb8de66e1e7c3bac7 |
| R1任务原件 | 152ea8e5523fffa71fb89f01b4162430d8787758 |
| 原9bbf5aa审查原件 | 93dbc8cac342ec66bb7f51a9b5c920efbecfd4ca |

静态脚本使用当前容器TypeScript 5.8.3解析语法，不是项目TypeScript版本的完整typecheck；项目typecheck证据来自准确SHA CI。ci-observation.json为核对摘要，不是原始日志副本。

## 7. 后续推进

无本轮必须返修项。由主线按Owner已有O2采纳及任务下发授权，直接下发ENG-RESIDENCE-LOCATION-001（G2）：连续位置、最小持久现场、真实实例迁移和安全知识查询的一个完整工程Goal。

G2从本轮准确最终SHA新建独立分支；仍不合并main、不推设计或旧工程分支，不自动G3。真实地图费用、医疗／装备／专长、完整终局与发布兼容没有在本次补批。G2只使用明示受控测试内容，不能把“持续现场”完成写成五图全部可玩。

本报告在当前会话交付，不自动修改仓库、Project Sources或ChatGPT项目配置。原文档中的“待复审”是该提交时状态；后续工程只追加本次PASS指向，不倒改历史。
