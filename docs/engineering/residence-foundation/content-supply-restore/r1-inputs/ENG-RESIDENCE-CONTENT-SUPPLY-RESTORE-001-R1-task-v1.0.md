# ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-R1（E01-R限定返修）任务书 v1.0

## 0. 本次做什么

一次修齐F01：v3终局身体历史必须与已批准流血幅度、截零及休整／截止来源条件一致。不要重做v3，不进入E01-S，不把冷恢复变成重新执行玩法。本补充同时明确W01归档空白例外。

起始／父基线：`346902461c3fd1f01ec88132d4d2e7c3ef1d50bd`。
起始tree：`5df149782169e37a6a8211945c6fbaf7cc1fda49`。
沿用分支：`feature/residence-content-supply-restore-001`，不新建分支或worktree。
目标不是为通过审查而调参数；只拒绝既有规则不可能产生的历史，不修正成另一合法历史。

## 1. 输入及开工

Owner直接附ZIP。自行定位附件，在仓库外解压，完整读本任务、审查报告、授权及范围、source/evidence、SHA256SUMS；按清单归档到`docs/engineering/residence-foundation/content-supply-restore/r1-inputs/`，保持相对结构和原字节。

先核对实际repo/origin/HEAD/branch/status/普通与cached diff；HEAD、分支不符或有非本任务改动就停止，不能reset、自动stash或丢弃成果。重新读实际AGENTS、正式DEC-049—052、GDD/VS/Architecture及相关内容；不得把先前会话推断当作本轮已读事实。

实跑`npm run test:run`建立本轮基线。历史168/3472只供对照，不代替本轮实际运行；中断命令如实记录、按需复跑。

## 2. 先复现，后修订

在未改生产源码时，将包内`evidence/supply-review-regression.test.ts`复制到明确新增白名单路径`src/state/residence-save/supply-review-regression.test.ts`，执行：

```sh
npm run test:run -- src/state/residence-save/supply-review-regression.test.ts
```

模板13个展开用例，主线仅检查语法，未在完整仓库执行；不得把它当已验证原生结果。使用真实P/G1/G2/A生成结果再克隆少量字段，expected在篡改前从独立原值捕获；四个反例分别观察aggregate/encode/decode，后修版应全部语义拒绝。

如模板有类型/接口问题，可在此新增测试文件内作最小适配并记录原diff；不得先改生产代码掩盖复现结果。若原API本来已拒绝，保留真实拒绝点，不弱化原校验制造失败；全部不成立且无实际缺口时停止报告，不盲改以符合主线隔离数字。

隔离脚本仅作可核对证据；它需要提供transpileModule的TypeScript环境，不要求在本地另装版本运行它。Codex验收以实际仓库原生Vitest为准。

## 3. F01修复要求

### A. 已记录流血步骤与批准规则对齐

当前G1行动流血1、周期流血2，以真实已批配置为准，不能硬写第二套配置。既有差值相等只证明记录自己算得通，不能接受HP2行动流血2点致死、HP3周期流血3点致死。

补窄一致性检查，保留HP1周期只实扣1的截零正例；有真实主要效果先损血后的合法死亡不得被一起拒绝。对旧历史缺失的伤口前态不可从最新身体臆造；仅使用本记录与已批准规则能判断的约束。正常H0的steps=[]保持。

### B. cycle-bleeding的来源／任务日／现场绑定

source为supply-death或location-death且从cycle-bleeding起步的现支持来源是局部休整死亡；应遵守真实休整资格（taskDay小于days、对应历史节点允许休整、没有待战斗）。Day7异地日结应走deadline，不能把其source改成本地休整来规避来源检查。

不要一概禁止Day7局部死亡：primary开头的合法移动／任务／维护死亡仍支持。合法Day6休整死亡、真实Day7截止及HP0短路均保留。来源不合法应拒绝，不自动改标签或补步骤。

### C. 不重放，不扩大规则

只在v3历史验证及必要同层helper完成。不调用planCharacterCycle、planResidenceAction、任务/医疗/随机/终局生产者重新得到结果；不发奖、扣款或改实例。可以读实际配置／纯算术／结构检查；不另造周期执行引擎。

相邻自查限本次历史事实与来源关系，使用已有字段，不改v3结构或对外导出、policy/expected/same-progress语义。发现需扩大生命周期／字段或修改P/G1才能修正的独立问题，先报告具体证据，不自动开新框架。

## 4. 本次最大30条精确路径

