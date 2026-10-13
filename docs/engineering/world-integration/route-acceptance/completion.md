# ENG-WORLD-ROUTE-ACCEPTANCE-001（E03-A）作者完成报告

执行交付：COMPLETE_WITH_FINDINGS。世界路线Gate：四条各有真实默认RNG成功见证，作者原生验收PASS；不代表完整E03、玩家体验或主线准确SHA实审通过。查询与维护发现见下文，不自动进入下一批。

## 基线与测试

起始SHA：713dd376ddb60d20d9afaedaee4505e695f89d94；起始父SHA：29a018a2ad64f8d5cbe56257381568bf3527cd08；起始tree：7839313a3e2475c93ae73c4dda9761a57c81ef3f。来源 feature/residence-combat-session-001，初始工作区／暂存区干净；新分支 feature/world-route-acceptance-001。实际 baseline：229 files / 4194 tests，exit0，263.71s。

新增12测试文件、112测试；替换0、删除0、净增112。新增6个TEST-only helper。最终 npm run check：241 files / 4306 tests，exit0；test部分398.49s。Architecture 52 DEC / 329 core production files，typecheck和build均PASS，保留原有大chunk告警。命令级 workers=2，完成恢复环境，无超时／配置更改。仓库外补充query-zero一个原生探针另计，不纳入4306。

## 四路线真实见证

| 路线 | Seed / 工具 / 专长 | S dispatch | write / notify（含首次创建） | 终局 |
| --- | --- | ---: | ---: | --- |
| route-hotel-bypass | E03-A-seed-01 / crow / engineer | 75 | 76 / 76 | success / 120；Day4；HP7 |
| route-hotel-benefit | E03-A-seed-04 / lamp / survival | 91 | 92 / 92 | success / 120；Day6；HP8 |
| route-segmented | E03-A-seed-01 / crow / survival | 90 | 91 / 91 | success / 120；Day6；HP10 |
| route-toolbox | E03-A-seed-01 / toolbox / engineer | 80 | 81 / 81 | success / 120；Day5；HP7 |

四链全从真实 read-null、批准初配、首次出发开始，S逐动作提交。无初粮／中途补给／清敌／手设完成／覆写RNG。最终真实指定样本、组件与设施交付经正式终局结120；酒店旁路C4不把C2敌人判死。酒店真实H2消毒剂换粮并真实A休整；分段真实伤敌、退却、即时维修／休整后原敌再入不重置；工具箱专业电子显式拾取后真实维护消耗，再实际获取C4电子供安装。见[逐动作 ledger](route-ledger.md)、[结构化结果](route-results.json)及[九组合](nine-combinations.md)。

## 默认种子与条件失败

三工具×三专长×共同8种子=72条；每组7成功/1死亡，总63成功/9真实死亡（seed05），不是总体胜率、最优策略或每组所有seed可胜承诺。未剔除失败。侦察核对3E对普通4E、工程手工10E对14E、生存首次绷带2HP对普通1，均从正式配置取值并经真实行动验证；工具实际耐久／照明电量／维护材料竞争不同。后续绷带1、跨日／cold不刷新由本批真实状态与原测试共同锁定。

酒店搜索实际8种子，预算64；04/07自然有消毒剂，最终04见证。01没有消毒剂时路线止步、正式交易拒绝0提交，不误报委托失败／死亡。04/07最初粮格冲突、分段basic→escape死亡与工具箱取错同名电子的harness问题均保留探索记录；仅修新TEST策略／选择器，不调规则。seed05可能更早治疗／H2药物普通替代尚未完整试跑，不称全局无解。

## 压力、恢复与故障

新增原生覆盖E0免费自救及付费移动拒绝、正E最后一次超余额行动、真实来源越界／重叠零提交、任务件留地跨日真实取回、错误快捷目标、一次来源、合法失败止损、Day7返回／截止／死亡及不造Day8。已安装／交付不能复用、缺材料、后续绷带、充电兼容／额度及cannot-carry真实转移复用全量原测试原字节，不重复计新增。新28/29检查是孤立背包几何与正式classifyLoad，不冒充真实世界获得28负重的S长链。

