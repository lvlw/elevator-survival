# 实读源码映射、历史状态与欠账

本轮基线：`d1d3b7927c6733cff709a4bfd617fb1e85e7485a`。根会话与两名只读专项Agent实际读取；下表blob由当前Git逐文件实取。源码／测试阅读不是执行验收。首核心主线PASS依据[准确SHA审查](inputs/AUD-d1d3b79-ENG-MISSION-LIFECYCLE-001-review-v1.0.md)，不是本轮重审后的新PASS。

## 生产能力定位

| 实读路径（仓库相对）／符号 | 基线Git blob | 可复用／不应移植的语义 | 后续消费者 |
| --- | --- | --- | --- |
| `src/core/mission-lifecycle/types.ts` · MissionExpectation / MissionLifecycleValue | `80a09ce5bdcb9cb1f511e5401a0bc7d9e9e9b851` | 唯一窄状态及完整期望；不拥有body/store | G3冷解析 |
| `src/core/mission-lifecycle/validation.ts` · readValue / readExpectation | `f38e559183f6034b7cf6f9a32f3fcdc628abc494` | 严格形状／绑定可复用；冷启动状态非独立事实 | G3 |
| `src/core/mission-lifecycle/queries.ts` · restoreMissionCandidate / listFirstEligibleMissions | `4db60fe34a3f1ee5a851051b1be4b05c561f34f1` | 同进度candidate；声明全集必须有事实，非安装 | G3 |
| `src/core/mission-lifecycle/controlled.ts` · createMissionScope / establishMissionFact / activateMission / terminateMission | `0b144aeb1cd8e91a46027a32a7cbdf30f15703ad` | 受控纯转移；首次初始化权需应用owner | G3完整协调器 |
| `src/core/mission-lifecycle/index.ts` · public exports | `4adeb6ac45fcc6b54809b883cf2db699c8ec883d` | 保持查询/candidate公共面，不暴露replace | G3 |
| `src/core/domain/run-identity.ts` · RunIdentity / createRunIdentity | `7daf5db838ed9ef943bfe9bf42213175d2985188` | 执行值可复用，Zod trim非严格新恢复保证 | G2/G3 |
| `src/core/domain/scene-instance-identity.ts` · deriveSceneInstanceIdFromRunFacts | `725fc80528f474427865e48d24deae277ab01c10` | currentDay进身份，不可新世界每日重造 | G2新锚点 |
| `src/core/config/deep-freeze.ts` · deepFreeze / DeepReadonly | `6bf80540f6701bb8a45dd1734b48ecc9b000b04c` | 冻结工具可复用，不授予安装权 | 全部 |
| `src/core/daily-state/index.ts` · exports | `71717a77511cdd8b8d3b154a6cdd1b753841e750` | 参考窄导出，不整体继承DailyRunState | G1 |
| `src/core/daily-state/daily-run-state.ts` · DailyRunStateSnapshot / createInitialDailyRunStateSnapshot | `68a9331b6da05c380c37fc7917aa1c1ab0785980` | 含mainSceneUsedToday与免费维护3，不能新日照搬 | G1/G3 |
| `src/core/daily-state/daily-medical-usage.ts` · createDailyMedicalUsageSnapshot | `38d8a685a91537f04c66e76fa4e2e9f3959c1861` | 次数验证可参考，重建权仅真实周期 | G1 |
| `src/core/condition/condition-types.ts` · PlayerConditionSnapshot | `288baf63034f21df0af19a774659cace0bad0f82` | 身体分层；感染另属当前world-threat，不复制成两份 | G1/G3 |
| `src/core/condition/health-operations.ts` · applyHealthLoss / restoreHealth | `4cacd254d48ead12e41fa87ee53159b187a829f0` | 损伤截0可复用；restoreHealth自身不拒HP0，医疗入口须无复活守卫 | G1 |
| `src/core/world-threat/world-threat.ts` · getWorldThreatStage | `ebfffa12f685e84c4829350f963fb256209f30ff` | 旧terminal使base0且终末语义；不能新I>=120仍活直接复用 | G1新病程 |
| `src/core/daily-settlement/daily-settlement.ts` · buildDailySettlementTransitionPlan / resolveDailySettlement | `57b17e2d06dc2edebc1b63494e4b208ab91976d1` | 参考前提→计划→后态；旧Hub/day7/mainScene/回血清伤不移植 | G1 |
| `src/core/scene/timed-scene-action.ts` · previewTimedSceneAction / resolveTimedSceneAction | `b8e01473e7fe49d3ef0c949fa0b77b2938195875` | 开始与完成分离可参考；旧超时债/归零强返不可改名E | G1 |
| `src/core/scene-launch/scene-launch.ts` · buildSceneLaunchTransitionPlan | `9ea048f3ce00d7aefbb47e7620a85af5451d5884` | 每日一次并重建Scene/搜索/知识/战斗，不能用作跨图 | G2 |
| `src/core/scene-navigation/scene-navigation.ts` · createPlayerNavigationKnowledgeSnapshot | `b3647c50654efe9f18b7bf16d01a70dd630e4349` | 知识结构/观察增量可参考，Scene生命周期需新约定 | G2 |
| `src/core/scene-exploration/player-visible-scene-navigation.ts` · player-visible queries | `0135392410e9c6dfeb85c3f47238efdd19dae552` | 旧所有known edges读取当前enabled，远程危险不可直接照用 | G2安全投影 |
| `src/core/combat/enemy-persistent-state.ts` · createEnemyPersistentCombatState | `0a17af9c12dc526d054c850e24d4ad13fd2dd171` | HP/意图/进度/风险/失能可复用值验证；跨日owner未接 | G2后续combat |
| `src/core/scene-exploration/scene-exploration-snapshot.ts` · snapshot normalization | `75c3ac92985e6dcf9ef6baa571d804a691023a93` | 旧禁止E0异地active及combat；镜像不能双owner | G2/G3后续combat |
| `src/core/scene-exploration/scene-exploration-effects.ts` · effects application | `99e76e0d599b9ea50ac9e06fdac66053774045a5` | 确定性组合可参考，不是新完整终局 | G2/G3 |
| `src/core/scene-search/scene-search-materialization.ts` · materialize search | `03461c12ef87494af68dc18ad5fa392ebba0c659` | 旧含sceneInstanceId，需新执行/地点/来源锚点 | G2 |
| `src/core/random/random-stream.ts` · createStreamId / drawUint32 | `cf7d5f98246f829e9e76b4a04157ad94c7b75459` | counter32-v1可复用，旧golden与医院锚点保留 | G2 |
| `src/core/run-loadout/run-loadout-snapshot.ts` · createRunLoadoutSnapshot | `d01b910ae31ecff904988367b9a3218e4474dd50` | 跨容器实例唯一验证；新家底生命周期不等于旧task-storage | G2/G3 |
| `src/core/run-return/run-return.ts` · buildRunReturnTransitionPlan | `0f391a415610bdb26c616e1c65582277ef0b747b` | 真实实体转移/no night；旧遗失及拆步非新完整清算 | 后续终局 |
| `src/state/run-save/run-save-types.ts` · StableRunPhase | `9f67575f098809ec8417d21a23f8699cface5929` | format2三phase，不支持新角色/生还终局 | G3 |
| `src/state/run-save/run-save-codec.ts` · canonicalizeStableRunPhase / deserialize | `cdbd029640aa9097ffe7871925cef4e1f9aa5947` | 严格格式与读失败/null分开可参考；无新聚合 | G3 |
| `src/state/run-save/run-save-rules-registry.ts` · rules registry | `a9b9148f81bb1774619073e7fb7e5bc5dbd54681` | 绑定医院单mainScene，不注册五个旧Scene冒充五图 | G3 |
| `src/state/command-execution/stable-run-command-execution.ts` · executeStableRunCommand | `d7bd5281770bd82908c7a698db1a767d418337b3` | 一次save失败保留nextPhase；旧RunIdentity连续必须保留 | G3 |
| `src/state/run-store/run-store.ts` · createStableRunStore / dispatch | `41717eaa9e7c08116668ca174c4379eb84ed895d` | 私有replace/notify可参考，bootstrap多调用不能证明唯一实例 | G3 |
| `src/state/run-application/run-application.ts` · executeStableRunApplicationCommand | `fd4a90100072e2859ca39a1b26d4e87e8d854539` | 意图路由可参考；不接新任务/完整关闭 | G3 |
| `src/app/production-bootstrap.ts` · bootstrapProductionRun | `a3b755f96e7763c8235dd28773cf7240d060fcdd` | 无状态工厂重复可建store，需新composition单owner闸门 | G3 |
| `src/app/production-composition.ts` · production composition | `8f0803a30d6e64466a962bb0a1be453d5f5b10ff` | 医院dependencies/registry/storage注入；不改旧入口 | 后续发布 |
| `src/app/hospital-new-run-transaction.ts` · executeHospitalNewRunTransaction / normalizeOrigin | `4756ee1827a8578a29a18467a2a2901d04cfbe94` | no-run/failure新建；不是生还角色接续或恢复失败兜底 | G3 |
| `src/content/hospital-v0.1/hospital-scene-runtime.ts` · createHospitalSceneRuntimeBundle | `7ef0ed45378bf4fafb2319215bddba8ee599671a` | 内容注入可参考；随机仍runSeed+sceneID，不是持续五图 | G2 |
| `package.json` · scripts/dependencies | `e52c8b2716f8f44f4678066443516de5c738a3b8` | check串联architecture/typecheck/test/build；本轮不执行生产check | 后续真实工程 |
| `package-lock.json` · packages / dev flags | `3b320a8a79a1815c0909d8846e5e6248d4fc187e` | 只读依赖版本链，本轮不改不安装 | N02 |
| `scripts/validate-architecture.mjs` · forbiddenImports / nondeterministicSources | `df9ff13d1e3a518ca441f78bd8428b32d383202f` | 读取全脚本，纯core依赖/无熵/无产物边界保持 | 全部 |
| `.github/workflows/ci.yml` · CI jobs | `1b5e3565376486d79ddbf7901ce3ca058d99061c` | 只读准确版本及工作流警告，不改阈值 | N02 |

