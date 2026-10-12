# ENG-RESIDENCE-COMBAT-CORE-001-R2 完整限定返修任务书 v1.0

## 0. 一次完成什么

修复F03：**已备好材料，合法退却／胜利后，不需插入任何其他命令即可合法维修。** 同时保留完整已完成值对原始资源篡改的严格拒绝、原F01/F02、一次材料／精力／revision和维护致死原结果。

本项不重新设计战斗，不进入E02-R，不修复Owner玩法。本项已经由主线按既有权限下发，内部实现、测试和自查不用逐文件要求Owner确认。

- 仓库：`lvlw/elevator-survival`。
- 起始HEAD：`8512c991adb353775ffa4785599a011e419a81fa`。
- 起始父：`9f0eaacfbb83e49401c52fb57c3cfa061b2ef026`；tree：`06dee9c83e2b00075f5a0103d6c87211d7c22744`。
- 沿用分支：`feature/residence-combat-core-001`，不新建分支或worktree。
- 允许本项同名工程分支普通commit／push；完成后必须停止。

## 1. 来源与授权

正式规则及五份active-combat合同继续有效；重点是core P01/P02/P05/P07 P10及lifecycle L03—L05。主线审查报告限定确认原F01／F02方向成立，同时发现相邻F03阻断。

旧P102项、R1新增58项及更早测试全部保持，不以修复F03为理由改写它们。不存在新格式的玩家兼容承诺；不创建v4。主线原生模板未执行，主线隔离执行不冒充原生接受／拒绝事实。

## 2. 开工实际检查

从附件定位原ZIP，在仓库外解压、完整阅读所有材料并核对SHA256SUMS。不让Owner手动搬文件。

重新读取实际AGENTS.md及其要求的规则、正式合同、当前源码。核对HEAD／branch／status／普通和cached diff；存在非本任务未提交改动或错误起点则停止报告，不硬reset、不覆盖。

建立真实测试基线。鉴于本轮已知默认并发旧长链超时，可直接记录原因并用命令级`VITEST_MAX_WORKERS=2 npm run test:run`；PowerShell使用等价环境设置，结束恢复先前环境。禁止改测试超时、Vite/package/CI或删选旧用例。已有默认并发失败历史保留，不再宣称其成功。

## 3. 精确路径许可（40条最大集合）

不要求全部修改。只能修改下列既有文件或在列明路径新增文件。之外路径全部只读：

### A. 必要生产窄接缝（9条，其中maintenance-context.ts为可选新增）
- `src/core/residence-combat/trace.ts`
- `src/core/residence-combat/history.ts`
- `src/core/residence-combat/validation.ts`
- `src/core/residence-combat/stable.ts`
- `src/core/residence-combat/plans.ts`
- `src/core/residence-supply/shared-maintenance.ts`
- `src/core/residence-supply/shared-types.ts`
- `src/core/residence-supply/shared-validation.ts`
- `src/core/residence-combat/maintenance-context.ts`

对shared-maintenance仅允许调整受控验证／结果组合时点，不改变维修配方、总池、合法目标、精力、流血、资源或旧P输出／能力语义。shared-types/shared-validation只允许必要无版本验证协议抽取；不能绕过原before或最终完整值的严格检查。新maintenance-context仅为私有窄接缝，不成为普通开关、版本转换器或通用事务框架。

### B. 新增原生测试（3条）
- `src/core/residence-combat/review-maintenance-regression.test.ts`
- `src/core/residence-combat/review-maintenance-purity.test.ts`
- `src/core/residence-combat/review-maintenance-compatibility.test.ts`

全部基线测试／helper不改字节，包括R1的review-regression／review-history-integration／review-purity。

