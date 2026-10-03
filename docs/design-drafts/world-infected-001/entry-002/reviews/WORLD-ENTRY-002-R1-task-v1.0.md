# WORLD-ENTRY-002-R1：周期、关闭现场与数值边界合并返修

> 任务书 v1.0；日期：2026-10-03。
>
> 主线按Owner已授予的任务编制／下发权限下发；本批是WORLD-ENTRY-002既有候选范围内的修订。收到完整输入包直接执行，不再申请生成任务书或逐步骤授权。
>
> 只修改列明文档和Python有限设计模型。不改变已确认玩法，不改生产源码，不批准O1/O2/O3，不执行G1—G3。

## 0. 一次交付的目标

关闭审查 `AUD-136e98a-WORLD-ENTRY-002-review-v1.0.md` 的F01—F03。一次完成：读取实际基线和复现材料→在原模型复现→细化合同及有限校验→补反例与组合对照→自查修订→全套有限验证与冻结复跑→文档同步→普通commit／push→最终报告。

不要分成让Owner逐项确认的三个任务，不重新设计五图、任务重接、失败处罚或末日政策。首核心 `d1d3b79` 的原PASS保留。修订发现需要改变机制或发布兼容承诺时，只把该实质问题留在集中页，不自行选择；其他独立修订继续完成。

## 1. 来源、基线、分支与Git权限

```text
仓库：lvlw/elevator-survival
本批起始完整SHA：136e98aa2c4bff7f84cdd0f67056771d837d562a
继续已有分支：feature/design-world-entry-002
不新建分支，不新建worktree，不回旧设计／工程分支执行。
```

主线核对的其他远端引用：

```text
feature/mission-lifecycle-core-001  d1d3b7927c6733cff709a4bfd617fb1e85e7485a
feature/design-world-infected-world-001  6b48b3de6521d9a9c296754a4d8135c7f7c7ca35
main  a76e9c1c998051fc1643b6e0c3d53443fa55feed
```

本任务明确允许在本分支、下述白名单内修改，普通commit，并普通push至同名远端；允许必要只读fetch。不允许merge、pull、rebase、amend、强推、推main或其他分支。不以先前任务权限自动延伸为依据，本节只授本批明确权限。

依据是：Owner已明确要求主线直接下发完整任务，并希望合并工作量；原WORLD-ENTRY-002已授权范围内自查修订；本次主线实际读审发现F01—F03并给出复现。以上不替代未来O1／O2规则批准，也不授权正式DEC落文。

## 2. 开工核对与必须读取

输入包保持仓库外。核对本包SHA256SUMS，然后读取本任务书、审查报告及 evidence/README.md。`evidence/source/verify_entry_002.py` 是评审提交脚本的已核验副本；它和主线探针只作复现依据，不复制进生产或另建规则真相。