`src/core/mission-lifecycle/`全部六文件含以下测试，未漏独立生产文件。源码主要由专项Agent完整定点阅读，根会话阅读当前规则／readiness、composition/boot、新建事务与脚本并整合；没有称逐字遍历全仓。

## 相关生产测试实读，均NOT RUN

| 路径 | Git blob | 本次读取到的断言／范围 |
| --- | --- | --- |
| `src/core/mission-lifecycle/mission-lifecycle.test.ts` | `6604ad60f52f0479fc8f1b8f2b9c0fe01ebeafd8` | 完整首核心K局部事实与expectation/harness |
| `src/core/daily-state/daily-run-state.test.ts` | `8fb532b865dc0bdcc207574d71ca41c61b64d071` | 全文：初态/严格字段/额度一致 |
| `src/core/daily-state/daily-medical-usage.test.ts` | `d1b8eee5cb5244b010bac48d70eff2dca4454738` | 全文：限次及非法值 |
| `src/core/world-threat/world-threat.test.ts` | `b93e20ab30835154810521dbdca34d4d7a6530bf` | 全文：旧terminal base0 |
| `src/core/scene/timed-scene-action.test.ts` | `bb240bbc8fb9c15d2b3f41b6f4c198e427883447` | 全文：透支、强返与输入拒绝 |
| `src/core/condition/condition.test.ts` | `e9983378617d7573d40db7922dbbf50d4b2b7ed2` | 全文：HP/暴露/伤势纯操作，不等新医疗资格 |
| `src/content/hospital-v0.1/daily-settlement.integration.test.ts` | `706d6ae3b00cebffdace42aa8a63ea211e555a45` | 定点：普通恢复、三阶段死亡、Day7/mainScene拒绝；不是全文审查 |
| `src/state/run-save/run-save.integration.test.ts` | `c71cf9fae383f5c7af1bd5ee08de569931e96884` | 984—1093、1179—1271：稳定combat、strict restore |
| `src/state/run-store/run-store.integration.test.ts` | `7181f2805cb2ed7f31975a0e4dfa96c93955a9bd` | 463—568：保存失败后下一命令用内存 |
| `src/app/hospital-new-run-transaction.test.ts` | `92e4ebf988e350ce61085bf9b104ae5edc9bf98b` | 375—398：首次保存失败保留创建结果 |
| `src/core/random/random-stream.test.ts` | `1b9f074e1bbaaa45c50b55c339b192c80da1358c` | 全文：旧golden/隔离 |
| `src/core/scene-navigation/scene-navigation.test.ts` | `813ed3314f63bad8606f4cf304931ae23c841378` | 全文：知识增量与拒绝 |

