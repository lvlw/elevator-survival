# WORLD-ENTRY-006 完整任务书 v1.0

## 0. 目标、授权与停止点

**这是首个可玩入口的设计／接入合同任务，不是生产实现，不重开完整世界设计。**

一次完成：新世界当前身体提示的知识边界与必要待审选择；安全查询到低资产界面的完整操作和刷新合同；浏览器冷启动／持久化与独立恢复材料合同；旧入口／旧槽的发布处理选项；集中 Owner 审阅页和最近工程批次候选。允许在本任务内运行仓库外原生探针与只读检查、自查修订、普通 commit／push。

- 正式仓库：`lvlw/elevator-survival`。
- 起始完整 SHA：`394f59d3c5df2a65ce87186e8988982d76784a71`。
- 其父 SHA：`8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3`。
- 起始 tree：`0431a7f73abe7ce99c070887f6872489007175f0`。
- 从上述 SHA 新建：`feature/design-world-entry-006`。
- 不在原 query 工程分支、旧设计分支或 main 交付。

本任务由 WebGPT 主线按 Owner 已授予的任务下发权限形成，不冒充 Owner 新原话。主线已对查询工程完成限定准确 SHA 实审 PASS；这个 PASS 不等于感染新知识、浏览器保存、UI生产开工或 O3 已批准。本任务只生成候选，新增玩法／玩家知识／发布兼容承诺仍需 Owner 采纳，正式落文及生产另行下发。

完成后给出最终准确 SHA，停止等待主线实文件审查；不得自行归档为正式条款、编写生产实现、发布试玩页或进入后继工程。

## 1. 开工材料、状态与证据分层

Owner直接发送本 ZIP，无需人工解压。由你定位附件并在仓库外解压，读取5文件，核对4条 SHA256SUMS 及清单自身字节。将原件归档到本目录 inputs，保持原字节。

设计会话的旧记忆／旧分支已经过时。重新检查实际 HEAD、branch、status、普通／cached diff、远端引用和本任务分支是否存在。非本任务改动不得 reset、clean 或强制覆盖；已有同名分支时先查来源，不另造相同任务重复交付。

读取实际 AGENTS 要求的 GDD、Vertical Slice、Architecture、DEC、相关 Content 和 docs/09-ui-design-record 当前有效速查及有关 UIR。额外必读：

- docs/engineering/world-integration/player-query/ 三份已实审正式合同；implementation/ 的接口、字段、完成和验证记录。
- src/state/residence-session/player-* 的实际新接口，原 combat-session/composition/persistence/expectation、shared domain 及 v4 reader/codec/policy/expected。
- E03-A路线、查询合同历史与 first-play-and-release-gates；仅定位相关范围，不从头逐包重审世界设计史。
- 旧应用 bootstrap／保存端口／UI 已有实现；确认能够复用什么、什么仍是旧医院语义，不能直接套用。

本任务开始时记录 git 精确来源和环境。设计任务不要求以一次历史全量测试数冒充本轮基线；实际新探针及任何定向测试分别记账。默认全量 npm check 若运行也须写真实结果，未运行明确 NOT RUN。不要为了设计 task 修改测试预算、并发、依赖或 CI。

## 2. W1：当前身体提示与真正待审选择

### 2.1 先盘点已批与缺口，不自行补规则

查询已有23项公开映射；感染阶段明确 unknown，消毒剂／抑制剂隐藏目标的 Preview 也保持 unknown。按实际代码与有效条款逐项列：当前玩家可知事实、只允许内部使用的事实、现有公开 owner／metadata、尚缺正式映射的字段，以及该缺口影响哪一步玩家操作。

区分：HP、流血、公开伤口、饱食、精力、已用日额；已发生的可观察暴露事件；潜藏暴露／infectionProgress；疾病阶段与未来日结结局。不能把内部进度或未发生的日结结果直接转为文案、颜色、图标、排序或可用按钮差异。不能把旧医院终末规则移植到新世界 HP0 死亡制。