### C. 报告与状态附记（8条）
- `docs/engineering/residence-foundation/active-combat-core/completion.md`
- `docs/engineering/residence-foundation/active-combat-core/contract-and-support.md`
- `docs/engineering/residence-foundation/active-combat-core/implementation-notes.md`
- `docs/engineering/residence-foundation/active-combat-core/verification-results.json`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`

Markdown保留完整原字节前缀，仅追加R2说明；JSON原对象／R1记录完整保留在明确历史字段，新增R2，不用新结果覆盖旧超时、修前失败或已记录计数。不要把作者自查写成主线PASS。

### D. 本包20份输入原件逐字节归档

保留相对目录结构，全部放在：
`docs/engineering/residence-foundation/active-combat-core/r2-inputs/`

精确成员：
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/ENG-RESIDENCE-COMBAT-CORE-001-R2-task-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/OWNER-authority-and-scope-E02-P-R2-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/AUD-8512c99-ENG-RESIDENCE-COMBAT-CORE-001-R1-review-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/BASELINE-AND-SCOPE.json`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/SHA256SUMS.txt`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/README.md`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/ci-observation.json`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/input-integrity.json`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/isolated-results.json`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/isolated-stdout.txt`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/native-maintenance-regression.test.ts`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/run-isolated-review.cjs`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/evidence/source-integrity.json`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/source/history-context.ts`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/source/history-queue.ts`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/source/history.ts`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/source/shared-maintenance.ts`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/source/stable.ts`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/source/trace.ts`
- `docs/engineering/residence-foundation/active-combat-core/r2-inputs/source/validation.ts`

旧inputs／r1-inputs全部只读。本包source是受审原件，不能改成修后源码；本包evidence不得更新成伪造修后结果。实际修后证据另存工程R2报告或仓库外日志并记录指纹。

## 4. W1 — 完整仓库修前复现

先只新增测试，未改生产源码时将`evidence/native-maintenance-regression.test.ts`原字节复制至B组首路径并原生执行。保留首次原件／复制目标指纹与实际输出。模板7项的预期为：立即修管2项应合法、真实免费整理后维修2项为定位对照、原始资源篡改3项应拒绝；不要事先把预计修前失败数字当实际结果。

所有主要材料必须由真实来源取得并在入场前携带；真实初配、移动、火门、CTB、胜退和维护，不清敌、不写completed、不伪造闭场收据。主线32项包含裁剪外套维护对照；真实外套配方和取得路线由Codex按正式源补足，不照搬隔离适配器TEST配方／费用。

若模板被其他真实前置拒绝，记录具体错误／阶段，不把导入、类型、材料缺失或fixture失败当语义检出；仅经明确诊断可在新测试中作最小fixture适配并保留原始尝试。若原API已经正确接受立即维修，先完整报告与主线推断差异，避免制造回归或弱化校验。

## 5. W2 — F03最小修复

当前因果：trace的最新资源检查（`trace.ts:102-108`）保护已完成检查点，而shared-maintenance在恢复资源／消费材料后、G1推进revision前使用`context.read(next)`，战斗context把它当完整已完成值验证。相邻闭场正好revision相同。

在真实受控组合中区分原始已完成before、合法私有候选、最终完整计划；具体实现由Codex详细设计并记录理由。必须同时做到：

- before完整验证／独立authority绑定不放宽，非法原始输入在生产前拒绝。
- 成本、材料、目标和资源由原共享规则计算；不复制维修／身体公式。
- 胜退后立即修管、修外套都合法；不要求额外整理、移动、查询、保存或休整。
- 历史read/query对当前检查点的原始资源篡改继续拒绝，含活战斗和刚闭场。
- 每个合法维护只真实恢复一次、消费一次、G1一次、外层revision+1；原值不变，旧场次证据不改。
- 付费维护引发合法流血死亡时，保留原维护实际恢复与消费结果，再由已有唯一关闭清算组合完成；不发布HP0活态，不丢维修结果，不复活，不重跑CTB/RNG/G1，不多加revision。
- 结果不合法时不能签发部分计划。若某阶段已经调用真实规则后才发现无效后态，如实分层计数，不虚报全部零调用。

禁止以下捷径：删除所有最新资源检查；对外skipValidation、trusted=true或任意revision覆盖；补虚假revision；自动插入空动作；先签发坏计划后由未来R/S修；将候选删除combat字段伪装旧SupplyValue；重放战斗修历史；建立第二资源／敌人／身体真相；保存整场全事件流。

## 6. W3 — 相邻原生回归、兼容及负控

### 正例

至少覆盖真实退却与真实胜利后，材料已在身上的立即修管及修外套；机械15总池部分恢复、多目标分配、末次材料真实消耗；旧历史有多个场次，维修后再入／战斗／死亡仍可继续。

加入即时维护后的G1流血死亡（可使用明确低HP身体TEST边界，但战斗、材料、维护、关闭均用真实生产者）、正常H0空steps及真实Day6/Day7既有死亡回归。保留三敌、同点顺序、防御／逃跑、首绷跨战与原F01/F02全部反例。

### 反例

非法或多余字段、假材料、错实例／配方、不足／重复材料、满资源目标、超总池、E0、stale／克隆计划、活battle维护继续拒绝；输入不变。主动改写活battle或最新闭场资源的原始值读取仍拒绝；不能以一次合法维修的存在为任意资源更改背书。

### 计数

分开观察：资源恢复、材料消费、G1行动／周期、CTB/随机、计划签发、terminal关闭。合法生还维护G1行动1／CTB0／关闭0／revision+1；维护致死G1行动1／关闭1／CTB0且只有最终dead计划。读取／查询不调用玩法生产者。P没有IO/current，不伪造持久化或通知计数。

### 两类语义负控

仅在仓库外源副本分别注入：①重新把合法维修候选当最新已完成资源检查，立即维护正例应失败；②撤销已完成值最新资源绑定，原始篡改反例应被误接受并引发业务断言失败。每次独立负控，正常源码无开关；必须是语义失败，不是缓存权限、类型、导入或fixture错误。历史四类P和两类R1负控未重跑则明确NOT RUN，不累加。

## 7. W4 — 全部检查、交付与停止

按实际package执行本轮真实基线、B组定向、受影响旧P／R／S／CTB／终局组合以及最终完整`npm run check`。命令级两worker允许，不改依赖／超时／过滤全部测试。报告实际新增／替换／删除／净增数量，原有用例不得减损。

核对全部40路径、新旧原件、旧文前缀、批准配置／合同／src范围外Git对象、新相对链接、UTF-8、普通／cached／起点至最终diff。W01累计差异只保留原两个历史输入7处硬换行，保留真实exit2，新差异必须exit0；不改原件或Git whitespace配置。

普通commit／push只推同工程分支；网络问题仅普通重试，不强推、merge或推main/旧其他分支。不重写既有8512提交。

完成报告给：起始／父／最终准确SHA与tree、真实测试基线及并发方式、修前／修后原生结果、方案边界、正反例与负控、独立计数、旧回归、全量check、原件／范围／W01、CI实际状态和未完成项。CI未完成如实写，不凭排队或触发当PASS。

同包实审报告记录CI151已成功，不改写作者当时in_progress记录。新任务自己的CI须另查。

停止等待当前WebGPT准确SHA专项源码复审；**不进入E02-R/S/E03，禁止v4 codec、current、Storage/browser/多标签、UI、O3、规则参数、依赖/CI修改。**
