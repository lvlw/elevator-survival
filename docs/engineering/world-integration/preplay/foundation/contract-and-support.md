# Foundation 作者支持合同

起点 `ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`；2026-10-22。本文件记录作者实现，不替代准确 SHA 主线实审，不改正式合同。

## F01—F10

| 验收 | 实际 owner／边界 | 原生测试 |
| --- | --- | --- |
| F01 当前病程与五停点 | queryPublicInfectionCondition / playerSupplyFacts；supported: bound infection_damage current band; no current/blocked has no fake body | src/core/character-cycle/public-condition.test.ts; src/state/residence-session/player-condition.test.ts |
| F02 费用、物耗、机制 | qualifyPlayerCommand / queryPlayerActionMetadata；supported: public HP/E/satiety/quotas, tool payment, selected materials, task output geometry, actual capped heal, shared maintenance pool; hidden medical target unknown | src/core/residence-supply/player-metadata.test.ts; src/state/residence-session/player-safety.test.ts |
| F03 完整意图安全与保护 | queryPlayerCommandDeath / createPlayerPreplay；partial by proof: public own bleeding/current single response/nonfatal branch; unknown for hidden kill cancellation, later hidden response, future cycle and unobserved arrival | src/core/residence-combat/player-safety.test.ts; src/state/residence-session/player-safety.test.ts; src/app/infected-preplay/confirmation.test.ts |
| F04 稳定安全缓存 | createPreplayController / preplaySnapshot；supported: referentially stable reads; native blocked is not final ready | src/app/infected-preplay/controller.test.ts; src/app/infected-preplay/purity.test.ts |
| F05 显式启动与初配 | existing S bootstrap/createFirst through controller；supported: read-null then real first stock, repeat rejected, broken/read-error no regrant | src/app/infected-preplay/initialization.test.ts |
| F06 单飞与一次提交 | controller run/execute -> player.execute -> original S；supported: one execute/dispatch/write/notice; native and presentation notices separate | src/app/infected-preplay/controller.test.ts; src/app/infected-preplay/persistence.test.ts |
| F07 草稿与确认失效 | PlayerContext.scope / draft and confirmation stores；supported: request/scoped identity; new current invalidates even equal public facts; retrySave preserves | src/app/infected-preplay/drafts.test.ts; src/app/infected-preplay/confirmation.test.ts |
| F08 隐私、Feed、错误 | publicActionFeed / publicPreplayError；supported: safe differences only; program/AssertionError/code-shaped Error propagate; listener failures isolated and counted | src/app/infected-preplay/feed-privacy.test.ts; src/app/infected-preplay/errors.test.ts |
| F09 真实两链、恢复、故障 | original P/R/S and controller；supported headless: success, retreat-repair-treatment-rest-reentry-failure, five cold points, enemy-alive/both-zero death, failed save/retry | src/app/infected-preplay/longchain.integration.test.ts; src/app/infected-preplay/persistence.test.ts |
| F10 零作用、负控、默认全量 | 默认完整 check 267 files／4444 tests、三类负控、保护路径及测试字节通过；提交 BLOCKED：不可改任务书原件第 249 行 EOF 空白使 staged diff 检查失败 | src/app/infected-preplay/purity.test.ts |

[完整字段／metadata 支持矩阵](metadata-support.json)。原 24 字段不删，D1 成为当前粗档的已实现只读投影；未实现浏览器或 UI。

## 安全证明边界

完整请求先经原 opaque 解析和正式纯资格；安全与资格独立。稳定付费动作由同源行动流血标量给出保证死亡或稳定生还依据，免费药食先处理真实目标且不触发付费流血。H0 正常返回不补夜。

活战斗只用正式确定性 primary 与 checkpoint：自身主要效果先于自身流血；当前公开敌意图的一次响应复用原防护／防御／伤害 owner。敌人 HP、未来 RNG、隐藏后续意图不参与提示。退却分别保留可能流血／不流血完成分支；存在正式非死亡分支即 not-guaranteed，不把“可能死”机械归 unknown。攻击能否通过击杀取消敌响应仍 unknown；多次未来响应、隐藏医疗与周期结果不伪装安全。

动态确认仅在 guaranteed 且找到同上下文、完整合法的 not-guaranteed 替代时成立；unknown 不是非必死替代。静态保护覆盖终局关闭与任务物留置；参数草稿不等于一律二次确认。保护绑定原请求、全部参数、opaque 上下文和 metadata；不重选同名对象或刷新旧授权。

