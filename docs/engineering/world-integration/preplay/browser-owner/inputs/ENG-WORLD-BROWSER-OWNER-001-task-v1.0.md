# ENG-WORLD-BROWSER-OWNER-001 完整任务书 v1.0

## 0. 本批目标、起点与停止点

从已审基础准备接出真实浏览器启动与唯一持久化：独立DEV composition、候选外初始化／expected、受控prepared交接、一个完整checkpoint写入、全会话Web Locks独占、刷新及故障恢复。不是低资产UI，不注册玩家入口，不重做核心或保存格式。

- 正式仓库：`lvlw/elevator-survival`。
- 起始SHA：`bc60f24cc16625a25ad56b0b917da63b16f29f56`；父：`cc147cd253f3e7e57e45de265610becb64a74821`；tree：`875f04ad8018f48df9b248fc19317d35e48798a0`。
- 新建独立工程分支：`feature/world-browser-owner-001`，不在原基础／设计分支交付，不新建不必要worktree。
- 以实际AGENTS、DEC-049—053、当前有效UIR、preplay/browser-owner-contract-v1.0和batch-plan为依据。发现真正条款冲突报告精确位置；普通接口细节自行形成有依据的设计，不让Owner逐文件协调。
- 下列63条精确路径是最大许可，不要求全部使用。一次完成W1—W4与报告，允许普通commit／push到同名工程分支。结束停准确SHA保存／浏览器实审，不自动开始UI。
- 本包6件原字节归档到`docs/engineering/world-integration/preplay/browser-owner/inputs/`；原包、审查资料、历史失败和W01/W02均不重写。

## 1. W1：实查与最小详细设计

1. 确认HEAD、branch、status、index、untracked及仍在运行的命令；已有改动冲突不得reset/clean/stash覆盖。核对包摘要及入口指纹，读取相关真实源码。重新默认执行`npm run test:run`；270/4487只是历史作者结果，不代替本轮实测。Node/npm/Vitest、命令、退出码和失败必须保留，不预设worker覆盖。
2. 重点读实际`combat-types/composition/session/persistence/expectation/initial`、v4 policy/schema/validation、shared domain、player facade、已审controller及当前content composition。`prepareCombatPersistence`已有value/text/expected，但现有write(text)不能交出expected；明确该缺口，不靠listener补写或冷payload反推。
3. 在implementation-notes写材料所有权、严格外壳、初始化／冷恢复／重试的状态转换、同步与异步边界、锁生命周期和B01—B10测试图。无需再开独立设计任务。
4. 当前包没有浏览器自动化依赖。先查实际可用浏览器与工具，优先已有能力或独立临时浏览器profile配合CDP；可用Node内置能力编写TEST runner，不改package/lock/CI，不隐式装入新生产依赖。能力缺失要写具体命令／错误／未覆盖项；不能把jsdom或mock当真实浏览器。
5. 按当前官方平台资料核对Web Locks、Storage和页面生命周期细节，在记录里注明来源和浏览器版本。不得从历史聊天推定BFCache、崩溃或所有浏览器已支持。测试使用本地独立临时profile／测试命名空间，不接触Owner正常浏览器profile或已有存档；不得为了测试关闭其他进程、重启或关机。

## 2. W2：唯一prepared交接、真实初始化和严格恢复

### 2.1 四份既有S宿主的限定改动

允许只修改`combat-types.ts`、`combat-composition.ts`、`combat-persistence.ts`、`combat-session.ts`，实现一个显式、受控、同步prepared写入模式。具体类型与命名由本批设计，但以下都必须成立：

- 不复制第二个buildCombatSession；不另建canonical current、规则归约器或持久化事件总线。v1/v2/v3、shared domain、旧v4 codec/schema/policy/expectation均只读。
- 旧composition的`storage.read/write`模式原行为保持，新模式须明确区分；无效／双写／异步组合在占用domain前拒绝。不能默认同时调用旧write与新writer，也不能新writer失败后偷偷fallback第二次写。
- 只有原P计划验真、完整R聚合与预编码之后，才由原commit／retrySave路径向唯一adapter同步交付同一份原text与checked expected。initial创建也走这条路径。交接对象不可变，不给普通玩家API安装权或raw current。
- expected必须来自原S真实初建／验真后的提交编排；不得在adapter或冷loader调用`combatCommittedExpectation`，不得读取v4Text.state来制造锚。原exact expected／same-progress committed验证不放宽、不裁剪死亡trace等字段。
- 默认提交顺序保持：准备全态→current一次替换→一次writer尝试→原生一次通知。write失败仍保内存，不变成回滚或重新提案；retry只验证／编码／写当前值，无规则、随机、身份、额外current或玩法通知。
- 同步端口的异常、非undefined/thenable等非法返回，分别按现有失败语义处理；不能await S存储端口。Web Locks获取／持有可在外层异步，但不把规则提交改成跨await事务。
- 回调重入、错误隔离和旧导出清单保持。新受控类型可从指定已有类型文件或新browser模块引入，不为便利扩大普通index的raw能力。