## 规则和设计实读索引

实际读取AGENTS、覆盖索引、GDD相关产品/周期/状态/保存章节、Slice范围与医院当前验收、Architecture当前身份/保存/周期/终局章节、DEC026—028与033/034/038及046—049有关原条文；Content items医疗、scenes行动/流血/CTB/持续边界、events即时结果/来源；UI速查与UIR-015分级及信息边界。正式最高依据仍是DEC，未确认配置不能由Architecture创造。

设计实读：01概览、10队列、readiness四文件；02/03当前驻留与节点、04任务/返航、05资源/维护/留置、06互动/立即结果、07敌人与专长、09批判、11返回及衔接；唯一终局当前正文/003D、003C审定区、003A；004参数原件。没有重跑004/269/十次经济模拟。

readiness/01—04及现有正式档中的“未实现/未授权”保留为历史：截至d1d3b79首身份核心已实审通过，余下保存、全角色聚合、周期、世界与入口仍未接。不能把这些旧句解释成最新首工程未完成，也不能据新PASS宣布全部缺口关闭。五处当前附记按N01追加，其他历史文件只在此导航，不扩大白名单。

## N02 2026-10-03只读告警核查

读取[CI#125准确日志](https://github.com/lvlw/elevator-survival/actions/runs/37111903158/job/111171281108)，日志检出HEAD为d1d3b79完整SHA；Node24.21.0/npm11.19.0。历史CI成功：architecture49DEC/224core，105文件2256测试，构建成功；本轮未重跑，不计新增测试。日志报告4依赖告警（2moderate/2high）、minified chunk>500kB、checkout@v4/setup-node@v4目标Node20由runner强制Node24，另punycode及url.parse弃用提示。未修改CI、阈值、hooks或依赖。

本机`npm audit --json`实际exit1：配置镜像npmmirror安全端点404 NOT_IMPLEMENTED，**是命令端点失败，不是检出通告**。随后仅本次命令指定`--registry=https://registry.npmjs.org`只读复查，exit1且有效auditReportVersion2：4受影响包、2moderate/2high（不是4个独立CVE）；没有audit fix/install/配置写入。

| lockfile实际依赖链（全部dev=true） | audit通告/修复范围 | 结论边界 |
| --- | --- | --- |
| vitest4.1.10 → @vitest/mocker4.1.10 | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)：受影响>=2.1.0 <4.1.11，建议检查>=4.1.11；fixAvailable=true | mock redirect路径读取；开发/测试依赖，未分析实际启用方式，不证明玩家可利用 |
| vite8.1.5 → postcss8.5.23 → nanoid3.3.16 | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8)：<3.3.18，fixAvailable=true | custom generator size0可循环；未确认本项目调用或浏览器包实际包含 |
| jsdom29.1.1 → undici7.29.0 | 10通告涉及WebSocket/重试/压缩/缓存/TLS，受影响范围均截止<7.29.1，fixAvailable=true；代表[GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3) | 测试环境链，不把存在依赖当真实玩家暴露；需维护任务按每项调用条件核查 |

全部undici通告与实际受影响范围记录在[run-record](validation/run-record.json)的audit摘要，含原报告指纹、命令及退出码。修复范围是通告当前提供信息，不代表本项目升级已经兼容；CI绿不等安全。建议另行维护任务处理依赖及Actions/包体，当前没有修改授权。

## 能力欠账与准入

[近期G1—G3](03-next-engineering-goals.md)明确生产者/消费者和实审停止点。真实终局经济、全部任务件处置、新E0战斗、三专长、H1电子路线、安全提示、发布兼容、多标签保存及Owner首玩继续OPEN。W3只覆盖[有限模型](validation/verify_entry_002.py)明示的状态；无真实CTB、完整容器几何、服务器可信历史或浏览器IO证明。