### 2.2 给出最小推荐及代价

若现有规则已足够，形成不新增知识的实现解释，不人为凑 Owner 决策。若确需公开阶段或新增提示，应提供一份主推荐、必要备选和真实代价；推荐条款写成清晰 DRAFT，绑定来源和所需覆盖范围。具体阈值必须来自已有批准配置或明确列为新增待审，不能因现有内部阈值存在便默认公开它。

允许保守显示当前机制与未知，但不得把缺口永久隐藏或把 unknown 宣称 safe／必死。消毒与抑制的显式行动成功／失败属于实际执行观察，与纯查询非干涉区分；不要作现有规则无法支持的“玩家通过任何行为都绝不可能推知隐藏状态”承诺。

推荐的提示应能支撑玩家判断是否止血、休整、继续探索、返回或明确尝试医疗；不能输出一屏开发诊断，也不替玩家决策或自动治疗。

## 3. W2：首个低资产可玩界面的实际流程合同

### 3.1 延续已批 UIR，不重选美术方向

按当前 Stage-First、只读知识地图、单边 Travel Cluster、背包／快捷位、分级确认和场景／战斗舞台规则，给出状态—视图—操作表与必要的文字线框。复用实际已有资产的可能性先核查；没有素材的五图可用受控低资产占位，不要求 Owner 先准备新贴图、音频或最终角色画。

这不是统一大弹窗、密集 debug 控制台、自动寻路或无限按钮列表任务。UI仅读安全查询、提交明确选择；不从 raw current / getState 补洞，不重算资格、奖罚、库存、疾病或隐随机。

### 3.2 覆盖完整入口和退出

至少设计：无档 Setup（工具／专长确认）；真实初配与出发；稳定世界搜索／地面／真实容器／任务／维修／药食；完整战斗决策点；主动失败／成功／期限／死亡；保存失败；坏档阻止加载；生还中枢无后继。四领域phase与五合法停点、无current应用态继续分开。不复制委托，不把无内容判死亡，不把静态中枢做成自动跨日。

必要数量、坐标、旋转、材料和目标不得被悄悄代选。本批只定稿候选；沿用的已批 first-fit 也须说明适用普通拾取边界，不能扩张到任务生成／多边移动／材料自动替换。

### 3.3 明确真实更新时点

特别审读 player-facade/player-queries：原生 write／notify 回调中的玩家视图会 blocked；execute 返回后才同步上下文并取得 ready。提出一套明确刷新方案，优先消费显式返回值／受控同步，不把当前 subscribe 当成已完成 React Store。区分原生玩法通知、Presentation 更新和持久化反馈，不能为刷新界面追加第二次 S dispatch、关委托或保存。

旧句柄在新current后失效；Hover/Focus/Preview仅只读，不重建映射；retrySave不改变当前对象选择意义。成功提交但视图构造失败、双击、正在执行时回调、旧弹层和旧目标的处理顺序须明确。新 UI不得悄悄刷新旧command使之变成另一笔有效意图。

## 4. W3：浏览器启动、保存与发布选项

### 4.1 候选外恢复材料必须有真实落点

当前 v4 是 headless 字符串 codec + 唯一S，而不是已经完成的浏览器自举。逐字段回答：新角色／具体委托／execution／seed／版本／初始选择材料在哪里生成；什么属于可信批准内容；哪些最小已留存启动材料独立于待恢复 candidate；冷启动在读取候选前如何固定 expected；同进度 committed 在何处持有。

不能从刚读到的 v4 state、origins、closure 反推 expected 然后自证；也不能假设另有云端 Profile、签名服务或永久第二份完整状态。浏览器客户端自身的数据可编辑，不应声称解决了全局防作弊或外部可信根。给出本批明确威胁模型、损坏检测与支持边界。