合法替代证明涵盖当前战斗动作、明确药食目标、合法免费背包／快捷栏／已揭示地面物迁移、正常 H0 返回。几何候选仅在内部证明“存在合法替代”：有限锚点和允许旋转交给正式 qualifier，不返回默认位置、推荐、草稿或执行操作，不自动整理。自查中发现并实际修正“药物无临床目标但可免费移回背包”的遗漏，修前断言失败、修后通过且查询零副作用。

## 应用与失败

唯一 S 不变。controller 无 Storage/current/codec 端口，仅缓存深冻结安全 view、应用忙态、明确草稿、最小安全错误与 session-local Feed。稳定 getSnapshot 返回同引用；读／取消不启动或保存。原生通知只失效，不拿 busy 回调当最终 ready；显式正常返回后消费 result.view。

一次玩法执行只有一次 player.execute、一次原 S dispatch/write attempt/native notice；Presentation busy/ready 另计。新 current 即使公开数值相同也清旧草稿；同 current 的 retrySave 保留选择意义且不记玩法 Feed。无目标拒绝保留有效草稿。传入参数以描述符先验检查和纯副本保留 opaque 引用，不读 getter、不冻结原对象。

保存失败保最新内存，retry 不重放；投影失败屏蔽旧可执行视图。程序／AssertionError／带 code 的普通 Error 原样可观察，但公开快照仅保留通用安全错误，不暴露原始堆栈或身份。监听失败隔离并由 listenerFailures 计数，不导致再次结算。

## 两条真实长链

都从真实 read-null、初配、出发开始，所有玩法命令经 controller→facade→S；TEST bridge 将保护确认作为独立步骤，故意缺材料请求保持拒绝。

- 成功链：75 dispatch／76 writes／76 native notices／155 Presentation 通知／3 draws；真实 CTB、样本、安装、交付；正常返回 steps=[]。
- 退却链：15 dispatch／16 writes／16 native notices／5 draws；入场前取得材料，退却后立即维修、治疗、休整、再入，再明确止损。

上述为原生自动验收，不是浏览器、跨标签或 Owner 体验。五停点 cold expected 来自候选之前已有的受控 TEST 材料／真实生产者记录；无 current 安装越权。双方归零保真实击杀／none，敌仍活死亡保 combat-required；只安装最终 dead 一次。

## 未执行与维护

浏览器存储、prepared checkpoint handoff、Web Locks、多标签、React/DOM、DEV 入口、Owner 首玩均 NOT RUN，O3 未决定。npm audit 只执行一次：镜像 security API 返回 404 NOT_IMPLEMENTED、exit 1，最新 advisory 与可达性 UNCONFIRMED；未 audit fix、未改依赖。历史 CI162 审计摘要不是本轮风险结论。

最终默认完整 check PASS：267 files／4444 tests，330.43s；53 DEC／345 core production files，typecheck/build PASS（保留既有大 chunk 构建告警）。基线 252 files／4369 tests。新增 15 个测试文件／72 项，旧 D1 跨档正控净增 3 项；最终净增 75 项。完整记录见 [作者完成报告](completion.md) 与 [机器可读核验记录](verification-results.json)。不把旧结果或历史负控累计为本轮。

提交验收尚未通过：原字节任务输入的 EOF 空白与“新差异必须干净且不扩大 W01”冲突，未 commit／push。功能测试通过不等于本轮完整交付 PASS。

## RESUME-01：W02 授权续办与当前交付状态

2026-10-22。此前 BLOCKED、失败与 exit 2 段落保留为真实历史；本节是后续限定处置，不覆盖历史，不表示主线源码实审 PASS。依据 [续办任务书](resume-01-inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-RESUME-01-v1.0.md) 和 [精确范围](resume-01-inputs/RESUME-01-SCOPE.json)。

- 沿用原 HEAD `ff2b79f332c5ea2bec493eb5e166dcee6ba667eb` 及原工程分支，不重建、不回退。初始 55 项暂存与 5 份未暂存记录得到本机重新核实；未发现仍运行的原任务命令。
- 本次只编辑五份作者记录、原字节归档四份补充文件；不修改实现／测试。累计 59 文件（13 modified／46 new），最大许可 71 路径，不是开放整个目录。原七件输入及历史 W01 两件均保持原字节／blob。
- 本次默认完整 `npm run check`：exit 0，267 files／4444 tests，246.07s；53 DEC／345 core production files，architecture／typecheck／build PASS。未改 worker、预算或配置，保留原大 chunk 告警。
- 原始基线 252／4369、原实现最终 267／4444 各保留；原工程净增 75 项不重复累计，本次续办新增／替换／删除／净增生产测试均为 0。此前负控本次 NOT RE-RUN，完整 suite 中的旧回归仍实际执行。
- 884 项已测试源码／配置的工作树 SHA-256 一致；本工程新增／修改源码及测试的索引原字节一致，未改动的旧文件索引 blob 保持基线。首次外部审计误把旧 CRLF 工作树等同于 LF Git blob，定位后按既有 attributes 与原基线分别核对，未修改任何文件／Git 配置来通过。