### 2.2 应用外壳和材料

本批在新browser模块定稿严格的reservation/checkpoint技术外壳、key和版本，写入实施记录及支持矩阵；这是已有合同内的应用存储结构，不变更领域v4三键format/formatVersion/state。不得自动接受旧headless格式或迁移旧医院。

reservation只保留身份、execution/seed、明确初选、唯一委托／声明、受支持版本与slot/generation占用。checkpoint配对完整expected和原v4Text，绑定同一reservation；不另存整份body/inventory/wallet/current。generation是技术初始化绑定，不是新任务、行动revision或规则随机。

角色身份、execution、seed只在玩家明确确认初配且当前持锁时经一次可注入环境熵边界生成。规则随机仍走原种子源，不使用系统时间/UUID/Math.random作为规则熵；环境身份熵与规则draw分别记录。世界、模板、具体委托和版本来自真实已批准content/registry，不根据磁盘候选任意选择版本。生产不得import TEST夹具或通过清敌／手设完成建立初态。

Setup查询、页面mount、普通subscribe不生成身份、不签发初配。可在尚未创建S的安全Setup应用态显示固定公开选项；确认后才能建立与新角色绑定的policy/composition。已有reservation／current不能改工具专长或重发。素材、网络服务、商城、身体服务和第二委托不纳入。

### 2.3 持锁启动与一次初建

- 未持有新世界独占前不创建S、生成身份、执行initial provider或写入；不要先启动一局再抢锁。
- 在锁内只读取两个指定新namespace记录。只有两者真正不存在才允许Setup。读异常为read-error；坏JSON、孤立reservation／checkpoint、错format/版本/身份/初选/generation为blocked，保留原字节；不得把异常转成null空档。
- 明确确认后先成功写reservation。写失败为0 initial provider／0初配／0checkpoint；成功后真实createFirst恰一次。首次物理写通常有reservation和checkpoint两次，分别计数；不能包装成只写一次。
- reservation成功但首checkpoint失败：本页保留已创建first-hub和save-failed，可显式retrySave；崩溃／刷新后孤立占用blocked，不补发、不自动删／回滚reservation。其它程序失败如导致部分初始化材料，应保守阻止，不发新身份自救。
- 冷恢复先验证外壳、reservation、静态版本和独立metadata，固定expected，再交S读取/解码v4Text。读取外层字符串时可能已取得payload字节，逻辑解码顺序和物理读取分开描述。
- 读失败重试重新在锁内取得一致的reservation/checkpoint对；不能沿用旧expected配新text。已有current不能第二bootstrap覆盖；唯一S仍保护同进度完整事实。

### 2.4 后续写入与保存故障

一次checkpoint用一次localStorage.setItem写完整配对字符串；不把expected与text分两键先后更新。输入原text保持，不重编码领域candidate来补字段；不得从通知中另写metadata。

保存失败保最新current及安全view，继续合法行动可产生较新内存；retry只保存当时最新完整配对，不重跑sample护具支付、随机来源、战斗、用药、日结、奖励或关闭。刷新只能读回最后成功持久化checkpoint，不承诺恢复未落盘内存、设备断电物理落盘、跨设备恰好一次或客户端抗篡改。

哈希可用于完整性诊断，但不是外部可信根。能改整套客户端记录／旧备份不在防作弊保证内；不能因此放松错配／损坏／孤立记录检查。无导出、清档、重建、自动repair或公开发布流程。

## 3. W3：合作页面独占与controller接线

### 3.1 全会话单writer

采用已定稿Web Locks exclusive方向，锁名与固定namespace/slot对应，不含每页随机后缀逃避竞争。使用非抢占的可用性检查；未取得时为占用页，0 S／身份／provider／写入；无能力或非支持安全环境阻止入口，不用localStorage布尔、TTL、时间戳、storage-event或进程内domain假装跨标签互斥。

