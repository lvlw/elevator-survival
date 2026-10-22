# ENG-WORLD-PREPLAY-FOUNDATION-001 完整任务书 v1.0

## 0. Goal、基线与交付方式

**本批开始实际基础工程，不再新增设计轮次。** 一次完成详细设计、实现、正反例与组合、语义负控、自查修订、默认完整检查、文档、普通提交与推送。目标是为首玩提供可信的当前病程／行动说明和稳定应用更新，不是提前画UI或实现浏览器存储。

- 仓库：`lvlw/elevator-survival`。
- 起始完整SHA：`ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`；其父`20b833aeec4693e56afee075c9878425d3c58605`；tree`5c0b802aa15d053ebaaa24e1ca1fe9bf836e6101`。
- 创建独立新工程分支：`feature/world-preplay-foundation-001`。不在设计分支或旧查询分支交付，不新建worktree。
- 来源：Owner当前会话D1/D2直接批准、DEC-053、`docs/engineering/world-integration/preplay/foundation-contract-v1.0.md`和`public-condition-contract-v1.0.md`；文档/T01准确提交实审PASS见包内报告。
- 普通commit／push仅本任务新分支。禁止merge/main/旧分支push/force/自动后继。
- 67条精确路径是最大集合，不要求创建全部文件。目录名不构成通用白名单。

Owner将ZIP直接附入Codex。自行定位并在仓库外解压；无需用户填写路径。完整核对七份文件及SHA256SUMS，按原字节归档到`docs/engineering/world-integration/preplay/foundation/inputs/`。普通工程疑问在授权内提出有依据设计并自行验证；真实规则冲突或必须扩路径才可完成时，报告精确位置和影响，禁止自行越权，也不要让Owner逐文件协调。

## 1. 开工核对及本轮证据基线

读取实际AGENTS和其要求的GDD/VS/Architecture/DEC/相关Content、UIR当前有效速查和010—012/015。重点合读DEC-049—053、已批准query主合同、字段v1.1、preplay两个基础合同和批次门槛。浏览器/低资产UI合同仅用于明确后继接口边界，不是本轮写许可。

实查HEAD、branch、status、普通/cached diff、untracked、remote refs。非本任务改动不reset/clean/stash掩盖；已存在分支不得重建。无可证明来源的残留或基线不同先报告。

实际读取：player-facade/types/context/queries/preview/commands/validation；combat-session/composition/persistence/expectation；G1 cycle/energy/config；supply medical/maintenance/qualification、战斗query、任务来源；当前纯查询和原E03 TEST helper。确认导入方向和唯一owner，不根据旧会话模型推断。

运行**默认 `npm run test:run`**建立本轮基线，记录Node/npm/Vitest版本、worker相关环境变量和真实退出码。252 files/4369 tests是历史CI162，不代替新基线。若基线失败，先分类环境/既有失败/语义；不可改超时或删断言换绿。后续`npm run check`必须默认完整执行。

## 2. W1：D1与同源公开metadata

### 2.1 D1必须实际接通

从唯一已提交当前身体和版本绑定的`config.health.infection_damage`派生四档：未达病程损耗档／低／中／高病程负担。复用正式配置的分段，不复制增长表、不建立第二可编辑阈值；不持久化派生档。无current、blocked、非法原值、错配置/版本不默认为最低档。HP0死亡与正常H0无夜保持。

普通DTO只输出批准标签/有限样式分类和安全说明，不输出精确progress、边界min、该段hp损耗、隐藏pending/suppression、增长表或百分比。最低档不保证未感染/安全，最高档不等于死亡。终局读取真实保留事实，不再推进一夜。

非干涉以**同公开粗档＋其他公开事实相同**为等价类；跨档只允许批准差异。同档不同progress/pending/suppression/seed、同敌公开阶段不同HP仍须在完整视图、动作、排序、提示、错误和Feed保持；不能删去动作/选择器再比较。明确执行后真实公开变化可不同。