### 完整原始空白检查

| 命令 | 原始 exit | 告警数 | 判定 |
| --- | ---: | ---: | --- |
| `git diff --check` | 0 | 0 | 精确匹配 |
| `git diff --cached --check` | 2 | 1 | 精确匹配 |
| `git diff ff2b79f332c5ea2bec493eb5e166dcee6ba667eb --check` | 2 | 1 | 精确匹配 |
| `git diff --cached ff2b79f332c5ea2bec493eb5e166dcee6ba667eb --check` | 2 | 1 | 精确匹配 |
| `git diff 8c19ca0d28058cf743b41c8547cc2629c8eac767 --check` | 2 | 8 | 精确匹配 |
| `git diff --cached 8c19ca0d28058cf743b41c8547cc2629c8eac767 --check` | 2 | 8 | 精确匹配 |

W01 仍仅原两输入七处 trailing whitespace；本次 W02 仅原任务书第 249 行 `new blank line at EOF.`。该原件保持 24083 bytes、SHA-256 `c8b7fba85afd741b871b4022d9824744938e1f38cfee16bce36bf06dd26f5325`、blob `85a39b34c414952cfc30005b4f76b483bb019a42`。核准例外判定为 **PASS_WITH_APPROVED_W01_W02_ARCHIVE_EXCEPTIONS**，不是把原始 Git exit 2 改称 0，也不是主线工程验收。没有整目录排除、改 whitespace 配置或新增其他例外。完整 stdout／stderr／退出码见 verification 的新增 resume_01 对象及仓库外原始记录。

### 提交边界与停止点

五份记录和四份补充文件按精确路径重新暂存；记录生成后再次暂存并重做全量范围、原件、字节及六条空白审计。只普通 commit／push 至 `origin feature/world-preplay-foundation-001`；具体最终 SHA／父 SHA／tree／远端／CI 由提交后回复及仓库外 receipt 提供，不为自身 SHA amend。此处记录的是已完成的提交前核验，不预称推送或 CI 已成功。

保存原有安全 unknown、浏览器／DOM／跨标签／Owner NOT RUN 和 O3 未决定。npm audit 的镜像 404 仍为 UNCONFIRMED，本次未重跑审计或升级依赖。后继浏览器 owner、UI 等不开始，停止等待准确 SHA 的源码／安全／应用更新实审。

## ENG-WORLD-PREPLAY-FOUNDATION-001-R1：R-M01 作者返修记录

2026-10-22；起始 `cc147cd253f3e7e57e45de265610becb64a74821`，沿用 `feature/world-preplay-foundation-001`。本节追加在 BLOCKED→RESUME-01 历史之后，不改写原失败／原支持声明，不表示当前 WebGPT 主线准确 SHA 已实审通过。依据 [R1任务](r1-inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-R1-task-v1.0.md)、[实审报告](r1-inputs/AUD-cc147cd-ENG-WORLD-PREPLAY-FOUNDATION-001-review-v1.0.md) 与 [精确29路径](r1-inputs/BASELINE-AND-SCOPE.json)。

### 真实基线与修前／修后

本机重新确认 HEAD／分支／工作区／索引干净，未见仍运行的原任务命令；两宿主与包内原源码的 SHA-256／Git blob 一致。默认 `npm run test:run` 实测 **267 files／4444 tests PASS，260.07s**，Node24.9.0／npm11.6.0／Vitest4.1.10，未覆盖 worker／全局timeout。

改生产前原字节运行原生模板，仅将 __REPO__ 替换为实际绝对路径并使用仓库外配置：10项中 **6个支付 AssertionError、4 PASS**，无导入／类型／fixture适配。不是把主线8项隔离执行当成本机原生结论。修复后同一模板10项全部PASS。

另外在改生产前保存8组原生P完整snapshot／draw调用：两方法×真实正常资源／合法TEST末次1／耗尽0／未装备。修后8组完整结果及draw参数逐项一致。真实正例从初配→出发→开门→真实入场和CTB胜利→H5取得；正常外套11→10，末次1→0。未装备TEST边界把同一真实外套移入背包并通过完整聚合，不删实例／ItemState／origin，不宣称已有玩家换装命令；本轮未创造其他未登记防具。

### 唯一保护／支付依据