四路线分别在活动战斗／酒店交换／即时维修停点冷恢复，另有退却、组件、安装、终局完整停点。expected来自读取候选前留存的成功提交与独立初始材料，完整值及后续实际命令结果相同；cold不重放玩法、不写或通知。

混合故障链：6正式dispatch（4 CTB、1战外药物、1移动），6失败write、6通知；一次retry后write attempts=7，通知仍6，最新current保持；retry observed gameplay/draw=0，不回滚／重读／重复药耗／重清算。完整结果再decode等值。导出函数spy与注入draw为实际可观察边界，不宣称测到所有不可见词法调用。

两轮冻结18份TS摘要 266a0fb31f489df425c90bc3deddf3d1dec17d976b7139e0b1829f687b8ab05d；12files/112tests各PASS（186.21s、185.85s），85证据文件逐字节相同，组合摘要 dcafbf5799ea383bacd5f1f768e690f35ba60804292cbad65961bfe3862a1d9e。defaultResults.normalizedTraceSha256是compact JSON.stringify+LF摘要，不是pretty原文件摘要；witness sha256为原文件摘要。

仓库外两类语义负控实际AssertionError检出：费用13对正式12、恢复后完整balance错误；exit1/2失败，不是导入／fixture故障，也不假称生产bug。所有旧生产字节不改。

## 当前查询与下一契约候选

[字段矩阵](query-field-matrix.json)24项：supported3、partial12、not-supported9。实际同知识不同seed／隐藏infection成对probe一致；补充原生探针将S/P combat+terminal与G2 knowledge全部置于观察窗口，producer/draw/write/notify=0，current完整值和引用保持。初稿外部probe错误断言view wrapper引用，实际getState正常创建新包装对象；改为完整比较并单独核对current引用后PASS，保留修前日志，没有生产改动。

真实item selector编码含seed，wound selector含execution；完整getState含隐藏事实，不能当普通ViewModel。旧G2 sources为空且调查witness/完整来源／容器／任务／身体提示／敌公开阶段与相对timeline缺口不冒充完成。[查询合同](query-contract-draft-v1.0.md)与[下一单项工程合同](next-engineering-contract-draft-v1.0.md)均DRAFT，含精确候选路径、接口、不变量、反例及停止点；无新增Owner玩法采纳，若扩大知识或精确未来承诺需另审。

## 维护与未关闭门槛

镜像audit 404 NOT_IMPLEMENTED；命令级官方registry只读核查exit1：2 moderate/3 high，共5项（mocker、vitest、nanoid、source-map-js、undici）。lock均dev=true，但不可据此称安全，可利用性NOT_ASSESSED；npm ls exit0，未upgrade/audit fix/改CI。实际build仍有>500kB chunk；Actions Node20提示为CI155历史材料，不冒充本提交CI。详见[只读审计](maintenance-readonly-audit.json)。

安全query生产、低资产UI、浏览器存储／独立启动材料、多标签、O3、Owner九组合及分段突破体验均OPEN/NOT RUN。详见[首玩／发布Gate](first-play-and-release-gates.md)。不接第二委托或新内容，不自动批准后续工程。

## 范围与验证记录

只用38许可路径：34新增、4既有文档末尾追加；原1353受保护tracked文件字节不改，四文档原始字节前缀保留，5输入原件摘要一致。生产代码／旧测试／helper、DEC、规则参数、保存格式、AGENTS、依赖与CI均未修改；新helper无生产导入、无新helper循环。UTF-8及相对链接作最终文件集核验。

增量diff-check exit0；cached检查与最终文档architecture按[验证记录](verification-results.json)及提交后回执。累计自8c19ca0 diff-check保留真实exit2，只原两输入7处硬换行；本批0新增例外，原件不改。初稿四追加文档末尾空行已按本批范围修正，未改历史前缀。