锁在整个可写会话持有，不是只包住每次setItem。显式重试竞争不能暗中排队后自动续接旧内存。写入口也校验当前有效lease／世代，失效后旧闭包不能写。真实同时竞争、同源frame以及释放后接手必须测试。

### 3.2 页面生命周期与失效

明确document关闭、导航离开、pagehide/pageshow、BFCache恢复、测试页崩溃及重取锁策略。失去／主动释放独占时先禁用所有旧写意图和确认草稿；重新可写只能持新lease并冷恢复最后成功checkpoint，不能安装旧失锁current。旧对象句柄、确认token及旧browser wrapper捕获函数不能跨新owner继续执行。

允许必要时在`infected-preplay/controller.ts/types.ts`增加最小停用／unsubscribe/dispose接缝；必须默认行为兼容，旧测试原字节保持。优先由新browser生命周期包装器阻断旧调用，不新增控制器canonical、通用事件系统或修改D1／安全三态／支付公式。不能靠渲染时创建新S或复用失效scope解决。

只对合作页面和已测同源存储分区负责。无法在当前浏览器真实命中BFCache或崩溃场景时，应把实测、模拟事件和NOT RUN分栏，不能自动关闭该Gate；不要为了得到命中修改产品规则或默认CI。安全停用／重获逻辑必须至少有原生自动回归。

### 3.3 稳定安全展示

browser owner只对上层暴露安全应用状态／既有PreplaySnapshot和显式控制命令，不暴露reservation内部身份、seed、expected、raw current或v4Text。保存反馈仍来自唯一S；锁／加载／unsupported属于应用态，不伪造角色死亡或无档初配。

明确执行、确认、草稿、取消、retryRead/retrySave、synchronize均通过已审controller和有效lease。正常结果返回后再发布ready；原生通知中的blocked不当最终UI状态。不为刷新重发命令，重试保存同current保留选择意义。旧医院默认入口、旧槽及其S一律不触碰。

## 4. W4：真实证据、回归、负控与交付

### 4.1 B01—B10映射（不能只交headless字符串端口）

| Gate | 必须证据 |
| --- | --- |
| B01 | 真空两记录→公开Setup→明确确认→reservation→真实初配→首次出发；双击/mount重复不发物，记录熵/provider/S创建/两类物理写次数 |
| B02 | 旧text模式完整兼容；新prepared单写／冻结／非双写；cold expected在领域candidate解码前固定，错pair不会自证 |
| B03 | first-hub／稳定世界／合法战斗决策／living-hub／dead五停点真实浏览器刷新；三敌实际战斗继续等值，双方归零和敌仍活死亡均覆盖 |
| B04 | 坏JSON／格式／版本／generation／身份／初选／battle／closure／缺metadata／孤立两记录，blocked且保留字节；读异常不当空档 |
| B05 | reservation失败、首checkpoint失败、后续来源／战斗／样本护具／终局写失败；继续、retry最新、崩溃恢复最后durable，独立计数 |
| B06 | 已有current禁二次加载；same-progress保护保持；retry／冷恢复0规则重放、0额外日结／奖励／关闭；旧opaque拒绝 |
| B07 | 真实同源同存储分区两tab同时竞争及明确重试；未持锁0 S/provider/identity/write；同源frame对照，不能用两个隔离context假装竞争 |
| B08 | 关闭/导航释放、测试页崩溃、BFCache实际状态和失效重取；旧lease/请求拒绝；不支持能力保守阻止；模拟与实测分别记 |
| B09 | 独立namespace，无扫描/读写旧医院键；TEST sentinel不变，旧默认入口／构建行为保持；安全snapshot不泄露内部材料 |
| B10 | 实测默认基线、定向/组合/全量check、语义负控、输入/范围/前缀/字节审计、真实浏览器及准确SHA CI |

至少两条真实会话链：A从真正空档，经三敌／真实任务／提取支付／安装／H0成功，插入合法战斗及任务checkpoint刷新；B真实退却→立即维修→医疗→休整→再入→止损或真实死亡，插入write失败和冷恢复。全部经实际browser owner→controller→facade→S dispatch；不得清敌、手设完成、替换current或覆写规则RNG。可用明确标注的可注入环境seed作为可复现测试；真正默认crypto启动另测。合法HP/期限边界可用经完整聚合的受控TEST checkpoint并单独标注，不包装成read-null长链。

只读窗口统计 query/preview/cancel 不触发生产／CTB/G1/G2/draw/authority/发物/dispatch/IO；已明确启动的读取、环境身份生成与reservation写另计，不错误要求bootstrap零IO。分别记录checkpoint写、reservation写、S current替换、原生通知、Presentation更新、重试和新owner恢复。