消毒／抑制隐藏目标Preview继续unknown，不据新粗档提前开放目标资格；不得从按钮、列表长度、颜色或“无目标”细节先验泄漏。真实明确执行仍由原S/P拒绝或消费。

### 2.2 必要说明，而不是第二套结算

建立`metadata-support.json`：字段/命令族→公开依据→唯一函数owner→实际API→支持/unknown理由→对应原生测试。至少处理已有公开HP/E/饱食/伤势/剩余日额、已知费用与耐久/电量支付、实际药食目标与公开效果机制、维修单总池与材料、休整不自动恢复、胜退一次E结算等。不得用额外商品、医疗服务或新能力填空。

优先复用已有`queryResidenceAction`、ItemState preview、资格与恢复/首绷纯owner；准许本单中列明的G1 `cycle.ts`作**必要纯标量/规则事实窄抽取**，但旧执行入口、算术顺序、异常边界、冻结语义和所有既有G1测试保持。新增公开读函数可位于新文件，不必扩大旧index导出。禁止抽取变成重写整个G1/CTB/医疗引擎。

可补content-side机制标签/安全视觉占位元信息，但不引入raw definitionId、节点推断敌人或新可见事件。实际暴露事件没有批准公开DTO，不从hidden pending差分编Feed；敌名称/图键无足够依据就通用占位，不能为了凑字段创造知识。最终图片/音频不在本轮。

## 3. W2：完整命令安全边界与保护资格

资格available不等于safe。保留现有preview/resolve调用语义；可增加独立的安全metadata接口或受控伴随投影，不返回内部命令/计划/authority/raw current。不迫使所有旧精确返回断言跟着变动，新增接口须有清楚类型和导出范围。

实现正式公开事实支持的`guaranteed / not-guaranteed / unknown`（名字可与既有类型对齐，语义不可改）：
- guaranteed：对本完整合法意图，在允许使用的公开信息下可证明必死；不能只证明某条分支会死。
- not-guaranteed：有正式安全事实支持至少一个合法非死亡分支；不是安全承诺，也不能因“不知道会不会死”就给此值。
- unknown：信息/正式纯能力不足，不伪装前两者。不得读取隐藏精值、抽取未来RNG、试跑producer/resolver、签发再丢弃计划来消除unknown。

以**具体完整合法请求**为对象，含显式材料/伤口/位置/数量与当前opaque绑定；不能用一个命令名字替代完整资格。完整后果包括主要效果先于流血、立即结果及应处理响应；不能把“治疗前HP1流血”直接判为用了绷带后仍必死，也不能因攻击击杀敌人跳过自己的动作流血。当前粗档不是未来日结损血答案。

最低必须有非空的原生覆盖：公开流血已足以证明死亡的付费稳定行动；同一真实前态存在合法免费自救或另一正式非必死替代；无足够公开依据的休整/战斗/隐藏医疗分支；正常H0返回不补夜。针对HP1/HP不足截零、E0、先治疗后流血、双方归零及同公开档不同潜值配对检查。哪些族可证明、哪些仍unknown写清楚；不能整包全unknown后宣布动态保护完成，也不要求编写未来全规则枚举模拟器。

控制层的动态保护只在**本请求guaranteed且实际存在可证明not-guaranteed的合法替代**时要求相应确认；unknown替代不是安全替代。静态L3如主动失败返回、截止、任务关键物留置按已批准UIR/合同处理，参数选择与保护确认分开。L0/L1/L2不统一套大确认，不影响原S普通命令协议。测试比较确认分类与正式执行结果，但只读窗口不得实际执行来算答案。

保护确认在应用层绑定原opaque请求、全部显式参数与重要安全上下文；接受确认不得重选同名对象或以最新revision刷新旧授权。任何无法满足的正式知识/安全子项要报告精确缺口，不偷改规则。未满足关键验收不能宣称完整基础工程PASS。

## 4. W3：headless单controller、稳定snapshot、草稿与Feed

### 4.1 唯一事实与明确调用

