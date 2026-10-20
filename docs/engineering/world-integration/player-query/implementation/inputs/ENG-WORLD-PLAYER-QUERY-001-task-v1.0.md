# ENG-WORLD-PLAYER-QUERY-001 完整工程任务书 v1.0

## 0. 本项目标、起点与停止点

**本项是实际生产工程授权，不是再写一轮候选合同。** 在已审v4/P/R/S上一次完成：玩家安全只读视图、正式同源资格／必要安全预览，以及opaque选择→现有S命令的最小受控接缝。实现、正反例、原生长链、自查修订、默认完整检查、文档和普通commit／push均在本批内完成。

起始完整SHA：`8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3`
其父SHA：`7a3acd3855aefdde68fdaed13ebe037f3e9bd6de`
起始tree：`758c5cf11eb3ae15c543b50f30a7e4f5a703f38c`
新建工程分支：`feature/world-player-query-001`
来源分支：`feature/world-route-acceptance-001`（只读，不在此分支交付工程）。

来源与批准依据：
- 同目录已审 `player-query-contract-v1.0.md`；
- `player-query-field-contract-v1.0.json`的24项字段；
- `player-query-engineering-contract-v1.0.md`的完整Goal及Q01—Q12；
- 同包DOC-WORLD-QUERY-001准确SHA实审报告和任务权限记录；
- 当时实际有效DEC/UIR与AGENTS。技术合同不能创造玩法。

本项不安装玩家页面、不接浏览器保存、不增加任务内容或新存档格式。完成后即准确SHA查询／选择接缝实审，不能自行进入UI、browser、多标签或O3。

## 1. W1：开工核对、真实基线和详细设计

Owner直接附ZIP，不要求手工解压或补本地路径。由你定位附件，在仓库外解压并读取5件文件，核对4条SHA256SUMS及清单自身字节；把5件原字节归档到 `docs/engineering/world-integration/player-query/implementation/inputs/`。

重新实查HEAD、branch、status、普通和cached diff、远端引用；非本任务脏改不得reset/clean覆盖。新工程分支从上述准确SHA创建，已有同名分支时查明来源及未完成工作，不强制覆盖。读取实际AGENTS要求的GDD、VS、Architecture、DEC、相关Content，以及09 UI当前速查和UIR-010—012、015。以源文件而非旧聊天理解已审P/R/S。不要把snapshot=2026-10-03项目说明当作当前工程基线。

真实执行默认 `npm run test:run`；记录Node/npm/Vitest、并发环境与实际结果。历史242/4318及CI159成功不是本轮已跑。禁止改测试配置或靠环境覆盖假称默认通过；可做另行标注的诊断运行，但最终门槛仍为默认完整check。

在实施记录先定稿：24字段→实际owner函数→知识依据→停点；安全union及无current/blocked；选择器表示／私有绑定生命周期；必要窄抽取；旧接口保护；安全错误映射；非干涉样本；新原生链如何不借内部ID绕过玩家接缝。这些是任务内详细设计，不需Owner逐函数批准。遇到真正的规则／知识冲突，记录准确原文和影响并停止该冲突项，不能私自改规则。

## 2. W2-A：同源纯资格，不以执行生产者充当预览

当前源码中movement与task/source/medical/maintenance/inventory的部分资格仍和实际效果交织。本任务明确允许§7列出的16份既有宿主作必要窄抽取，并增设相应纯qualification模块。原生产函数与新query必须调用同一纯检查／费用owner；不是抄一份规则到玩家facade。

约束如下：

