# ENG-WORLD-ROUTE-ACCEPTANCE-001（E03-A）完整任务书 v1.0

## 0. 一次完成什么

本项是E03的第一批**原生路线验收与查询边界定稿**，不是又一轮世界设计，也不是完整E03／玩家试玩通过。用已审E02-S真实会话验证四条路线、九种工具×专长和有界默认随机样本；完成玩家安全查询字段矩阵、当前接口探针与下一项完整查询工程契约；同时一次交付自查、测试、证据及指定分支commit／push。

本批允许新增TEST-only TypeScript及原生测试，不修改任何已有生产代码、参数、格式、旧测试；查询契约产出是**待主线技术审定的候选**，不是已经发布的玩家信息规则。若确实需要新增玩家可见知识或改变策略空间，单列Owner待决，不自行采纳。不因流程凑新DEC或重复申请已授权任务书。

- 仓库：`lvlw/elevator-survival`。
- 起始准确SHA：`713dd376ddb60d20d9afaedaee4505e695f89d94`。
- 起始parent：`29a018a2ad64f8d5cbe56257381568bf3527cd08`；tree：`7839313a3e2475c93ae73c4dda9761a57c81ef3f`。
- 新分支：`feature/world-route-acceptance-001`。
- 原工程会话可以继续，但重新读取真实状态及材料，不沿用旧推断。
- 任务权限：本项明确许可集合内详细设计、测试实现、实验、自查修订、文档、普通commit／push。完成立即停止等待主线准确SHA审查。

## 1. 开工与来源

实际核对HEAD、branch、status、普通及cached diff。工作区有非本任务变更不得reset/clean覆盖。起始SHA不符或必需材料不可读，报告具体冲突；不要从main或别的工程基线开始。新建本项分支，记录已有远端引用。

先完整读取实际AGENTS要求的GDD、VS、Architecture、DEC及相关content。权威顺序和局部覆盖保持；旧医院参数不能替换DEC049—052的新感染规则。定点必读：

- `docs/05-design-decisions.md`
- `docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-batch-plan-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-session-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-restore-contract-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-004/02-world-content-and-mission-contract.md`
- `docs/design-drafts/world-infected-001/entry-004/04-specialties-tools-and-loadout.md`
- `docs/design-drafts/world-infected-001/entry-004/06-next-engineering-contracts.md`
- `docs/09-ui-design-record.md`

再读取当前内容绑定、三专长、P/R/S实际实现与已审测试。历史entry-004四路线只提供**路线意图和比较基线**；原来的外部战斗轨迹、HP/E夹具、第五日结尾和quietDraw不是本批默认结果。正式配置／数据唯一入口仍是现有已批准文件，读取它们而不另写一套生产默认。

实跑`npm run test:run`建立本批实际基线。历史229文件／4194项仅作核对，不算本轮已经执行。可命令级`VITEST_MAX_WORKERS=2`，执行后恢复旧环境；不改超时、测试配置、package/lock、CI或旧测试。

## 2. W1：真实四路线与可复核逐动作记录

建立只被测试导入的有界harness，直接创建正式内容依赖、R policy、共享domain及E02-S会话。所有实际玩法经`bootstrap→createFirst→dispatch`；cold恢复使用真实字符串和先于候选固定的独立expected。不能把P纯计划拼装成S已经提交的证据。

正式主链必须从真实read-null及获批初配开始：满值等起点来自现有正式初始材料，管／外套／单工具／快捷绷带1，无额外初粮、电子、回血或专长刷新。所需物资经实际来源、拾取、搬运与维护。三敌通过真实CTB解决或正式旁路避开；不得清敌、手设completed、替换current、传送、复制实例或覆写实际风险抽签。

保留原四route ID并具体实现：

| route ID | 本批真正验证 |
| --- | --- |
| route-hotel-bypass | 不访问酒店仍可满足任务；真实卡／消防门方案、指定样本、物流组件、供电、通信模块与转运安装；使用真正C4调查／解锁旁路时不把C2敌人判死。 |
| route-hotel-benefit | 合法酒店访问、T1交易与A休整的实际收益和成本；消毒剂须真实随机取得，缺少时明确不具交易资格，保留普通物流替代。 |
| route-segmented | 真入场、造成进展、合法退却、治疗／立即维护／休整、原敌再入直至成功或真实失败；敌HP、intent/count/risk和已花资源不重置。 |
| route-toolbox | H1首次专业开门的真实电子、显式拾取、工具箱维护材料竞争、再从合法来源补足安装材料；不能凭空补第二份电子或将专业来源算成固定初粮。 |

