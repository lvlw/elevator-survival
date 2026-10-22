# ENG-WORLD-PREPLAY-FOUNDATION-001-R1 完整任务书 v1.0

## 0. 目标与停止点

仅修复R-M01：样本提取会实际消耗外套耐久，但新安全metadata未显示这笔已知支付。不是重做基础工程或CTB，不修改已批准玩法，也不提前开browser owner。

- 仓库：`lvlw/elevator-survival`。
- 起始完整SHA：`cc147cd253f3e7e57e45de265610becb64a74821`；父：`ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`；tree：`79ecbc3fea0d1f7e00277b64cc054ff00dd52532`。
- 沿用：`feature/world-preplay-foundation-001`。不新建分支/worktree，不reset/clean/stash掩盖状态。
- 一次完成W1—W4、普通commit/push；只推同名工程分支，不merge/main/force/amend，不自动下一批。
- 本包14份文件原字节归档到`docs/engineering/world-integration/preplay/foundation/r1-inputs/`；29条路径是最大许可集合，不要求全创建。

## 1. W1：实际基线与原生修前复现

读取实际AGENTS及要求的GDD/VS/Architecture/DEC/Content、相关UIR；重点DEC-052样本/真实物耗、DEC-053知识边界、已审query契约、preplay基础契约和原任务/RESUME-01。重新核对HEAD、branch、worktree/index/untracked及运行中的命令；前一模型结论不是源码事实。

真实运行默认`npm run test:run`，报告Node/npm/Vitest、环境和退出码。267/4444与新增75是历史作者证据，不代替本轮基线。读取本包source-integrity和复现说明。

在完整仓库、改生产前，原字节运行`evidence/native-sample-payment-regression.test.ts.template`（仅替换__REPO__并在仓库外生成运行配置）。模板尚未由主线原生执行；先保留真实结果。如fixture/类型/导入错误，保留原始失败，再做最小TEST适配并写清差异；这类失败不算检出R-M01。若已有原API拒绝或行为不同，报告准确位置，不制造失败或弱化检查匹配数字。

主见证必须用真实初配/出发/入场/CTB胜利/移动H5和正式sample producer；不清敌、不改completed、不靠后态造扣耗。末次1和耗尽0等边界允许明确标注合法TEST状态，并先通过完整聚合，不把它们描述成真实玩家路线。

## 2. W2：同源条件和完整支付

既有执行条件为：sample方法cautious/direct；当前确有厚外套、resource.kind=integrity、current>0，且保护确实降低该方法风险；成立后按现有wear.tool消费并采用保护风险。保留当前两个方法的规则差异、既有额度、随机顺序和首次来源约束。

允许在新`src/core/residence-task/sample-protection.ts`抽出最小纯事实owner，供原`shared-actions.ts`与`player-metadata.ts`共同使用。名称/局部类型由Codex决定，但只在白名单文件内。优先最小抽取，不复制另一套判定、不建通用效果总线。原producer仍实际消费资源/处理来源/抽签；纯owner不签发、抽签、消费或写入。

metadata公开当前资源支付的name/kind/before/requested/consumed/after，与正式资源preview同源；不要输出真实instanceId、risk数值/表、隐藏暴露或未知未来。已有`resources`结构可以复用，不能用机制泛文案替代遗漏的数值支付。

严禁：一律向所有sample加1消耗；耗尽/不存在/不适用也显示支付；将外套设成新的硬前置；改变实际风险、费用或修复量；试跑producer/resolver/随机获取Preview；保存第二装备状态。旧来源、资格、P原结果、错误边界和测试保持。

同时在许可范围做一次支付映射核查：两样本法、crow/toolbox/lit、卡片无耐久支付、机械维护/充电、已知战斗武器支付。发现另一个必须改范围外宿主的问题，给出精确位置，不把整个系统重写；未发现也要报告实际阅读/测试范围，不空称全覆盖。

## 3. W3：成对回归与保护

至少覆盖：
1. 两样本方法×真实正耐久、末次1、耗尽0；存在合法无外套/其他防具前态时也测试，否则标明该形状范围；不能删甲破坏来源守恒硬造有效值。
2. 只读metadata/companion/controller preview与实际P支付严格一致；合法查询不改变输入，不冻结调用者，不发物、不advance revision/RNG，不签发、dispatch/write/notify。
3. 明确执行一次，真实外套只扣一次、sample只发一次；重复请求仍按原资格拒绝。保存故障/重试不重扣，既有其他资源支付对照保持。
4. 真实H5上下文下非法placement、stale/跨会话选择仍整笔拒绝；不要绕过原qualifier来“修”提示。
5. 同公开事实、不同隐藏感染/潜藏暴露/尚未抽取随机，metadata保持同等；不要把保护后的风险概率或暴露结果泄到metadata。当前D1四档只按已批准边界显示。
6. 谨慎防护风险为0的情况不新增draw；直接风险原抽签顺序和次数不变；不要用公开资源补齐增加一次producer调用。

保持原75项与更早测试（含获批D1两旧文件）原字节；本轮只加新测试，禁止修改旧断言/旧helper。无需改controller、安全三态或任何格式；可以在新state测试使用真实controller完成行为组合。

