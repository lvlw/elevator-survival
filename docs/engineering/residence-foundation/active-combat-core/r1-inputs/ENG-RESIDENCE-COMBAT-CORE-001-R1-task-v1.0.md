# ENG-RESIDENCE-COMBAT-CORE-001-R1（E02-P-R1）完整限定返修任务 v1.0

## 0. 一次交付与停止点

对E02-P源码实审F01／F02，一次完成**修前原生复现→领域证据联合校验→最小必要证据生成→正反例／零重放／真实长链→完整检查→同工程分支commit/push**。不拆成Owner逐条协调的小任务，不执行后续R/S。

- 仓库：lvlw/elevator-survival。
- 起点：`9f0eaacfbb83e49401c52fb57c3cfa061b2ef026`。
- 起点父：`4166fb25ab2898ca602043fbddacbb88d3444fdf`。
- 起点tree：`249accacd9327f7610544f10c84e4f8246ae369e`。
- 沿用：`feature/residence-combat-core-001`，不新建分支／worktree，不amend原提交。
- Goal仍是E02-P纯核心，不写codec/current/Storage。
- 授权依据：Owner既有批准与任务下发权限、DEC-052及五份正式active-combat合同、本包实审报告。

## 1. 开始方式与真实基线

Owner直接附ZIP。由你定位附件，在仓库外安全解压；成员不得含绝对路径／越界路径。完整读取本包，核对SHA256SUMS，将所有16件成员按BASELINE archive_map逐字节归档。原五份E02-P输入保持，不用新文件覆盖旧输入。

重新核对HEAD／分支／工作区／暂存、AGENTS、正式规则和必要源码。HEAD必须是上述起点，工作区干净；发现其他工作先报告，不reset/clean/stash丢弃。记录全部远端参照，本项仅更新同名工程分支。

按AGENTS读取GDD、切片、Architecture、DEC和相关content。必读：

- `docs/engineering/residence-foundation/active-combat-core-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-restore-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-session-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-batch-plan-v1.0.md`
- 原工程task、implementation-notes、contract-and-support、verification记录。
- 新history／trace／schema／effects／entry／terminal，以及实际受控profile和旧CTB求值／reducer。

先实际运行`npm run test:run`并保留输出。历史198文件／3723项只作对照，不预填为本轮已跑；依赖缺失按现有lock可npm ci，但不升级依赖或audit fix。

## 2. 精确路径白名单

共**39条**，为上限而非要求全部创建。除下列路径全部只读；原116条不自动延续。

### A. 现有新战斗纯核心：仅本次证据修复

- `src/core/residence-combat/history.ts`
- `src/core/residence-combat/trace.ts`
- `src/core/residence-combat/validation.ts`
- `src/core/residence-combat/schema.ts`
- `src/core/residence-combat/types.ts`
- `src/core/residence-combat/effects.ts`
- `src/core/residence-combat/entry-witness.ts`
- `src/core/residence-combat/terminal.ts`
- `src/core/residence-combat/plans.ts`
- `src/core/residence-combat/exit.ts`

### B. 可选最小内部helper与新增原生测试

- `src/core/residence-combat/history-context.ts`
- `src/core/residence-combat/history-queue.ts`
- `src/core/residence-combat/review-regression.test.ts`
- `src/core/residence-combat/review-purity.test.ts`
- `src/core/residence-combat/review-history-integration.test.ts`

B中的新helper只在确需拆分时创建，不能建第二战斗引擎或通用事件库。新增测试模板可按实际类型做必要编译／fixture修正，但不改变八项反例应拒绝、合法对照应保留的语义；每项改动留痕。

### C. 工程记录与四份尾部状态附记