若需要保存初始化小记录、独立清单、generation或外层 envelope，具体结构只写技术候选，不改现有 v4 或承诺迁移。解释如何避免这些数据成为第二身体／钱包／任务生命周期真相，以及部分写失败／元数据不一致时如何拒绝重发初配。

### 4.2 真实 IO 与 writer 责任

给出一种主推荐存储方式及必要对照，按照实际同步S端口和浏览器错误模式讨论；不擅自引入依赖、后端账号或把多个异步监听器变成多个writer。明确首次写入失败、读取失败、写配额／权限失败、刷新／进程终止、更新中断、旧成功字节与新未落盘内存，以及重复加载／恢复禁止重放。

进程内 domain 不等于跨标签互斥。给出后续实际要验证的第二标签行为、占用/抢占/释放/崩溃边界和保守阻止策略；不能只观察一个localStorage字段便宣称消除了竞态。若只支持首轮单标签试玩，明确如何拒绝不支持的并发，以及仍保留哪道门槛；不把它写成永久产品限制。

### 4.3 O3 与封闭试玩不混同

推荐应优先将“开发态显式感染世界入口／独立新命名空间的封闭试玩”和“公开发布时处理旧医院入口／旧槽”分开，不默认永久维护两套产品。对 O3 提供具体选项与代价；允许建议仍留至公开发布前决定，但不能默认为旧档自动迁移、自动删除或长期双入口已经批准。

本任务不读写 Owner 真实浏览器存档、不清理旧槽、不注册生产入口，也不实际发布页面。

## 5. W4：原生探针、集中审阅与最近批次

### 5.1 探针必须回答接缝问题，不再造游戏模型

在仓库外运行模板／临时 runner，对当前真实 facade/S 做与候选合同相关的窄观察。至少核实已有能力的这些问题：Setup不签发；执行回调blocked与返回ready；写失败后返回最新内存；retry不重放且选择仍有效；坏档不会走空档发初配；新current／恢复使旧句柄失效；合法死亡与无后继中枢；未知医疗预览与真实执行的区别。

可复用已有 TEST fixture构造合法前态，但必须标记 TEST条件，不作为当前已有玩家入口或浏览器验收。P/R/S不改；不要通过真实内核被替换的有限模型宣称原生通过。运行器、模板和实际JSON保存在授权validation目录。临时可执行副本／配置／日志在仓库外；不得将临时测试偷偷加入src。

未来尚不存在的浏览器存储与UI行为只做显式标注的候选时序／故障表，不输出“已经保存成功”“跨标签通过”。无法执行的项报告具体未执行原因；不能把导入、fixture、权限或超时异常当预期语义拒绝。本任务不要求重跑历史72样本或全量生产检查来堆数字。

### 5.2 一次集中交付

00-owner-review先写：已有通过、真正仍缺、主推荐、需要Owner决定的少量项目及其影响。可无新增玩法采纳时明确写无，不把普通技术细节转交Owner逐个协调。确需确认时给自然语言＋一段可复制采纳文本，不能在长报告末尾只写“请确认”。

三份最近工程契约候选分别对应：必要的公开提示／应用准备；浏览器启动与唯一持久化owner；低资产UI接入与实际首玩。先给推荐顺序与依赖；若已有能力使某份无需单独工程，可明确并入相邻批次而不造空框架。不得越过新的生命周期／保存接缝准确SHA实审，也不能把所有工程打包成一次不停车的大Goal。

每份候选写：目标、正式来源、仍待采纳的条款、实际模块复用与缺口、可能必要修改路径（仅候选，不授予写权）、验收用例／命令、交付及停止点。不要预填未来SHA、DEC／UIR编号或声称已经获批。

只对5份既有入口追加本批作者候选状态和明确链接，不修改过去PASS、DRAFT或失败记录。完成时报告最终SHA/parent/tree、修改清单、原件、已/未执行、未解决冲突和下一停止点。