### 4.2 真实浏览器执行方式

生产模块不接React/DOM，不改App/main/application-entry。允许在本任务docs/validation下提供TEST-only HTML/TS harness，由现有Vite或隔离本地服务加载真实模块，使用真实localStorage和navigator.locks；不是新的玩家DEV入口。入口、脚本和报告必须标TEST-only，公共构建不注册。

优先使用实际可用自动浏览器／独立profile／CDP。runner须先检查路径和进程归属，只管理自己新启动的临时profile及页，不接管用户已有浏览器，不删除用户数据。原始日志、截图和trace可以放仓库外，仓库报告写确切路径／摘要／平台；不得提交浏览器二进制或巨大缓存。没有截图不能伪造；无可用工具写NOT RUN/阻塞原因，不让Owner先逐步手操作当自动通过。

quota/read/write异常注入允许在TEST端口包装器完成，但须区分“真实浏览器IO＋注入失败”与真正OS权限／配额／断电实测；不得用mock LockManager冒充实际跨tab锁。真实关闭／重开可自动化；只可崩溃自建TEST页，不终止Owner正在使用的浏览器。

### 4.3 语义负控与全量

至少三类仓库外变异，逐个恢复后复跑：取消expected/payload绑定→错配档误接受被断言检出；移除独占门禁→第二writer被断言检出；retry重放→规则／current／资源或通知计数异常被断言检出。每类记录具体用例、真实exit和AssertionError；导入/fixture/type/timeout或自动化连接失败不能算语义检出。正式提交不含变异。

执行默认`npm run test:run`基线；定向新单元、跨S/P/R/controller组合；原基础75项、R1的43项、玩家查询、E03四路线/72固定样本及旧格式/生命周期回归；默认`npm run check`必须执行。统计新增/替换/删除/净增；原测试和helper只读，不删断言或偷偷加worker/global timeout。保留已批准局部30秒预算；本任务新完整长链可在单个新用例指定30000ms，记录具体调用，不扩大旧文件预算。失败必须保留，不挑选一次绿灯掩盖。

完成功能／headless不等于浏览器通过。若真实浏览器Gate未执行或失败，仍报告准确实现与原因，可普通提交授权内已验证产物，但状态必须WITH_FINDINGS/BLOCKED，不能自动进入UI；真正规则/权限冲突停止相关修改。

## 5. 范围、白名单与Git

禁止修改：DEC/UIR与正式合同正文；数值/内容定义；P规则/随机；R codec/schema/policy/expected和v4格式；shared domain与旧v1—v3；原75/43及全部既有测试/helper；旧医院默认入口/存储；依赖、CI、全局预算。未列路径不得自行扩权。

仅6份既有生产宿主可按上文窄适配，其中controller两份是可选而非必须。其余新模块均属应用/适配，不进入pure core。四份共享文档只末尾附记；不倒改基础R1、BLOCKED/RESUME-01和历史NOT RUN。浏览器合同已定稿，不新编DEC或新UIR。

本批所有新增差异必须原始exit0。起点至最终提交、普通/cached分别执行。自`ff2b79f…`累计只W02，原始exit2；自`8c19ca0…`累计只W01七处+W02一处，原始exit2。严格按归档RESUME-01-SCOPE及R1-SCOPE的路径/行号/告警/字节比对，不能排除inputs目录或改检查设置。发现本包新空白冲突保留原件报告，不自行再造W03。

最终默认检查和真实浏览器执行的源码必须与暂存、commit blob一致；保存原始失败、保护对象、契约/配置指纹、UTF-8、链接和循环依赖核查。npm audit镜像404／风险告警仍单列维护，不擅自npm audit fix，不把未查到当安全。

建议提交信息：`feat(app): add isolated browser residence owner`。仅普通commit／push `origin feature/world-browser-owner-001`；不推main/旧分支、不merge/force/amend。核对远端与准确新SHA CI，未完成／限制保持真实状态，不为CI结果重复commit。

交付完整SHA/parent/tree、实际基线与结果、B01—B10映射、冷expected独立来源、prepared单写兼容、五停点/跨tab/生命周期平台证据、独立计数、失败与负控、修改路径/字节/原件/W01/W02、模型实际档位能否核验、所有NOT RUN与停止点。模型推荐由Owner配置，不写入本任务要求。

## 6. 精确许可路径（63条）