1. 保持原生产命令形状、成功／拒绝语义、参数、错误类别及检查时序责任；不改变真实材料／工具／药品消费、G1/CTB、随机、计划签发及终局。不移动关键校验到随机／消费之后，不让旧协议接收新任意值。
2. query／preview不能调用 `planShared*`、`planCombat*`、S.dispatch、G1行动／周期、物品发放或消耗、CTB evaluator/resolver再丢弃结果。也不能为了用旧reader删掉combat／来源／历史字段，伪装成旧SupplyValue。
3. 允许复用正式的只读体积／放置／负重／兼容检查与纯费用函数。新资格函数只返回资格、所需参数和有公开依据的安全描述，不返回新快照、Effect计划、随机结果或已签发authority。
4. 已有 `src/core/combat/combat-selectors.ts` 的 `selectEnemyHealthPhase`和当前command选择器可只读复用；不要重划三敌阶段阈值。relativeTimeline只做正式当前可知的相对关系，不试跑未来回合。
5. `shared-medical.ts`内有依赖隐藏infectionProgress/pending的资格。不能把这些内部判定直接变成公开enabled、具体拒绝文字或列表长度差异。安全依据不足时按合同保持unknown／通用安全说明，不改生产资格、不凭空开放无目标吞药。
6. 维修仍保持F03：原before严格，完整身体＋资源＋消费后态在原签发边界验证。不能重新加入会误拒合法“战后立即维修”的中途完整读取，也不能撤掉最新资源保护。
7. 选择器解析只定位对象、核对输入，最终合法性仍由S/P确认。所有非业务程序异常原样可观测，不广泛吞成“不可用”；对正常业务拒绝给安全、无内部ID的公开类别，内部诊断与玩家结果严格分层。

新核心仍纯TypeScript，不能import React、state或content模块。实际内容依赖由composition注入，不使用系统时间、UUID、Math.random或新依赖。

## 3. W2-B：24字段、五停点与完整安全视图

覆盖正式清单全部24键。字段结构可在任务内设计，但 `field-support.json` 必须逐项映射到实际API／类型／测试。3/12/9只是旧基线，不能当作删去缺口的理由。

四领域phase为first-hub／active-world／living-hub／dead；active-world分稳定世界和完整玩家战斗决策点，合为五停点。另有无current、未bootstrap、坏档／读取受阻等应用状态。不得伪造死亡或Day8。

- Setup只读catalog与实际初配分开。已建立first-hub只显示锁定工具／专长，查询不发物、不增createFirst或改选命令。
- 地图合并正式knownEdge事实与调查witness，仅显示已知节点／边；last-observed不冒充远端当前情报。当前可走方向只单边。没有已知侧门时，不显示灰色占位或具体隐藏阻塞理由。
- 来源机会接E01真实sources／productions，不用旧G2的空sources宣布“没有来源”。当前已揭示ground、携带容器／真实ItemState、任务件取得／留置／安装／交样分别表达。不得显示未揭示输出或完整来源账本。
- 背包、装备、快捷位、数量／公开资源／footprint按正式owner投影；真实物品和伤口ID只留受控侧。终局后按真实处置展示，不展示未携出物为永久资产。
- 任务目标按已观察和正式完成事实；指定样本不可被普通同名物替代，持有不等于已交付，访问地图数量不是成功条件。
- 战斗只含正式当前意图、公开敌阶段、可知相对时序、当前可用行动和必要资源说明。不输出enemy exact HP、raw CTB、概率、未来intent／trace／risk游标。
- 玩家HP/E/饱食/已知日额/公开伤势从真实current读取；感染不移植旧医院终末阈值，不公开精值或未来日结。无已批准安全映射时显式unknown，并说明准确缺口／UI前Gate；不得把本可读的公开字段也全部写unknown以完成清单。
- 成功、主动失败、deadline、死亡只使用真实已提交收据的安全摘要；双方归零仍死亡，真实none或combat-required保留在内部；玩家输出不包含完整receipt/closure/binding。
- 生还中枢无新真实内容时明确无后继，不自动治疗、重开或给继续委托按钮。
- 保存反馈读取S真实持久化状态，区分“内存已提交但未保存”和“已保存”，query不读盘／写盘核验。

输出显式白名单并深不可变。不要序列化raw current再删字段。隐藏内容不得转移到嵌套错误、描述字符串、selector、对象属性、数量、排序、可选项存在性或debug字段。

## 4. W2-C：新玩家facade与opaque选择接缝

**优先以新玩家facade受控包裹既有S，不修改旧state会话／domain／入口。** 旧CombatSession仍为唯一current/writer，facade不维护可编辑副本，不重复编排P结果、关闭委托或保存管线。新增玩家接口与原getState诊断接口分离；不向普通调用者返回完整S commit/current、raw正式命令、异常cause或私有绑定表。

使用新 `player-index.ts`／`player-controlled.ts`及同任务文件，不把新导出塞进旧combat-index/controlled来破坏精确旧导出测试。受控composition可以接收旧policy／startup材料；玩家query输入不能接收candidate state、Effect或自证expected。

### 4.1 上下文与选择器