新增纯内部 `querySampleProtection`（sample-protection.ts），唯一保留原方法索引、风险选择和“厚外套＋integrity正数＋确实降险”条件，支付额度仍读 wear.tool。原 shared-actions 消费该事实后依旧实际 consumeCommittedResource、来源／放置校验及原位置抽签；metadata只取 payment，再用原 previewCommittedResourceAction生成 name/kind/before/requested/consumed/after，不投影内部风险字段。没有试执行producer、签发或额外draw。

两种提取：正常及末次耐久支付1，末次仍本次完整保护；耗尽0／未装备无支付且合法提取仍可执行。不强制穿外套，不改费用、风险或资格。风险为无的谨慎防护仍0 draw；直接仍1 draw；未保护谨慎仍1 draw。两个旧宿主去除本次窄抽取／投影增量后逐字等于起点；完整原生结果相等补充证明旧行为兼容。

指定相邻支付映射实际核查／回归：crow与toolbox开门（正常／末次）、lit手电支付、真实门卡不耗耐久、机械维护单总池和真实材料、充电真实电池及封顶恢复、战斗武器支付。未声称这是整个系统所有费用的完整审计；没有发现该已读范围内需要越权修改的新宿主。

### 查询与提交独立计数

每一只读窗口在真实夹具建立后独立清零：core metadata／companion／controller preview／草稿取消，producer、CTB、G1/G2、随机、authority、来源／消费、dispatch／read／write／native notice及context创建均0；另断言资源consume为0。合法未冻结调用者经完整聚合校验后查询，不修改或冻结原对象。

每次明确提取：1 task、1 G1 action、0 G1 cycle、0 CTB、1 origin／sample、1 revision、1 dispatch／current／write attempt／native notice；适用护具consume恰1，不适用为0。正常／末次谨慎draw0、直接draw1；耗尽／未装备的两法各1。重复已消费请求、非法重叠／越界、跨会话及陈旧选择均整笔拒绝，拒绝窗口0 gameplay／IO。

两方法保存失败仍保已扣护具／真实样本及最新内存；retry只有aggregate2／encode1／write1，消费／动作／draw／原生通知均0，current与Feed同引用。隐私配对使用同公开病程档不同隐藏进度／pending及相反注入draw端口：完整安全视图／metadata相等；实际执行后直接暴露增量[1,0]、谨慎防护[0,0]。这是明确条件见证，不冒充新默认种子实验；没有输出risk百分比或隐藏暴露。

### 新测试、失败修订及负控

新增3份测试文件 **43项**；替换0、删除0、净增43，原75项及更早旧测试／helper逐字节保持。单纯外部模板／8组golden和主线隔离项不累计到生产测试增量。初次新相邻测试有不存在的H2-H3边、H3搜索漏显式method、门卡误用ordinary拾取和电池名称误写；新测试依真实内容／专用搬运修正，保留三轮失败记录。一次新测试TS联合类型收窄错误已在新测试内修复，不计语义检出。

本轮两类仓库外原生负控：删除sample支付投影→资源对照AssertionError；去掉耗尽条件→合法耗尽请求的“不抛错／无支付”断言检出AssertionError。每类仅选定1项业务断言失败，还原后各1项PASS；非导入／fixture／类型／超时。历史负控NOT RE-RUN、不累加。

组合回归 **40 files／307 tests PASS，209.19s**，包含原15文件基础测试、两条原controller长链、E03与选定P/R/S必要回归。最终默认 `npm run check` **270 files／4487 tests PASS，261.67s**；architecture53 DEC／346 core production files、typecheck、全部tests及build PASS。保留已有大chunk告警；未改依赖／CI／预算。

### 范围、原件、空白与交付

只使用29精确路径：2旧生产宿主、1新纯owner、3新测试、5作者记录、4共享文档末尾附记和14份原件。14输入原字节／摘要一致；旧正式合同、配置、D1、安全三态、controller、G1/G2、S/domain及v1—v4格式均只读。888项本轮被测源码／配置指纹保持，1562个非白名单原文件不变；7份Markdown历史前缀及旧JSON对象保留，无新增生产导入环。

R1增量与普通／cached diff-check必须原始exit0；自ff2b79f累计仅W02，原始exit2；自8c19ca0累计仅W01七处＋W02一处，原始exit2。完整stdout／stderr／诊断及精确指纹在verification新增r1对象及仓库外receipt保留；不改原件、不扩例外、不排除inputs或改检查配置。最终记录再次逐路径暂存后重核。

本记录在提交前形成；完整最终SHA／父／tree／push／准确SHA CI随提交后回复及外部receipt提供，不amend写入自身SHA。仅普通提交并推同名工程分支，停止等待主线专项实审。浏览器owner／UI／存储／多标签／Owner试玩NOT RUN，O3未决定；旧unknown保持。npm audit沿用此前镜像404的UNCONFIRMED，不重跑／升级依赖。