执行并记录实际结果：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin refs/heads/feature/design-world-entry-002 refs/heads/feature/mission-lifecycle-core-001 refs/heads/feature/design-world-infected-world-001 refs/heads/main
```

期望HEAD等于本批起点、分支正确、工作区与暂存干净。发现自己的合法续办成果先辨别归属，不覆盖；发现他人改动或无法解释的基线变化，停止相关写入并给出具体差异。不要让Owner手动reset或协调文件。

重读实际AGENTS.md要求的规则，特别DEC-049及其新旧版本范围、003D的普通合法携出和周期衔接；重读entry-002的00—03、全部验证脚本及相关fixtures/expected、作者review-and-fixes与完成报告。原首契约B4/B5/B6只读，不能据本批修订把它改成新的生产合同。

## 3. F01：补周期与终局／驻留的联合约束

先在当前真实脚本复现：

- 唯一closed/success、生还Hub、cycle=2，却带bridge=2，候选恢复错误接受。
- active-world、真实cycle=1、taskDay=7，候选恢复错误接受。

R03／W2已经要求正常返回待结、末日先结后的一次ready；不能仅验证bridge等于当前cycle就允许它存在。细化并实现**当前有限模型范围内**可执行的状态矩阵，覆盖首次ready、活动驻留、正常成功／主动失败返回、期限失败已结、生还中枢与死亡。

必须回答并落实：什么真实结果产生ready；它指向哪次执行／角色周期；何时消费与失效；正常返回不能借历史曾发生过deadline获得新豁免；同一活动期间D与T如何相容。不要只追加一句“上层保证”，也不要把不可能组合改成“合法夹具”。

允许在本候选中细化字段／互斥表示、窄的来源引用和内部校验。这是Draft实现组织，不批准新的玩法。不得复制一份可改关闭账、全周期去重全集、永久免日布尔或密码学令牌。冷启动不得复制候选当独立期望；不能把绝对离线防回滚当作本条要求。

至少新增或明确覆盖：正常成功和主动失败后的非法ready拒绝；合法deadline-ready保留且只消费一次；消费后下一周期仍结；缺／错来源引用、旧cycle、新revision与旧周期组合拒绝；D/T不可能组合拒绝；当前无真实新委托不消费ready或结健康。

若更复杂历史不在模型支持范围，明确哪些形状拒绝／未支持，不接受矛盾候选。不得用全面禁用生还Hub或ready的方式让反例变绿。

## 4. F02：关闭世界的地面物不能成为Hub可操作资产

先复现两条合法前序：

```text
Day7 C0地面留物 → deadline失败召回 → pickup同一C0地面物
H0地面留物 → 正常失败返回 → pickup同一H0地面物
```

当前脚本会把该物移入bag。修正世界活动位置、历史位置、Hub和物品容器的引用边界。位置字段可以按候选合同组织，但不能在已经关闭后继续充当原世界行动的资格。

支持范围内的成功／主动失败／期限失败关闭均禁止从旧世界地面取得未携出物；任何后续异委托夹具也不得重新把旧关闭现场当活动现场。保持已合法携出实物的ID、数量、耐久／电量和既有效果；不通过清空全部物品或删除旧历史“修复”。

保持同一活动驻留内的合法E0拾取、跨图／跨夜留置与回访取物候选；不要把本条扩大成禁止这些已允许的活动行为。任务提取与已揭示物拾取仍不同。

无需建立完整物品／任务件清算或钱包。涉及模型明确未支持的处置时，拒绝相关操作或标未支持，但不能返回成功。补关闭后的行动组合负例和活动驻留的正例，并更新W1/W2和V映射中可以证明／不能证明的范围。

## 5. F03：数字和意图先验，不能由后态合法掩盖非法输入

当前独立复现：spend=-5令E50变55且发生一次写／通知；spend=true被当作1；成本8乘MAX_SAFE_INTEGER后仍移动并截零；revision=true／cycle=true与当前整数1比较成功。

对模型实际使用的消耗、周期／版本以及计算结果应用严格的数值校验：非负或正安全整数按具体角色区分，布尔不算整数，小数／负数／不有限／超界不得默转。最终合成成本也须验证，不能仅查乘数各自是安全整数或靠E截零遮蔽问题。输出不合法应在提交之前拒绝，原输入、当前owner、revision、写入和通知不变。

免费0与付费正整数分支分开；E1执行合法8E动作仍应完成并截零，不要求余额覆盖成本，不引入债务或扣HP处罚。已有只读view继续无状态变更。

owner的spend若保留为**受控内部故障时序夹具**，必须明确这不是G3玩家命令或完整移动验证；先检查该夹具本身合法性。business_supported／complete布尔不构成生产业务授权，不能据它把G3验收写成已解决。无需把本模型做成通用应用框架。

同批补字段缺失／额外／错类型的直接邻接反例；外部前提夹具和本模块自行验证的字段分开，不把外部checks布尔称为真实地图／背包／战斗检验。

## 6. 文档与审批边界一并收口

修订00—03中受到以上影响的字段职责、拒绝表、近期Goal验收和实际证据；来源状态保持正式／Owner确认待落文／Draft／未支持分开。

集中页继续最多O1/O2/O3三组，明确G1直接依赖的O1条文与配置子集；R07持续现场及冷启动安装的O2内容不能因为O1一行写R02—R07就被混批。O3仍为公开发布前待决，不阻塞第一纯核心审阅。不夹带成功120、服务商品、三专长或新内容批准，不自行占新DEC编号。

本轮只修模型／合同的自洽和证据，不改变普通合法携出、失败20、无内容不出发、HP0才死亡、正常返回不补夜、末日先结后召回。原首核心PASS和原任务BLOCKED历史不倒写。

## 7. 精确写入白名单

下列路径前缀均为：

```text
docs/design-drafts/world-infected-001/entry-002/
```

允许修改这11个既有文件，限本批内容：

```text
00-owner-review.md
01-local-rule-amendments-draft.md
02-runtime-restore-contract.md
03-next-engineering-goals.md
validation/fixtures.json
validation/expected.json
validation/verify_entry_002.py
validation/results.json
validation/run-record.json
reviews/review-and-fixes.md
completion.md
```

允许新增这3个文件：

```text
reviews/WORLD-ENTRY-002-R1-task-v1.0.md
reviews/AUD-136e98a-WORLD-ENTRY-002-review-v1.0.md
reviews/r1-regression-summary.json
```

前两份按本包原字节归档；r1-regression-summary记录F01—F03逐项复现、修订位置、正反例、实际状态和未支持层。复现脚本副本、主线探针及临时日志留仓库外，不增仓库文件。

除此之外全部只读，特别是原 `entry-002/inputs/` 五件、04源码映射、五处既有N01附记、原首核心文档与源码、正式DEC/GDD/Slice/Content、已批首契约、旧004/evidence、AGENTS、src、依赖、CI、hooks及配置。不得更新Project Sources或ChatGPT项目说明。

历史保存：run-record与review-and-fixes保留136e98a时117项、两跑和负控的证据身份，在R1新节／新对象记录本轮，不把旧0不符改写为本次探针8不符。原fixtures/expected/script/results可按R1更新，旧字节通过固定136e98a回溯；完成记录保留旧交付定位并在顶部追加R1当前状态，不能把原版本改成当时已通过主线。

## 8. 验收与负控

写之前在原脚本上复现F01—F03，记录真实结果。主线 evidence/reproduce_review.py 是固定基线复现器，默认退出1并展示8个缺口；不是要求原版本先全绿。不得编辑该外部审查原件使它变绿。

修订后的模型结构可以改变，按相同语义把8个反例迁入正式fixtures/expected；不能照抄主线内部测试形状就替代合同。预期必须先按来源确定，不从实际结果批量生成。原117项逐ID保留或逐条说明有依据的调整，不悄悄删反例、降级所有Hub状态或放宽预期。

实际运行：

```text
python -B -X utf8 docs/design-drafts/world-infected-001/entry-002/validation/verify_entry_002.py
python -B -X utf8 docs/design-drafts/world-infected-001/entry-002/validation/verify_entry_002.py --negative-control cycle-dedup --output <仓库外路径>
python -B -X utf8 docs/design-drafts/world-infected-001/entry-002/validation/verify_entry_002.py --negative-control cross-binding --output <仓库外路径>
```

保留现有CLI；正常最终退出0，负控必须检出对应不符并退出非0，不是模型崩溃代替检出。为F01的ready来源、F02的关闭场景访问或F03的数值前提增加至少一类针对性负控，记录故意删掉保护确实被新回归检出，不污染正式脚本／参数。

冻结fixtures／expected／script后以两个独立进程复跑，第二次用--output写仓库外。比较字节及规范化结果一致，输入／脚本前后指纹不变。分类保持正例、预期规则拒绝、持久化故障、未支持和实际不符可区分；同例重跑、主线24项、原117项、辅助探针不累加包装。

检查全部本批修改为严格UTF-8、LF、无BOM与非必要尾空格；实际核对新增／修改链接及锚点、原inputs未改、精确白名单与保护对象。不得为此改Git空白配置或忽略hook。

```text
git diff --check
git diff --cached --check
git diff --check 136e98aa2c4bff7f84cdd0f67056771d837d562a
```

这些本批差异都应退出0。旧6b48b3d审查原件三处获批空格早已位于起点，不在本批新增差异；不用重新申请例外，不为更早main比较重写原件。

本轮仅设计修订，生产npm测试与构建不要求重跑，写NOT RUN；后续生产Goal仍必须建立自己的真实基线。新保存IO、浏览器、全CTB及Owner试玩保持未接线／NOT RUN。N02维护事项保留，不重复开网络审计或修改依赖。

可使用只读辅助审查，根会话统一写入/Git；不可用则独立顺序作者自查并如实命名，不伪称主线通过。普通范围内问题本批自主修订。

## 9. 提交与交付

必需检查通过后，普通commit／push本分支，不amend。提交前检查暂存内容，提交后实际核对：

```text
git rev-parse HEAD
git log -1 --format='%H%n%P%n%s'
git diff --name-status 136e98aa2c4bff7f84cdd0f67056771d837d562a HEAD
git diff --check 136e98aa2c4bff7f84cdd0f67056771d837d562a HEAD
git status --short --untracked-files=all
git diff --check
git diff --cached --check
git ls-remote --heads origin refs/heads/feature/design-world-entry-002 refs/heads/feature/mission-lifecycle-core-001 refs/heads/feature/design-world-infected-world-001 refs/heads/main
```

核对src tree、DEC blob、首契约blob和其余白名单外对象未改。完成文件的最终SHA可以指向所属提交和提交后消息，不能无限自改SHA。

Owner最终只需转发一次以下报告：

```text
WORLD-ENTRY-002-R1：COMPLETE / PARTIAL / BLOCKED，等待主线专项实审。
起始SHA：136e98aa2c4bff7f84cdd0f67056771d837d562a
最终SHA：<实际完整SHA>
分支：feature/design-world-entry-002
F01周期／终局绑定：<复现与修订、实际测试>
F02关闭世界访问：<同上>
F03数值与意图边界：<同上>
有限套件：<正例／拒绝／故障／未支持／不符分别计数>
负控与冻结两跑：<真实结果，不累加>
原件／白名单／diff／其他分支：<实际结果>
普通commit／push：<实际结果>
新增生产代码／测试：0；真实保存／浏览器／Owner试玩：NOT RUN。
O1/O2/O3仍按批准边界待审。已停止，不执行G1—G3，不合并main。
```

**停止点：修订提交已推送，等待主线准确SHA专项实文件复审。** 不自批规则、不开生产、不把Python通过写成世界可玩。