新增纯TS `src/app/infected-preplay/` 作为本批最小应用协调者。包裹既有受控player bundle；S仍唯一current/writer/预编码/通知owner。应用只持不可变安全view缓存、busy/安全错误、展示草稿和session-local Feed。不得持第二份可编辑身体/背包/钱包或另一S，不把完整canonical传给React未来消费者。

创建controller、getSnapshot、subscribe/unsubscribe、查看/取消不bootstrap、不发物、不保存。显式bootstrap/createFirst/retryRead各消费原受控返回。首次选择/身份材料由受控composition提供，本批不引入系统时间/UUID/Math.random产生规则身份或种子，不生成浏览器reservation。重复挂载式订阅、重复启动意图不得重发初配；真实React StrictMode留UI批，本批不得仅凭模拟订阅就宣称DOM实测。

单飞门先于执行和通知回调。一次意图只一次player.execute/原S dispatch；原生write/subscribe中的blocked只标记失效，不能当成永久终态或第二个可执行ready。调用正常返回后发布result.view；异常则同步核对唯一安全投影并保留错误。稳定期getSnapshot返回同一对象，不每次读取重建query。Presentation busy→ready通知与原生一次玩法通知独立计数。

retrySave只用返回view更新保存反馈；同current不换选择含义、没有玩法Feed。可预留窄的可执行权限依赖供后续浏览器锁接入，但本批不能伪造跨标签独占，也不实现锁、storage或通用插件框架。

### 4.2 草稿与确认生命周期

保留显式参数草稿（数量/位置/旋转/真实材料/伤口/分配）与保护确认；取消零作用。新current、phase/battle变化、移动、消费、拆合或冷恢复使旧草稿失效，即使新画面数值相同也不能复用。未提交拒绝保留当前有效选择；retrySave同current保留，反馈变化本身不当新玩法。

需要上下文标记时，仅允许私有/安全的进程内opaque scope引用绑定实际facade上下文，不把raw identity/revision编码给玩家，不持久化，不作为行动authority，不开放替换current。只看新query对象引用不等于玩法更新；只看公开值相等也不等于上下文未变。

控件草稿应以新的纯数据副本保留原opaque引用；不读getter、不冻结/修改调用者原对象。陈旧、跨会话、复制/JSON对象、错用途引用仍失败，不自动找同名物或默认材料。快速双击同一确认、回调再入、mount重复均不能执行两次。

### 4.3 错误、结果与Feed

committed+save-failed展示最新内存，不reload/rollback。原计划已完成死亡时不二次关闭、不发布HP0活动态，双方归零仍dead。投影失败后屏蔽旧可执行view；受控synchronize只修展示，不重发动作/保存。已提交但返回丢失时标记结果反馈不确定，不能猜“未执行”自动重试。

程序Error/AssertionError/带code的普通Error保持可观察，不能吞为业务拒绝；面向玩家的安全错误不得含原始身份、hidden细节或堆栈。监听异常隔离不能导致第二次结算；finally释放执行门，且不能把failed projection误发为ready。

Feed仅消费实际已公开的前后差异或批准安全结果，并保留最小显示条目；不留raw current/commit/Effect/trace、RNG或隐藏感染。前后安全对象用于本次比较后不作为另一历史状态库。没有可公开差异可用不泄漏的动作完成信息，不补造曝光/伤害事件。拒绝不记成功；bootstrap/retryRead/retrySave/Preview/取消无已执行玩法Feed；恢复新会话只记恢复提示，不重放旧动作。

## 5. W4：原生验证、自查修订与完整交付

所有规则路径调用实际P/R/S和真实player facade。允许TEST合法冷前态做定点边界，但必须标注；两条完整链从真实read-null／批准初配开始，不clear敌人、补资源、set completed或替换current。策略从公开view/opaque选择构造明确请求；raw S只作独立观察oracle，不用于玩家策略绕查询。

### F01—F10逐组责任