至少两类仓库外语义负控：去掉sample支付投影→原生支付对照失败；去掉耗尽/资格绑定→无支付对照失败。必须真实业务断言失败，导入/类型/fixture/timeout不算。变异不提交，恢复后重跑。原历史负控未复跑写NOT RE-RUN。

## 4. W4：完整检查、记录和Git

执行实际定向/组合回归、原15文件基础测试、两条原controller长链、E03与旧P/R/S必要回归以及默认`npm run check`。不得修改workers/全局timeout/CI/依赖。既有局部30秒预算保持；新定点用例无需长链预算，不借超时改旧测试。

五份工程记录保留BLOCKED→RESUME-01历史，追加R1修前/修后真实证据和当前状态；旧verification对象不得被替换，新增r1字段/记录。metadata-support应记录原遗漏及修复后的同源函数，不倒改“原先就完整”。四份共享文档只末尾追加。原Owner来源澄清不重开、不修改原件。

检查输入/范围/UTF-8/links/导入环/参数和正式合同、源码与暂存/提交字节。普通及本R1起点增量diff-check须exit0。自原工程起点ff2b79f的累计只许W02，真实exit2；自8c19ca0的累计只许W01七处+W02一处，真实exit2。全部路径/行号/告警/blob严格对照JSON，不能排除inputs目录或关检查；不得新加第九处告警。

允许普通commit/push，仅当前分支。建议message：`fix(query): disclose sample armor resource payment`。保留新完整SHA、parent/tree和远端核对；查询该SHA CI，未完成/限流保持实际状态。无需为获取CI结果改动代码或重复commit。npm audit仍仅维护项，历史404不升级成已安全；不得npm audit fix。

## 5. 交付和完成标准

修复后不只“加了一个提示字符串”：需原生P/preview成对证据、同源抽取的旧兼容证据、零重放/一次支付计数和默认完整check。

报告：完整起始/最终SHA、父/tree、实际基线、测试新增/替换/删除/净增、逐路径、原模板/适配/语义结果、两类负控、配置/旧实现保护、最终检查、W01/W02、远端/CI、unknown/NOT RUN与冲突。不能把主线8隔离项、历史75项与本轮新增叠加。

停止等待本WebGPT准确SHA专项复审；不自动进入browser owner/UI/其他工程。无需再次逐项询问Owner。

## 6. 精确路径许可（共29条）

1. `src/core/residence-supply/player-metadata.ts`
2. `src/core/residence-task/shared-actions.ts`
3. `docs/engineering/world-integration/preplay/foundation/implementation-notes.md`
4. `docs/engineering/world-integration/preplay/foundation/contract-and-support.md`
5. `docs/engineering/world-integration/preplay/foundation/metadata-support.json`
6. `docs/engineering/world-integration/preplay/foundation/verification-results.json`
7. `docs/engineering/world-integration/preplay/foundation/completion.md`
8. `docs/03-architecture.md`
9. `docs/08-rule-implementation-traceability.md`
10. `docs/design-drafts/world-infected-001/10-decision-queue.md`
11. `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
12. `src/core/residence-task/sample-protection.ts`
13. `src/core/residence-task/sample-protection.test.ts`
14. `src/core/residence-supply/player-metadata-payment-review.test.ts`
15. `src/state/residence-session/player-payment-review.test.ts`
16. `docs/engineering/world-integration/preplay/foundation/r1-inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-R1-task-v1.0.md`
17. `docs/engineering/world-integration/preplay/foundation/r1-inputs/OWNER-authority-and-scope-ENG-WORLD-PREPLAY-FOUNDATION-001-R1-v1.0.md`
18. `docs/engineering/world-integration/preplay/foundation/r1-inputs/BASELINE-AND-SCOPE.json`
19. `docs/engineering/world-integration/preplay/foundation/r1-inputs/AUD-cc147cd-ENG-WORLD-PREPLAY-FOUNDATION-001-review-v1.0.md`
20. `docs/engineering/world-integration/preplay/foundation/r1-inputs/verify-package.py`
21. `docs/engineering/world-integration/preplay/foundation/r1-inputs/source/player-metadata.ts`
22. `docs/engineering/world-integration/preplay/foundation/r1-inputs/source/shared-actions.ts`
23. `docs/engineering/world-integration/preplay/foundation/r1-inputs/evidence/check-sample-payment.mjs`
24. `docs/engineering/world-integration/preplay/foundation/r1-inputs/evidence/sample-payment-results.json`
25. `docs/engineering/world-integration/preplay/foundation/r1-inputs/evidence/source-integrity.json`
26. `docs/engineering/world-integration/preplay/foundation/r1-inputs/evidence/input-integrity.json`
27. `docs/engineering/world-integration/preplay/foundation/r1-inputs/evidence/ci163-summary.json`
28. `docs/engineering/world-integration/preplay/foundation/r1-inputs/evidence/native-sample-payment-regression.test.ts.template`
29. `docs/engineering/world-integration/preplay/foundation/r1-inputs/SHA256SUMS.txt`

既有源码只限前述纯抽取/投影；原controller、安全三态、G1/G2、S/domain、codec/schema/expected、配置/content、正式DEC/UIR、旧测试/fixtures、存储、UI和依赖均只读。