1. `src/state/residence-session/combat-types.ts`
2. `src/state/residence-session/combat-composition.ts`
3. `src/state/residence-session/combat-persistence.ts`
4. `src/state/residence-session/combat-session.ts`
5. `src/app/infected-preplay/controller.ts`
6. `src/app/infected-preplay/types.ts`
7. `src/app/infected-browser/index.ts`
8. `src/app/infected-browser/types.ts`
9. `src/app/infected-browser/schema.ts`
10. `src/app/infected-browser/errors.ts`
11. `src/app/infected-browser/identity-materials.ts`
12. `src/app/infected-browser/initial-materials.ts`
13. `src/app/infected-browser/composition.ts`
14. `src/app/infected-browser/reservation.ts`
15. `src/app/infected-browser/checkpoint.ts`
16. `src/app/infected-browser/storage.ts`
17. `src/app/infected-browser/startup.ts`
18. `src/app/infected-browser/lease.ts`
19. `src/app/infected-browser/lifecycle.ts`
20. `src/app/infected-browser/owner.ts`
21. `src/app/infected-browser/snapshot.ts`
22. `src/app/infected-browser/identity-materials.test.ts`
23. `src/app/infected-browser/initial-materials.test.ts`
24. `src/app/infected-browser/schema.test.ts`
25. `src/app/infected-browser/storage.test.ts`
26. `src/app/infected-browser/startup.test.ts`
27. `src/app/infected-browser/reservation.test.ts`
28. `src/app/infected-browser/checkpoint.test.ts`
29. `src/app/infected-browser/lease.test.ts`
30. `src/app/infected-browser/lifecycle.test.ts`
31. `src/app/infected-browser/owner.test.ts`
32. `src/app/infected-browser/privacy.test.ts`
33. `src/app/infected-browser/faults.test.ts`
34. `src/app/infected-browser/purity.test.ts`
35. `src/app/infected-browser/continuation.integration.test.ts`
36. `src/app/infected-browser/longchain.integration.test.ts`
37. `src/app/infected-browser/test-fixtures.ts`
38. `src/app/infected-browser/test-observers.ts`
39. `src/state/residence-session/combat-prepared-persistence.test.ts`
40. `src/state/residence-session/combat-prepared-compatibility.test.ts`
41. `src/state/residence-session/combat-prepared-reentry.test.ts`
42. `src/app/infected-preplay/browser-lifecycle.test.ts`
43. `docs/03-architecture.md`
44. `docs/08-rule-implementation-traceability.md`
45. `docs/design-drafts/world-infected-001/10-decision-queue.md`
46. `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
47. `docs/engineering/world-integration/preplay/browser-owner/completion.md`
48. `docs/engineering/world-integration/preplay/browser-owner/implementation-notes.md`
49. `docs/engineering/world-integration/preplay/browser-owner/contract-and-support.md`
50. `docs/engineering/world-integration/preplay/browser-owner/verification-results.json`
51. `docs/engineering/world-integration/preplay/browser-owner/browser-results.json`
52. `docs/engineering/world-integration/preplay/browser-owner/validation/browser-harness.html`
53. `docs/engineering/world-integration/preplay/browser-owner/validation/browser-harness.ts`
54. `docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases.ts`
55. `docs/engineering/world-integration/preplay/browser-owner/validation/browser-navigation-target.html`
56. `docs/engineering/world-integration/preplay/browser-owner/validation/run-browser-checks.mjs`
57. `docs/engineering/world-integration/preplay/browser-owner/validation/README.md`
58. `docs/engineering/world-integration/preplay/browser-owner/inputs/ENG-WORLD-BROWSER-OWNER-001-task-v1.0.md`
59. `docs/engineering/world-integration/preplay/browser-owner/inputs/OWNER-authority-and-scope-ENG-WORLD-BROWSER-OWNER-001-v1.0.md`
60. `docs/engineering/world-integration/preplay/browser-owner/inputs/AUD-bc60f24-ENG-WORLD-PREPLAY-FOUNDATION-001-R1-review-v1.0.md`
61. `docs/engineering/world-integration/preplay/browser-owner/inputs/BASELINE-AND-INPUTS.json`
62. `docs/engineering/world-integration/preplay/browser-owner/inputs/verify-task-package.py`
63. `docs/engineering/world-integration/preplay/browser-owner/inputs/SHA256SUMS.txt`

全部新目录均为本任务候选写入位置，不表示它们在起点已经存在；普通详细实现可在许可集合内选择，不要求堆满文件。若必要修改仍在集合外，报告具体源码接缝与最小扩围，不自行改规则或切换技术栈。