- 句柄不包含或编码seed/execution/origin/raw实例ID；不能用其hash/base64/截断充当opaque。可用不承载秘密的对象身份或等价技术句柄，具体方案在W1说明。
- 私有上下文只保存实际对象身份和快照／用途绑定元数据，不能保存第二身体、库存、敌人、余额或资格结果缓存。由唯一S的当前引用核对新旧，不自行发revision。
- 只在显式建立facade、正式已提交／恢复时生成不可变上下文，或等价纯方案；重复query/preview不能增加映射、发authority或通知。同current重复读取稳定。
- 新current、phase/battle变化、移动／消费／拆合和冷恢复后旧句柄不能指向同序号新对象；跨facade/会话拒绝，未知句柄无fallback。
- 仅retrySave不换current：选择意义保持，保存反馈应更新。失败dispatch未提交不能无理由换掉选择；成功提交即使写失败也应更新到最新内存。
- S.write或通知回调内可能发生只读查询。必须测试：上下文还未就绪时明确不可用／受阻，不能把上一current视图冒称最新可执行；上下文建立失败不得回滚已提交玩法或追加第二次保存。
- 不引入通用事件总线。同步订阅用于读取已提交事实，不得通过监听器独立扣值、发奖、关委托或保存。

### 4.2 明确选择与提交

新入口接收玩家选择及必要数量／坐标／旋转／目标／方案。先验证session/context/用途/对象，再形成旧严格命令，最后只调用一次既有S.dispatch。绑定的旧revision/battle来自原上下文；不能静默刷新来让stale通过。

preview与resolve本身零dispatch。显式execute才执行一次，结果须是安全成功／失败摘要和新视图，不能把原始内部command/commit返回给普通界面。继续采用原S重入保护；不重写保存故障语义。

不自动选择其他目标、不自动换材料、不跨多边、不主动拾取或消费、不重试玩家命令。此批需要的位置均由调用者显式给出；不实现UI first-fit等展示自动化，也不改原有拾取/堆叠规则。

原状态签发与恢复权限只读。facade初始化调用旧S bootstrap/createFirst仍须原授权条件；它不能借Setup query建立新角色或复制初配。所有旧writer跨v1/v2/v3/v4的domain限制保持。

## 5. W3：原生测试、非干涉和独立计数

完整沿用正式工程契约Q01—Q12。最少提供以下成对证据，不靠测试数量替代覆盖：

1. no-current／blocked＋五停点；真实初配锁定、真实Day7/H0空steps、敌存活死亡与双方归零死亡。
2. 真实同知识不同seed、隐藏感染、未揭示产出、远端未知危险配对。比较全部安全视图／选项／排序／数量／错误；跨会话句柄只允许一一重命名，不删除动作列表后声称相等。独立扫描所有句柄载荷及嵌套输出。
3. 实际公开变化对照：搜索揭示、伤口/包扎、资源耗尽、安装／交样后视图必须更新，不能为了非干涉抹平公开事实。
4. selector旧snapshot、跨会话／冷恢复、旧battle、已移动/消费/拆合、用途错误、同名替代拒绝。拒绝不dispatch、不写、不通知；保持current与既已落盘字节。
5. query/preview/解析的合法及拒绝窗口逐次清零观察：P/CTB/G1/G2生产、随机、来源签发、动作authority、S.dispatch、Storage.read/write、通知均0。显式执行则另计一次S提交，不能把执行计数混进只读零调用。
6. 严格外部请求包括额外键、NaN/Infinity/非安全整数、布尔冒充数字、稀疏数组、getter／accessor、不合用途句柄及伪造错误。复用既有严格数据验证，不触发用户getter来检验合法性，不吞未知程序错误。
7. 保存失败后的最新视图与句柄、纯retry后的同句柄／新持久化反馈、冷恢复全部旧句柄失效。测试write/notify回调中的读与重入，不用新current副本绕开旧S。
8. 至少一条从真实read-null到成功返回的完整新查询链，实际中途用安全视图与opaque选择构造移动、搜索、拾取、材料/任务、战斗、治疗/维修及返回；不是最后才调用一次query。另有真实退却→即时维修→休整→再入、材料竞争／缺材料拒绝和失败止损证据。动作选择不读隐藏内部字段；内部ledger只供独立观察。
9. 原E03四路线和72默认样本全量实际回归；旧112＋R1新增12的124项和预算收口的10项均保持。原seed、策略、RNG、所有旧测试/helper字节不可改。
10. 至少两类仓库外语义负控：泄漏raw selector／隐藏字段；让stale句柄误提交。均必须业务断言失败而非导入、fixture或超时。原负控未跑写NOT RE-RUN，不能搬历史数字。