- `docs/engineering/residence-foundation/active-combat-core/completion.md`
- `docs/engineering/residence-foundation/active-combat-core/contract-and-support.md`
- `docs/engineering/residence-foundation/active-combat-core/implementation-notes.md`
- `docs/engineering/residence-foundation/active-combat-core/verification-results.json`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`

四份共享文档只末尾追加；原工程Markdown报告保留原正文并追加R1身份。JSON可新增r1并把原完整对象保留为historical.original，不覆写原测试／queued／失败记录为新通过。

### D. 原件归档

- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/ENG-RESIDENCE-COMBAT-CORE-001-R1-task-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/OWNER-authority-and-scope-E02-P-R1-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/AUD-9f0eaac-ENG-RESIDENCE-COMBAT-CORE-001-review-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/BASELINE-AND-SCOPE.json`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/SHA256SUMS.txt`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/README.md`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/ci-observation.json`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/input-integrity.json`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/isolated-results.json`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/isolated-stdout.json`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/native-review-regression.test.ts`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/run-isolated-review.cjs`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/evidence/source-integrity.json`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/source/history.ts`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/source/trace.ts`
- `docs/engineering/residence-foundation/active-combat-core/r1-inputs/source/validation.ts`

所有起点已存在的测试及test helper只读；禁止删除、跳过、放宽旧断言。102项E02-P新增测试以及更早3621项均须保留。通用trace“请求大于HP而实际截零”的原算术对照保持，不把修复误写成全局禁止大请求。

如确需修改未列路径才能满足明确合同，先报告具体文件／函数／冲突，不自行扩权，不通过改正式合同、参数或旧reader迁就新实现。

## 3. W1：先原生复现，不拿隔离结果冒充全仓库结果

主线已执行的是20项原样模块隔离检查：12符合／8不符／0异常，替换了外围schema、Supply/G1/G2、profile和projection等。详见README；不是原生完整readCombatValue执行证明。

在改任何生产代码之前：

1. 把`evidence/native-review-regression.test.ts`原样复制到许可的`src/core/residence-combat/review-regression.test.ts`。
2. 实跑`npm exec vitest -- run src/core/residence-combat/review-regression.test.ts`，保留完整首跑结果／退出码／精确源码快照。
3. 遇导入／类型／fixture前置问题，保留首失败并在该测试文件修正后重跑；程序错误不计语义检出。主线未运行模板，不为匹配主线的8项数字人为制造失败。
4. 某反例若已由其他原生校验拒绝，记录准确拒绝点和证据，保留它作为合法回归；据完整源码确定仍需修复的联合约束。

四个前态必须由真实content→初配→出发→G2移动→新profile CTB生成：基础行动活决策、真实快捷绷带后死亡、自身行动流血死亡、合法退却。不手拼整份结果替代本轮复现；允许通过现有随机注入机制固定合格边界抽样，但不stub resolver／reducer／清算。

## 4. W2：F01队列与F02来源的最小联合约束

### F01：队列不止相邻值相等

在完整领域校验层核对：当前命令的正式CTB、实际起点、下一玩家机会、每个已结敌行动的身份和对应间隔、蓄力延后、完整退却锁定事实，以及各queue reason允许改变的字段。不能把基础100改80、护工70后170改500、无负重／伤口加成的退却80改75，只因全字段一起改就通过。

致胜主效果及自身流血死亡可在当前CTB结束，不等待整个恢复时间；直接致死敌击止于敌时点；同点玩家／完成优先，敌响应仅strict earlier；退却新伤不反向延长已经锁定的准备。多次响应需逐条正确关联，但不得调用CTB重新模拟历史。

如果DecisionWitness现有字段不足以判定，明确记录缺哪项来源，在真实effects／entry生成处捕获**最小且不可操作的事实**，并在types/schema/history同步。允许本批内必要纯协议记录细化；不改旧1/2/3存档，不实现v4，不要求另存每轮完整身体／敌人／库存或所有历史快照。

### F02：裁剪正确不等于来源合法

保留通用verifyCombatBodyTrace的算术职责；在完整decision／entry上下文核验：

- trace CTB落在该真实命令／已结敌响应范围且关联实际事件；不能晚于结束时点。
- direct-damage来自该场绑定敌profile中该次真实action，不能护工借porter动作。
- 请求／实扣与正式伤害及该击实际防具／防御、耗损顺序联合一致；HP不足截零不允许把请求2偷换99。
- post-action-bleeding的来源、发生检查点和请求量绑定正式规则，不能用HP1截零掩盖请求1变2。
- 治疗／处理伤口／镇痛与对应实际命令、快捷实例、真实一单位来源处分、首绷及上限一致。
- 非HP步骤不得改HP，死亡短路仍是最后身体结果；不从最新伤口状态推断任意旧历史。

不能以重跑resolver、applyCombatEffects、reducer、G1、随机、治疗、终局来“验证”历史；不能删除来源核验或一律拒绝所有死亡／所有历史。

### 直接相邻自查

一起检查安全整数／CTB加法／区间及结果域、重复／缺失事件、敌count／risk与队列和来源一致性、敌人首入／再入、同点、受伤／防具耗尽、多次响应。避免按未经约束的巨大候选count跨度循环；采用有界证据或直接关系验证，拒绝非法／不可能输入，不搭全历史重放系统。

这里要求校验P承诺的领域证据与原生产者约束，不要求证明被完全重写的离线历史真实性，不新建签名、防作弊或跨设备回滚系统。

## 5. W3：完整回归与语义负控

保留原102项及全部旧测试，新增反例／正例至少覆盖以下6组：

| 组 | 必要证据 |
| --- | --- |
| R01 | 本包20项原生修前／修后，合法4组与8项F反例分别记；全输入不变、不冻结调用方 |
| R02 | 三敌不同CTB／动作／伤型，多次敌响应、蓄力140/200与同点，队列一致篡改应拒绝 |
| R03 | 护工／其他敌来源交叉、trace超界、请求量及防具／防御、流血1与真实HP裁剪 |
| R04 | 治疗先发生再死亡、满HP但合法伤口目标、首绷2后续1、快捷真消费；普通H0空steps保留 |
| R05 | 退却→真实治疗／维护／休整→同敌再入→胜／死，Day6休整、Day7行动／截止，旧成功处分不倒改 |
| R06 | 对合法和非法聚合读取／只读查询监测零CTB／随机／用药／G1／关闭；真实死亡仍1次原生产者，消费增量0 |

本次新增测试集中在三条许可测试路径；计数按实际展开项，不把重复运行或原生模板与其并入回归双计。v4恢复和真实Storage本批仍NOT RUN。

在仓库外副本执行两类语义负控，原期望不改：分别撤销F01队列－规则联合检查、撤销F02trace－来源/幅度/时点联合检查，须对应反例由拒绝变接受而失败；缺导入、类型错误、崩溃或缓存权限失败不是负控成功。记录准确文件／变更／命令／用例ID／退出码。原四类外部负控有可复现材料时可复跑并分列，不能编造历史已重跑。

## 6. W4：真实完成检查、完整性与交付

按实际package执行`npm run check`，并分别记录architecture/typecheck/tests/build。定向至少新R测试、原19个E02-P新增测试、旧CTB／医院和E01-P/R/S、终局／恢复回归；最后全量必须包含全部旧测试。

检查工作树、暂存、最终commit的实测代码字节一致；本轮精确白名单、UTF-8、链接／锚点、原件hash、正式五合同与38/103配置／批准内容／依赖不变、四共享doc原前缀不变。原116之外不得借机清理重构。

W01只原两文件七行：原E01-R task第7—9行、原E01-P review第3—6行。原blob不改、告警不能隐去；R1起点到最终增量diff必须exit0。对8c19ca0d28058cf743b41c8547cc2629c8eac767的累计diff如exit2，仅上述七处可记WITH_APPROVED_W01_ARCHIVE_EXCEPTION；第八处不获批准。不能改git whitespace配置或用忽略参数压掉告警。

原来“作者COMPLETE／CI queued／后续CI成功”各保留证据时点；新增R1不能追改原报告让它声称原本通过主线实审。五原输入和本包原件均保持字节，报告／JSON标注作者、主线、CI、历史各自来源。

普通commit／push只同名工程分支；核对远端完整SHA及其他参照。网络失败可普通重试，无法确认写UNCONFIRMED，不强推。最终自身SHA/tree写交付消息／外部提交后回执，避免自引用。

## 7. 最终报告与明确停止

必须报告起点／父／最终完整SHA、tree、分支；修前原生每项真实结果和程序失败修订；F01/F02修改文件及最小证据依据；新增／替换／删除／净增测试；原102及既有全量保持；原生真实长链、两类负控、零重放独立计数；最终check与CI实际状态；范围／原件／保护／W01；冲突和未完成项。

当前不授权E02-R/S/E03、v4 codec、current／Storage／浏览器／玩家入口、O3、调参、旧档迁移、依赖或CI修复。不合并、不推main／旧分支、不强推。

**完成后立即停止，等待当前WebGPT主线对R1准确SHA专项源码复审；不自动进入E02-R。**