外部实测日志、两次raw证据、失败探索及负控保留于 C:\Users\zjl\AppData\Local\Temp\e03-acceptance-e84d975f4a204cb29f1875f0f58b4828；文件大小与摘要见验证记录。未保存的早期Day7独立日志明确不补造；部分stderr仅实际终端记录可见。重跑可命令级设置 E03_REPORT_DIR 至仓库外存在目录，执行 acceptance 12测试文件；普通CI不会写跟踪文档。

## 修改路径（完整）

- src/content/infected-world-v0.1/acceptance/e03-test-harness.ts
- src/content/infected-world-v0.1/acceptance/e03-test-routes.ts
- src/content/infected-world-v0.1/acceptance/e03-test-policy.ts
- src/content/infected-world-v0.1/acceptance/e03-test-seeds.ts
- src/content/infected-world-v0.1/acceptance/e03-test-observers.ts
- src/content/infected-world-v0.1/acceptance/e03-test-report.ts
- src/content/infected-world-v0.1/acceptance/route-hotel-bypass.integration.test.ts
- src/content/infected-world-v0.1/acceptance/route-hotel-benefit.integration.test.ts
- src/content/infected-world-v0.1/acceptance/route-segmented.integration.test.ts
- src/content/infected-world-v0.1/acceptance/route-toolbox.integration.test.ts
- src/content/infected-world-v0.1/acceptance/nine-combinations.integration.test.ts
- src/content/infected-world-v0.1/acceptance/seeded-outcomes.integration.test.ts
- src/content/infected-world-v0.1/acceptance/failure-branches.integration.test.ts
- src/content/infected-world-v0.1/acceptance/capacity-materials.integration.test.ts
- src/content/infected-world-v0.1/acceptance/cold-continuation.integration.test.ts
- src/content/infected-world-v0.1/acceptance/knowledge-boundary.test.ts
- src/content/infected-world-v0.1/acceptance/lifecycle-boundaries.integration.test.ts
- src/content/infected-world-v0.1/acceptance/harness-contract.test.ts
- docs/engineering/world-integration/route-acceptance/completion.md
- docs/engineering/world-integration/route-acceptance/implementation-notes.md
- docs/engineering/world-integration/route-acceptance/verification-results.json
- docs/engineering/world-integration/route-acceptance/route-results.json
- docs/engineering/world-integration/route-acceptance/route-ledger.md
- docs/engineering/world-integration/route-acceptance/nine-combinations.md
- docs/engineering/world-integration/route-acceptance/query-contract-draft-v1.0.md
- docs/engineering/world-integration/route-acceptance/query-field-matrix.json
- docs/engineering/world-integration/route-acceptance/next-engineering-contract-draft-v1.0.md
- docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md
- docs/engineering/world-integration/route-acceptance/maintenance-readonly-audit.json
- docs/engineering/world-integration/route-acceptance/inputs/ENG-WORLD-ROUTE-ACCEPTANCE-001-task-v1.0.md
- docs/engineering/world-integration/route-acceptance/inputs/OWNER-authority-and-scope-E03-A-v1.0.md
- docs/engineering/world-integration/route-acceptance/inputs/AUD-713dd37-ENG-RESIDENCE-COMBAT-SESSION-001-review-v1.0.md
- docs/engineering/world-integration/route-acceptance/inputs/BASELINE-AND-INPUTS.json
- docs/engineering/world-integration/route-acceptance/inputs/SHA256SUMS.txt
- docs/03-architecture.md
- docs/08-rule-implementation-traceability.md
- docs/design-drafts/world-infected-001/01-world-overview.md
- docs/design-drafts/world-infected-001/10-decision-queue.md

## Git与停止点

普通commit及push仅 feature/world-route-acceptance-001；不merge/rebase/amend、不推main／旧分支、不强推。最终完整SHA、父SHA、tree、远端与CI实际状态在提交后回执，不为自引用SHA循环改文档。交当前WebGPT主线准确SHA原生路线／查询契约实审后停止。