每步记录命令族／必要参数、位置、任务日／cycle、E/HP、食物、实际格位／负重、关键ItemState、任务事实、来源与处分增量、战斗场次、保存点。完整诊断ledger仅供开发审查，不能当玩家ViewModel。最终成功必须真指定样本在包、当地设施成果和正式交付，仍活由正式终局结120；其他终局按各自规则记录。

路线规划可在本批内迭代，保留失败记录和最终变更理由，不需要Owner逐动作确认。最终路线、分支规则与种子集合**运行前冻结并计算摘要**。动作选择只用预先编制的路线和合法公开条件；可以读取内部状态记录诊断，但不能根据隐藏seed／感染未来／未揭示掉落／风险游标做玩家式分支。若当前安全查询缺少必要选择字段，允许对真正公开事实编制TEST白名单适配，必须在W3注明来源、缺口与尚未接生产；禁止静默用完整getState冒充安全查询。

## 3. W2：九组合、真实RNG与压力／失败

### 3.1 两类证据分开

A. **默认种子回放**必须用实际默认`drawIntInclusive`及统一算法，不能覆写draw返回端点、循环重抽或挑掉失败样本。预先冻结公共8种子：`E03-A-seed-01`至`E03-A-seed-08`，各九组合使用同一集合，至少72条有界原生实验。每条可以成功、合法止损、死亡或有证据的路线不可达；日志不得把这些都改称通关。

B. **条件见证**用于有资格的酒店交换、临界流血／容量、最后一次资源等。完整四路线仍优先使用自然产生条件的真实种子；允许最多64个独立种子的有界预搜索来找一次酒店条件见证，必须在冻结前记录搜索集合、选择原因与实际随机来源，不能称总体成功率。边界单测可显式设置局部TEST HP/E，但不能作为完整四路线／72条默认样本的起点或中途补给。

至少四路线各一次真实成功见证是本阶段的**世界路线Gate目标**，不是命令要求“所有结果必须成功”。找不到时保留精确失败步骤、实际原因、探索预算和仍未排除的替代；不暗改规则、不声称全局无解。整体任务可交付`COMPLETE_WITH_ROUTE_GAPS`，但对应路线Gate不得标PASS。

不许为获得绿色结果删种子、改测试阈值、动态用本次actual生成expected或全体失败都断言“符合任务”。反例预期与机械不变量事先声明；实验结果单独输出结果矩阵。

### 3.2 九组合的真实选择差异

三工具×三专长都从真实首次材料建立并执行，不把“三种可创建”当成“九组合已验证”。每组至少覆盖其实际专长触发、工具路线或缺少工具的普通替代、跨日／冷恢复不刷新，以及完整尝试的结局。

- 侦察核对节省与快核前置按唯一配置／正式规则；不白给隐藏边。
- 工程手工作业与方法优惠不得叠加；无专长仍有普通方案。
- 生存首次合格绷带总恢复2，后续1，跨战／跨日／保存不重置。封顶与无目标区分。
- 工具箱维护与安装争电子，手电搜索争电池／电量，撬棍／普通方案争耐久或精力；不得把不同工具写成相同费用的外观项。

九组合要求真实差异和普通替代，**不承诺九种都能在所有种子取胜**。抽样是固定策略的有限实验，不是胜率估计、最佳策略证明或玩家体验结论。

### 3.3 压力与失败分支

集中覆盖：首次无粮与补粮时点、合法E0自救和E0移动拒绝、正E最后一次超余额行动、格位与重量共同约束、任务件留地跨日真实取回、已安装／已交样不可重用、缺材料整笔拒绝、无消毒剂酒店不可换粮、错误快捷目标、Day7正常返回与异地截止／死亡、不重接、不造Day8。

至少一次失败支线实际正式结束，并比较已用与未用材料的处分／余额；不得在报告中把“command reject”直接等同委托失败或角色死亡。

### 3.4 冷恢复接续

四路线各选有意义的合法完整停点：活动战斗、退却后、立即维修后、关键任务生产／安装后、终局。用真实写成功字节与匹配的独立材料cold新domain，验证后续同命令／同策略结果与未中断分支一致。保存失败重试采用已审S，补一条跨路线混合故障；不能建立另一个writer或把先前未落盘内存冒充跨进程已保存。