## 6. 检查、Git与范围

- 原件5件工作树／暂存／commit blob一致，4条SHA清单匹配；清单自身另计指纹。
- 精确白名单、5份追加前缀、UTF-8／相对链接、普通／cached／起点至最终增量diff检查。
- 核查src、正式DEC/UIR、3查询合同、配置／内容、旧测试／保存、依赖和CI对象未变。
- 可执行并记录npm run validate:architecture；真实全量npm check、typecheck/build、浏览器／多标签、Owner试玩未做时写NOT RUN，不用历史4369替代。
- W01累计仍仅原两文件七处硬换行，真实exit2不改写；本任务新增差异必须干净。不扩大例外。
- 普通commit／push仅新设计分支；不merge、不推main或旧分支、不强推、不清理Owner程序或自动定时操作。本权限不自动延续到后继任务。
- 当真实规则／发布兼容冲突出现时，将其隔离在明确DRAFT待审项并完成其余设计；不能借候选流程改生产来“消除冲突”。不让Owner做逐文件检查。

## 7. 27条精确路径（最大许可集合）

只允许以下新文件和追加文件。不得改变生产代码、TEST源码、配置或正式已批准文档。新目录不是通用写白名单。

- `docs/design-drafts/world-infected-001/entry-006/00-owner-review.md`
- `docs/design-drafts/world-infected-001/entry-006/01-baseline-and-open-gates.md`
- `docs/design-drafts/world-infected-001/entry-006/02-public-condition-and-feedback-draft.md`
- `docs/design-drafts/world-infected-001/entry-006/03-first-play-interface-flow.md`
- `docs/design-drafts/world-infected-001/entry-006/04-browser-bootstrap-and-persistence.md`
- `docs/design-drafts/world-infected-001/entry-006/05-entry-and-legacy-release-options.md`
- `docs/design-drafts/world-infected-001/entry-006/06-integration-ownership-and-error-flow.md`
- `docs/design-drafts/world-infected-001/entry-006/07-first-play-evidence-and-acceptance.md`
- `docs/design-drafts/world-infected-001/entry-006/contracts/01-preplay-foundation-contract-draft.md`
- `docs/design-drafts/world-infected-001/entry-006/contracts/02-browser-owner-contract-draft.md`
- `docs/design-drafts/world-infected-001/entry-006/contracts/03-low-asset-ui-contract-draft.md`
- `docs/design-drafts/world-infected-001/entry-006/validation/native-entry-probes.test.ts.template`
- `docs/design-drafts/world-infected-001/entry-006/validation/run-native-probes.mjs`
- `docs/design-drafts/world-infected-001/entry-006/validation/results.json`
- `docs/design-drafts/world-infected-001/entry-006/validation/source-manifest.json`
- `docs/design-drafts/world-infected-001/entry-006/completion.md`
- `docs/design-drafts/world-infected-001/entry-006/checks.json`
- `docs/design-drafts/world-infected-001/entry-006/inputs/WORLD-ENTRY-006-task-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-006/inputs/OWNER-authority-and-scope-WORLD-ENTRY-006-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-006/inputs/AUD-394f59d-ENG-WORLD-PLAYER-QUERY-001-review-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-006/inputs/BASELINE-AND-INPUTS.json`
- `docs/design-drafts/world-infected-001/entry-006/inputs/SHA256SUMS.txt`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`

## 8. 完成与停止

完成状态必须区分“候选／证据交付完成”与“Owner采纳／正式落文／浏览器或UI已实现”。无本批内部未完成项可以COMPLETE；仍有明确待审选择和体验Gate不是可以删掉的负担。

最后报告起始／最终完整SHA、parent/tree、实际路径、W1—W4结果、真实探针与NOT RUN、当前主要推荐和真实待Owner项、检查、推送与范围。停止等待当前WebGPT主线准确SHA实文件审查，不自动正式归档或开工生产。