TEST helper不被生产导入；核心helper不能建立core→content/state依赖。合法/非法样本、作者验证、CI及主线旧检查分账。限定随机夹具与默认RNG路线分开，不清敌或手设completed来替代新真实查询链。

## 6. W4：完整检查、交付与权限

真实执行新测试、受影响纯资格旧回归、现有P/R/S、E03四路线/72样本和默认 `npm run check`。保留现有局部30s旧长链预算不改；**本任务新建的player-route.integration.test.ts中完整逐动作链可按单测试30_000ms，其他新测试默认预算**。不得改全局timeout、worker、CI或跳过慢seed；发现范围外失败准确记录，不扩大许可。

每份窄抽取宿主给出原规则分支→新纯函数→原生产回归映射。旧导出和测试保持，至少验证抽取前后合法/非法命令的原结果／错误类别一致。不得以“仅重构”为理由不跑原回归。

原始输入5件工作树／暂存／commit blob一致；三份正式合同及参数/内容/codec全文不变；精确路径、追加原前缀、UTF-8／相对链接、无新依赖、无循环/越层导入、普通/cached/起点增量diff-check均检查。W01累计真实exit2仅历史两文件七处硬换行，不新添例外。

完成报告至少写：完整起始/父/最终SHA与tree、branch/message、文件清单、真实基线、新增/替换/删除/净增、Q01—Q12定位、24字段逐项支持、unknown与UI前责任、同源窄抽取范围与兼容证据、只读与execute分开的计数、selector隐私/失效证据、真实链与负控、默认check、CI实际状态、输入/保护/W01、冲突及未完成项。测试通过不等于UI/浏览器/Owner体验通过。

允许新分支普通commit／push；不merge/rebase main、不推旧分支、不强推、不为报告追自身SHA反复amend。保存真实失败修订经过，不宣称模型或工具档位未经核验的变化。

完成后停止，等待当前WebGPT主线准确SHA查询与受控选择实审；不自动进入下一阶段。

## 7. 精确路径白名单（82条，最大许可集合）

不要求创建或修改全部路径，不建立占位空文件。A组仅同源纯资格窄抽取，所有实际改动须说明必要性；B—E为明确新增文件许可，F组只末尾追加。若已有同名文件与本预期冲突，实查报告；列表外不得自行新增/修改。工程前述禁止事项在所有路径内仍优先。

### A. 既有宿主：只允许同源纯资格窄抽取

- `src/core/residence-location/knowledge.ts`
- `src/core/residence-location/supply-knowledge.ts`
- `src/core/residence-location/validation.ts`
- `src/core/residence-location/movement.ts`
- `src/core/residence-location/items.ts`
- `src/core/residence-task/shared-actions.ts`
- `src/core/residence-task/shared-sources.ts`
- `src/core/residence-task/shared-transfer.ts`
- `src/core/residence-task/plans.ts`
- `src/core/residence-task/validation.ts`
- `src/core/residence-supply/shared-medical.ts`
- `src/core/residence-supply/shared-maintenance.ts`
- `src/core/residence-supply/shared-inventory.ts`
- `src/core/residence-supply/shared-validation.ts`
- `src/core/residence-supply/cycle-adapter.ts`
- `src/core/residence-terminal/supply-settlement-shared.ts`

### B. 新核心查询与专项测试许可