不重做整个P/R/S协议，不复制一套CTB／周期／奖罚或来源模型。已有回归复用为历史证据，新增路线执行分别记账。

## 4. W3：玩家安全查询字段合同与实际源码探针

本批**不新增生产玩家查询或UI入口**。一次交付`query-field-matrix.json`、`query-contract-draft-v1.0.md`以及真实旧查询探针，供主线据实际原生证据定稿下一项查询工程；不是再写“以后要做安全查询”。

逐字段矩阵至少包含：字段名／结构、来源路径与API、正式知识／UIR依据、输入边界、何时可见、是否技术选择器、未知如何表示、读操作副作用要求、当前支持／部分支持／未支持、对应原生检查、需不需要Owner新增知识决定。

必须覆盖首次选择、当前阶段／位置、已知地图和本地合法方向、可见来源及已揭示地面物、真实携带物及ItemState、任务公开目标和结算、战斗意图／相对时序／公开伤势、身体安全提示、保存失败与无后继内容静态中枢。

遵守当前DEC／UIR：只读知识地图，无raw CTB、精确敌HP或连续百分比；不暴露seed／stream/risk cursor／隐藏感染未来／未揭示掉落或侧门。getState是受控诊断，不是直接可序列化的玩家视图。物品／伤口／命令选择器需明确技术身份与展示的界线，检查ID编码是否携带隐藏材料；不要仅删一个seed顶层键即宣布无泄露。

实际比较“玩家知识相同、隐藏seed／感染或未揭示内容不同”的成对完整合法状态：既有查询返回、可用选项、拒绝原因都可能构成信息通道。不能为了相等事后抹平所有不同字段；区别确属公开事实时记录依据。缺安全提示规则时单列具体缺口及推荐，而非凭隐藏未来生成精确风险或宣称安全。

查询和预览不调用规则生产者、不抽签、不写盘、不发通知、不签发权限；若需要预测，只能由正式安全信息与明确合同支持，不能暗跑完整玩法再把真实隐藏结果显示为预览。探针分别标明当前正式能力、测试候选字段与未支持；不能让尚未实现的候选测试伪装生产通过。

`next-engineering-contract-draft-v1.0.md`只提出**一项**随后安全查询／受控组合工程的完整边界：目标、实际依赖、接口／字段／不变量、预期精确修改路径、反例、非干涉检查、验收与停止点。不得预填未来SHA或把候选当已授权。不需新增玩法时明确“无新增Owner采纳”；确实改变玩家知识或策略空间的少量问题另列Owner待决。

## 5. W4：自查、完整检查与首玩／发布欠账

原生测试既查正例也检查harness能发现错误。至少两类仓库外语义负控：破坏一次费用／消费核对、破坏恢复后完整结果比较。可以在外部测试副本中改观察断言／模拟错误结果，但不得改仓库生产函数／参数或将导入错误算检出。说明负控测试的是验收harness，不假称发现了生产错误。

冻结后的核心默认样本及四路线见证跑两次，比较规范化玩法结果（去掉真实耗时／绝对日志路径后字节一致），真实耗时另存。原始失败记录、抽样分母、not-re-run项和有界搜索均保留。

CI155安装日志有5项依赖审计告警（2 moderate／3 high）、大chunk和Actions运行时退役提示。本批可执行`npm audit --json`／`npm ls`等**只读**检查，判断涉及开发工具还是运行依赖及是否需发布前维护；不能据摘要断言可利用／安全。网络失败写NOT RUN／UNCONFIRMED。绝不运行audit fix、升级或改CI；产出单独maintenance-readonly-audit.json，主线另派维护任务。

`first-play-and-release-gates.md`明确离首次人工体验还差什么：安全查询生产、低资产UI、必要的浏览器存储与独立启动材料、多标签、O3旧入口／旧槽安排、人工分段突破与九组合体验。不要为了后续安排在此轮批准O3、买素材或要求Owner逐文件处理。工程／路线可达不等于首玩好玩。

实际完成：新增定向测试、完整`npm run check`、普通/cached/起点→最终diff-check、原件指纹、所有旧生产与旧测试Git对象保护、无新依赖、无新运行时循环依赖、测试helper未被任何生产入口导入、文档链接／UTF-8／共享原前缀检查。