- `src/state/residence-save/supply-history.ts`
- `src/state/residence-save/supply-step-consistency.ts`
- `src/state/residence-save/supply-validation.ts`
- `src/state/residence-save/supply-history.test.ts`
- `src/state/residence-save/supply-roundtrip.test.ts`
- `src/state/residence-save/supply-codec.test.ts`
- `src/state/residence-save/supply-validation.test.ts`
- `src/state/residence-save/supply-expected.test.ts`
- `src/state/residence-save/supply-compatibility.test.ts`
- `src/state/residence-save/supply-purity.test.ts`
- `src/state/residence-save/supply-review-regression.test.ts`
- `src/state/residence-save/supply-test-fixtures.ts`
- `docs/engineering/residence-foundation/content-supply-restore/completion.md`
- `docs/engineering/residence-foundation/content-supply-restore/contract-and-support.md`
- `docs/engineering/residence-foundation/content-supply-restore/implementation-notes.md`
- `docs/engineering/residence-foundation/content-supply-restore/verification-results.json`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-R1-task-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/AUD-3469024-ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-review-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/OWNER-authority-and-scope-E01-R-R1-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/BASELINE-AND-SCOPE.json`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/SHA256SUMS.txt`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/source/supply-history.ts`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/evidence/isolate-history.cjs`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/evidence/isolate-results.json`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/evidence/supply-review-regression.test.ts`
- `docs/engineering/residence-foundation/content-supply-restore/r1-inputs/evidence/archive-verification.json`

前三条生产路径只有supply-history.ts预期必改；helper与aggregate协调为必要时使用，不要求凑文件数。不得修改白名单外源码／旧测试；原R107项不能删除、skip或弱化来换通过。专用fixture可以增补真实边界构造，已有生产调用含义保持。

四份共享文档只追加当前返修与待审状态，不能改写原历史。四份本批工程记录追加R1经过，保留旧结果与旧告警；verification JSON可以增加R1对象，不覆盖旧数据。原`inputs/`全部只读。

## 5. 原生验收与负向控制

最低要求：
1. 四个反例在aggregate、serialize、deserialize均得到语义拒绝；原输入与独立expected不变，不返回候选。
2. 同时保留模板9个正例/独立恢复对照，以及原107项、E01-P91项、旧B/C回归；Day7正常steps=[]、Day7行动死亡、Day6休整死亡、HP不足额截零不能丢。
3. 给新历史校验补少量成组边界，不靠增加测试数量冒充覆盖。新例若测旧委托历史，不拿当前身体覆盖旧伤口事实。
4. 分别关闭“流血规则约束”和“局部休整来源约束”做两类语义负控，各须由目标回归检出，且不是类型错误/导入错误/程序崩溃。负控只能在仓库外临时副本，完成不残留源码改动、不提交mutant。
5. 原12组零玩法重放监测保留，新增拒绝路径也独立核对无动作/日结/随机/终局/IO/通知执行。schema/纯值校验不被计作玩法调用。
6. 实跑`npm run check`（实际package中的architecture/typecheck/test/build），保留失败与修订。不要把CI、作者、主线隔离结果累加成新增测试。

## 6. W01与原件检查的明确处置

精确例外已列在本报告第5节和evidence/archive-verification.json。允许保留原task第7—9行及原review第3—6行；只认这两个已核SHA-256的原blob，不是整个inputs目录通用豁免。

执行并分别记录：
- 原输入5件工作树／暂存／提交blob仍逐字节一致。
- 从本次起点346902461c3fd1f01ec88132d4d2e7c3ef1d50bd到R1最终提交的全部diff检查必须退出0；普通、cached检查及新未跟踪输入也逐项查。
- 从原P起点8c19ca0到R1最终提交的累计全路径检查保留真实退出码和全部告警，只能出现W01七处。可另做去除这两个精确原件路径的对照，但不能代替完整检查或隐藏记录。
- 总结可用`WITH_APPROVED_W01_ARCHIVE_EXCEPTION`，不得写“完整检查全部干净”。任何新增第八处或原件大小/摘要变化，停止报告，不改git配置。

本次包已避免新的行尾硬换行；不为去警告改原件、amend或强推。W01和源码修复同批交付，不单独发一个小提交要求Owner转发。

## 7. 交付、权限及停止

允许在上述现有工程分支普通commit/push。只推同名分支；不合并、不推main/其他分支、不强推。不自动E01-S、E02、E03；不接current、Storage、浏览器、多标签、React/UI；不改DEC、批准参数、内容、依赖、旧v1/v2或P/G1/A/B/C生产者。

完成报告必须含完整起始／最终SHA、父SHA/tree、真实本地与远端核验、文件清单、修前／修后13例及扩展例结果、实际命令与退出码、两类负控、新增／替换／删除／净增、原测试保全、零重放计数、全量check、W01完整证据、范围外检查、未完成项及停止点。无法确认模型运行配置不编造回执；本任务不指定模型。

完成后停止，提交新的完整SHA到当前WebGPT主线专项复审，不自动进入下一项。Owner不需要逐字段、逐文件或逐命令确认。