- `src/core/residence-combat/player-query-types.ts`
- `src/core/residence-combat/player-query.ts`
- `src/core/residence-combat/player-query.test.ts`
- `src/core/residence-combat/player-query-privacy.test.ts`
- `src/core/residence-location/player-knowledge.ts`
- `src/core/residence-location/player-qualification.ts`
- `src/core/residence-location/player-knowledge.test.ts`
- `src/core/residence-location/player-qualification.test.ts`
- `src/core/residence-task/player-query.ts`
- `src/core/residence-task/player-query-types.ts`
- `src/core/residence-task/qualification.ts`
- `src/core/residence-task/player-query.test.ts`
- `src/core/residence-task/qualification.test.ts`
- `src/core/residence-supply/player-query.ts`
- `src/core/residence-supply/player-query-types.ts`
- `src/core/residence-supply/medical-qualification.ts`
- `src/core/residence-supply/maintenance-qualification.ts`
- `src/core/residence-supply/inventory-qualification.ts`
- `src/core/residence-supply/player-query.test.ts`
- `src/core/residence-supply/medical-qualification.test.ts`
- `src/core/residence-supply/maintenance-qualification.test.ts`
- `src/core/residence-supply/inventory-qualification.test.ts`
- `src/core/residence-terminal/player-query.ts`
- `src/core/residence-terminal/player-query.test.ts`

### C. 新玩家facade、选择接缝与原生测试许可

- `src/state/residence-session/player-types.ts`
- `src/state/residence-session/player-validation.ts`
- `src/state/residence-session/player-context.ts`
- `src/state/residence-session/player-selectors.ts`
- `src/state/residence-session/player-queries.ts`
- `src/state/residence-session/player-preview.ts`
- `src/state/residence-session/player-commands.ts`
- `src/state/residence-session/player-errors.ts`
- `src/state/residence-session/player-facade.ts`
- `src/state/residence-session/player-index.ts`
- `src/state/residence-session/player-controlled.ts`
- `src/state/residence-session/player-phases.test.ts`
- `src/state/residence-session/player-setup.test.ts`
- `src/state/residence-session/player-fields.test.ts`
- `src/state/residence-session/player-selectors.test.ts`
- `src/state/residence-session/player-stale.test.ts`
- `src/state/residence-session/player-privacy.test.ts`
- `src/state/residence-session/player-purity.test.ts`
- `src/state/residence-session/player-preview.test.ts`
- `src/state/residence-session/player-dispatch.test.ts`
- `src/state/residence-session/player-persistence.test.ts`
- `src/state/residence-session/player-compatibility.test.ts`
- `src/state/residence-session/player-route.integration.test.ts`
- `src/state/residence-session/player-test-fixtures.ts`
- `src/state/residence-session/player-test-routes.ts`
- `src/state/residence-session/player-test-observers.ts`

### D. 新内容侧安全绑定许可

- `src/content/infected-world-v0.1/player-query.ts`
- `src/content/infected-world-v0.1/player-query.test.ts`

### E. 工程记录及5件输入归档

- `docs/engineering/world-integration/player-query/implementation/completion.md`
- `docs/engineering/world-integration/player-query/implementation/implementation-notes.md`
- `docs/engineering/world-integration/player-query/implementation/contract-and-support.md`
- `docs/engineering/world-integration/player-query/implementation/verification-results.json`
- `docs/engineering/world-integration/player-query/implementation/field-support.json`
- `docs/engineering/world-integration/player-query/implementation/inputs/ENG-WORLD-PLAYER-QUERY-001-task-v1.0.md`
- `docs/engineering/world-integration/player-query/implementation/inputs/OWNER-authority-and-scope-PLAYER-QUERY-001-v1.0.md`
- `docs/engineering/world-integration/player-query/implementation/inputs/AUD-8cddbdc-DOC-WORLD-QUERY-001-review-v1.0.md`
- `docs/engineering/world-integration/player-query/implementation/inputs/BASELINE-AND-INPUTS.json`
- `docs/engineering/world-integration/player-query/implementation/inputs/SHA256SUMS.txt`

### F. 既有文档：只追加附记

- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`

## 8. 明确只读保护与范围外

旧 `src/state/residence-session/combat-*`、supply/terminal/v1会话与domain、全部 `src/state/residence-save/`、身份生命周期、G1身体周期、CTB引擎、combat-history/trace/签发和全部旧测试/helper均只读。A组允许的G2/P宿主仅作同源纯查询接缝，不改变既有玩法语义；不是授权重构整个P/R/S。

未列为A组的核心文件不能修改。新字段不能要求增加持久化状态：不改v4/历史/来源真值，不建Profile/SDK/事件总线；无生产UI/React/DOM、browser IO、多标签、O3、第二委托、商城、身体服务、专长改选、素材制作、依赖或CI调整。既有安全知识不足的问题逐字段记录，必要时停该项请主线判断，不自行以显示需求批准玩法。