| 组 | 最小验收 |
| --- | --- |
| F01 | D1配置同源；段内/边界前后/最高段及非法原值；五停点/无current；同档非干涉及跨档正控 |
| F02 | 必要metadata的字段来源、资格/费用/实际公开效果机制；隐藏医疗unknown；未批准视觉/事件不补造 |
| F03 | 完整命令安全三态和合法替代；动态/静态保护分类；先治疗后流血/HP0/双方归零/未知后果；不试跑 |
| F04 | getSnapshot稳定、只读、稳定subscribe；blocked回调→最终ready；取消与读零作用 |
| F05 | 真实无档→初配→出发、坏档/读取失败不发物；重复启动/订阅不创建第二S/初配 |
| F06 | 显式执行只一次；双击/回调再入拒绝；S与Presentation通知独立计数；死亡只承接原终局 |
| F07 | 新current同公开值也失效；冷/跨会话/消费/拆合/重要参数变化；retry和未提交拒绝保留当前有效草稿 |
| F08 | 全view/metadata/confirm/Feed/错误非干涉；仅已执行公开变化进入Feed；任意程序错误不吞 |
| F09 | 真实成功长链及退却→立即修理→治疗→休整→再入→明确止损；保存失败/最新重试/五停点/投影故障 |
| F10 | 零副作用计数、至少三类语义负控、旧回归/E03/完整默认check、范围和输入/合同/参数保护 |

计数窗口在夹具建立后独立清零：query/metadata/preview/resolve/cancel/getSnapshot/订阅和各拒绝分支，观察producer/CTB/G1/G2/随机/authority/原件发放/消费/dispatch/read/write/native notice均0；Presentation读也不得创建新context。合法动作一次S dispatch/write-attempt/native notice，Presentation更新另记。retry只现有聚合/编码/write，玩法/通知为0；cold/bootstrap遵守原独立expected-before-read，不从候选造expected。

至少三类仓库外负控：公开隐藏精值或跨同档变按钮；重用旧确认或隐式刷新选择；将blocked回调当最终结果或重复派发。必须业务断言失败且还原后PASS，语法/导入/fixture/超时不算。不得把变异提交生产或改旧测试来迁就。历史负控不重跑写NOT RE-RUN，不累计为本轮新增。

## 6. 已有文件的窄修改权限（避免授权冲突）

1. 列明player-*生产宿主仅接D1、只读安全metadata、上下文/错误和controller所需最小接口，保持旧命令资格、选择失效和S调用次数。旧query/preview/resolve行为除D1局部之外不退化；新增DTO只能有合法公开信息。
2. `src/core/character-cycle/cycle.ts`只在确有同源需要时抽纯事实/标量读取或复用其原计算；先列diff、证明旧函数结果/时序/异常/签发不变。**禁止调用planCharacterCycle/planActionBodyConsequences去试算Preview**；新安全入口不得签发计划或返回隐藏完整身体。无需改此文件则保持不变。
3. `player-privacy.test.ts`仅将D1跨0/9/120全部相同及unknown断言替换为同档配对＋跨档正控，保留其他隐私/旧ID/RNG/敌HP意图。旧被替代断言的准确名称、差异和批准依据写工程记录，不删除整组隐私测试。
4. `player-fields.test.ts`仅更新D1字段/字段合同v1.1与确有必要的新增安全接口精确导出清单；原ordinary不泄raw current/authority/writer和domain保护必须继续。没有增加接口不改清单。
5. 以上两份旧测试每个变动分清新增/替换/删除/净增；其余旧测试和helper逐字节保护。不能把任务内真实冲突“解决”为禁止检查、修改v1.1或放宽S。
6. 六份既有文档仅末尾追加真实实现/未知/NOT RUN。DOC完成报告只追加批准来源澄清及本包文件链接；不改旧原件或原作者记录。正式DEC/UIR/七载荷/旧输入全部只读。

## 7. 检查、Git与证据

建议顺序（实际文件按创建情况选，不运行不存在路径）：