测试在临时目录输出日志或stdout，交付前生成确定的结果JSON；不让CI执行时写脏跟踪文档。不为报告嵌自身最终SHA而amend循环；完整最终SHA/tree/远端核验可在提交后回执报告。

## 6. 精确路径白名单（最多38条）

所有新增TS均为TEST-only，不注册到content/index、app或UI。列表是最大许可，不要求机械创建全部。实际缺少必要路径，停止并报告具体冲突，不自行扩目录。

- `src/content/infected-world-v0.1/acceptance/e03-test-harness.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-routes.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-policy.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-seeds.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-observers.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-report.ts`
- `src/content/infected-world-v0.1/acceptance/route-hotel-bypass.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-hotel-benefit.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-segmented.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-toolbox.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/nine-combinations.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/seeded-outcomes.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/failure-branches.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/capacity-materials.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/cold-continuation.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/knowledge-boundary.test.ts`
- `src/content/infected-world-v0.1/acceptance/lifecycle-boundaries.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/harness-contract.test.ts`
- `docs/engineering/world-integration/route-acceptance/completion.md`
- `docs/engineering/world-integration/route-acceptance/implementation-notes.md`
- `docs/engineering/world-integration/route-acceptance/verification-results.json`
- `docs/engineering/world-integration/route-acceptance/route-results.json`
- `docs/engineering/world-integration/route-acceptance/route-ledger.md`
- `docs/engineering/world-integration/route-acceptance/nine-combinations.md`
- `docs/engineering/world-integration/route-acceptance/query-contract-draft-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/query-field-matrix.json`
- `docs/engineering/world-integration/route-acceptance/next-engineering-contract-draft-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
- `docs/engineering/world-integration/route-acceptance/maintenance-readonly-audit.json`
- `docs/engineering/world-integration/route-acceptance/inputs/ENG-WORLD-ROUTE-ACCEPTANCE-001-task-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/inputs/OWNER-authority-and-scope-E03-A-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/inputs/AUD-713dd37-ENG-RESIDENCE-COMBAT-SESSION-001-review-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/inputs/BASELINE-AND-INPUTS.json`
- `docs/engineering/world-integration/route-acceptance/inputs/SHA256SUMS.txt`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`

四份共享文档只在末尾追加本批作者状态，不倒改历史。正式DEC、五份E02合同、38值、103键／193数值叶及限定内容数据均只读。现有生产／测试／helper全体保护，除这四份共享文档无其他旧文件修改许可。

## 7. 异常／缺口处置

- 测试基础设施缺陷：在白名单内修复并保留修前结果。
- 真实生产缺陷：保留最小原生反例、准确代码定位和影响；不越权修P/R/S，不改原断言变绿。可完成不受影响的实验和合同，然后以明确BLOCKED／WITH_FINDINGS交付。
- 路线或平衡不足：是本批要查明的设计结果；报告真实代价和主推荐，不自动改数值，也不将未成功写成全局无解。执行交付完成与世界路线Gate通过分别标记。
- 新知识／策略决定：只列必要问题，不要求Owner手算或回旧会话找文件。
- 未执行：必须写NOT RUN。不能用旧CI、quietDraw条件成功或有限模型结果填补默认RNG证据。

## 8. Git授权与报告

允许从713dd376ddb60d20d9afaedaee4505e695f89d94新建`feature/world-route-acceptance-001`，仅本分支普通commit／push，可网络普通重试。不得merge/rebase/amend历史、推main或其他分支、强推、reset/clean他人改动；不新建worktree，不自动进入下一批。

最终报告包含：起始／父／最终完整SHA及tree，分支、commit与真实远端核对；修改路径与保护；真实测试基线、新增／替换／删除／净增；四路线逐条Gate、72条默认RNG分母和结果、九组合真实差异、条件见证与失败、恢复等值／负控；查询字段支持矩阵、真正需要Owner决定的项（无则明确无）、下一完整契约候选；全部检查、CI、依赖只读调查及范围外NOT RUN。

W01累计对照原E01-P提交`8c19ca0d28058cf743b41c8547cc2629c8eac767`仍只允许原两个输入文件7处硬换行。按已有正式批次门槛定位原行，不改原件，不配置忽略；本任务新增全部干净。累计真实exit2与增量exit0分别报告。

**停止点：提交推送后交当前WebGPT主线准确SHA原生路线／查询合同实审。此任务不自动授予安全查询生产、UI／浏览器或O3权限；不宣布完整E03或游戏试玩通过。**