```text
python <包目录>/verify-task-package.py --package-root <包目录>
npm run test:run
npm run test:run -- src/core/character-cycle/public-condition.test.ts src/state/residence-session/player-condition.test.ts
npm run test:run -- src/state/residence-session/player-preplay.test.ts src/state/residence-session/player-safety.test.ts src/app/infected-preplay
npm run test:run -- src/content/infected-world-v0.1/acceptance src/state/residence-session/combat-longchain.integration.test.ts src/state/residence-session/supply-longchain.integration.test.ts
npm run check
git diff --check
git diff --cached --check
git diff ff2b79f332c5ea2bec493eb5e166dcee6ba667eb --check
```

读当前package.json，不沿用历史命令假设。最终check需架构/typecheck/全部tests/build完整通过；默认环境不隐式覆盖worker，不改全局timeout/config。**只允许新增`src/app/infected-preplay/longchain.integration.test.ts`中确为完整真实链的调用使用局部30_000ms预算**，不扩到其他新单元或受保护旧用例。既有获批长链30秒不回退。超时如实保留、不能无限重跑挑绿灯；需要范围外修复则停报。

只读执行一次`npm audit --json`并另记exit/可用性/具体归属，作为维护信息；不得npm audit fix或修改依赖。本输入CI摘要为2 moderate/4 high，非最新风险评定，不照抄成安全结论；网络不可用标NOT RUN/UNCONFIRMED，不让其替代功能检查。可达性未知就不下结论，公开部署前维护Gate继续保留。

保存本轮真实修改集合、文件SHA/原件大小/保护对象、允许旧测试改动、生产导入方向/环检查、UTF-8/相对链接、暂存与已测试字节一致。四档数值/所有配置/content/codec/domain/旧医院入口/已审T01不变。新增文件也要检查空白，不仅检查已tracked。W01累计对照`8c19ca0d28058cf743b41c8547cc2629c8eac767`只允许原两文件七行，记录真实exit2；新差异exit0，不加第八处。

逐路径stage；普通commit建议`feat(app): add preplay condition and presentation foundation`，只push新工程分支。报告起始/最终完整SHA、parent/tree、实际远端、本地status、其他refs；禁止amend追写自身SHA、merge/force/推main。准确SHA CI独立核对，queued/in_progress/限流如实，不拿CI162代替。

交付5份新工程记录（notes/support/metadata-support/verification/completion），包含F01—F10、字段/命令支持与未知项、两条真实链、计数/负控、完整检查和失败修订；声明UI/DOM/browser/多标签/Owner NOT RUN。基础工程完成即停，等待当前WebGPT准确SHA实审。

## 8. 范围外和停止条件

不实现browser owner/checkpoint prepared交接/localStorage/IndexedDB/Web Locks/跨标签；不更改v4三键、schema/policy/expected/current/domain/原S时序；不接React/DOM/路由/DEV入口，不处理旧槽、不决定O3。身份/种子真实浏览器生成、迁移/清档/重建、网络/云存储不在本轮。无商城、身体服务、第二委托、跨委托专长、素材/音频制作、依赖或CI维护。

本批只补已批公开知识和应用基础，不调平衡。遇到必须新增隐藏公开知识、规则/角色生命周期或发布承诺才可实现的点，给精确冲突并停止相关子项。不能以长任务掩盖保存接缝；不能因为当前是基础就永久删除动态安全/三专长/工具箱/分段体验后继责任。

## 9. 精确路径最大许可

按下列分组逐路径授权；JSON同表。未列文件只读，文件存在本身不授权。新命名可在列表内选择最简组织，不强制创建闲置模块。

### existing-pure-and-safe-seams

1. `src/core/character-cycle/cycle.ts`
2. `src/core/residence-supply/player-query.ts`
3. `src/core/residence-combat/player-query.ts`
4. `src/content/infected-world-v0.1/player-query.ts`
5. `src/state/residence-session/player-types.ts`
6. `src/state/residence-session/player-queries.ts`
7. `src/state/residence-session/player-preview.ts`
8. `src/state/residence-session/player-facade.ts`
9. `src/state/residence-session/player-context.ts`
10. `src/state/residence-session/player-controlled.ts`
11. `src/state/residence-session/player-index.ts`

### new-pure-metadata

12. `src/core/character-cycle/public-condition.ts`
13. `src/core/character-cycle/public-condition.test.ts`
14. `src/core/character-cycle/safety-facts.ts`
15. `src/core/character-cycle/safety-facts.test.ts`
16. `src/core/residence-supply/player-metadata.ts`
17. `src/core/residence-supply/player-metadata.test.ts`
18. `src/core/residence-combat/player-safety.ts`
19. `src/core/residence-combat/player-safety-types.ts`
20. `src/core/residence-combat/player-safety.test.ts`
21. `src/content/infected-world-v0.1/player-mechanisms.ts`
22. `src/content/infected-world-v0.1/player-mechanisms.test.ts`

### new-controlled-projection

23. `src/state/residence-session/player-preplay.ts`
24. `src/state/residence-session/player-preplay-types.ts`
25. `src/state/residence-session/player-preplay.test.ts`
26. `src/state/residence-session/player-condition.test.ts`
27. `src/state/residence-session/player-safety.test.ts`
28. `src/state/residence-session/player-preplay-purity.test.ts`
29. `src/state/residence-session/player-preplay-test-fixtures.ts`

### new-application-controller

30. `src/app/infected-preplay/index.ts`
31. `src/app/infected-preplay/types.ts`
32. `src/app/infected-preplay/controller.ts`
33. `src/app/infected-preplay/snapshot.ts`
34. `src/app/infected-preplay/drafts.ts`
35. `src/app/infected-preplay/confirmation.ts`
36. `src/app/infected-preplay/feed.ts`
37. `src/app/infected-preplay/errors.ts`
38. `src/app/infected-preplay/controller.test.ts`
39. `src/app/infected-preplay/initialization.test.ts`
40. `src/app/infected-preplay/confirmation.test.ts`
41. `src/app/infected-preplay/drafts.test.ts`
42. `src/app/infected-preplay/persistence.test.ts`
43. `src/app/infected-preplay/errors.test.ts`
44. `src/app/infected-preplay/feed-privacy.test.ts`
45. `src/app/infected-preplay/purity.test.ts`
46. `src/app/infected-preplay/longchain.integration.test.ts`
47. `src/app/infected-preplay/test-fixtures.ts`

### existing-tests-narrow-D1-and-safe-export-updates

48. `src/state/residence-session/player-privacy.test.ts`
49. `src/state/residence-session/player-fields.test.ts`

### append-only-documentation

50. `docs/03-architecture.md`
51. `docs/08-rule-implementation-traceability.md`
52. `docs/design-drafts/world-infected-001/01-world-overview.md`
53. `docs/design-drafts/world-infected-001/10-decision-queue.md`
54. `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
55. `docs/design-drafts/world-infected-001/entry-006/adoption/DOC-WORLD-ENTRY-006-completion.md`

### new-engineering-records

56. `docs/engineering/world-integration/preplay/foundation/implementation-notes.md`
57. `docs/engineering/world-integration/preplay/foundation/contract-and-support.md`
58. `docs/engineering/world-integration/preplay/foundation/metadata-support.json`
59. `docs/engineering/world-integration/preplay/foundation/verification-results.json`
60. `docs/engineering/world-integration/preplay/foundation/completion.md`

### archive-only-inputs

61. `docs/engineering/world-integration/preplay/foundation/inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-task-v1.0.md`
62. `docs/engineering/world-integration/preplay/foundation/inputs/OWNER-authority-and-scope-PREPLAY-FOUNDATION-001-v1.0.md`
63. `docs/engineering/world-integration/preplay/foundation/inputs/AUD-ff2b79f-DOC-WORLD-ENTRY-006-review-v1.0.md`
64. `docs/engineering/world-integration/preplay/foundation/inputs/MAINLINE-approval-provenance-clarification-v1.0.md`
65. `docs/engineering/world-integration/preplay/foundation/inputs/BASELINE-AND-INPUTS.json`
66. `docs/engineering/world-integration/preplay/foundation/inputs/verify-task-package.py`
67. `docs/engineering/world-integration/preplay/foundation/inputs/SHA256SUMS.txt`

