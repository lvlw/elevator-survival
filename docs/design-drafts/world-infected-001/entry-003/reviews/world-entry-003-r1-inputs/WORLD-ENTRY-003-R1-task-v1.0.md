# WORLD-ENTRY-003-R1：死亡提案入口校验与验证收口

版本v1.0；日期2026-10-04。主线依据Owner既有任务下发权限直接下发。

**执行已授权；这是单项集中设计返修，不是新玩法采纳、生产工程或正式落文。不要逐文件/逐反例要求Owner再次确认。**

## 1. 目标、基线与停止点

将F01死亡提案入口修至“非法原字段不能被最终清退/关闭/revision覆盖掩盖，畸形步骤可靠语义拒绝，合法HP0仍完整消费”。一次完成修复、相邻入口自查、文档/合同局部同步、全套有限验证及原生观察、冻结双跑、普通commit/push及报告。

| 项目 | 固定要求 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整SHA | f93e17ac7b47af39833f2ecf05681fea03dbf689 |
| 起始root tree | b7136d7e088b1881957a573e0210b6faf92a8a51 |
| 分支 | feature/design-world-entry-003，继续已有分支，不新建 |
| 代码事实基线 | src与G4 7ca547ab8ab4f411d1102a79baf8c0796f4b082c完全相同；全部只读 |
| 写入范围 | 第8节26条精确路径；本任务范围替代原任务全体可写范围，不是任意并集 |
| commit/push | 本分支普通提交、仅同名分支普通push；禁止main/其他分支/强推/合并 |
| 完成停止 | 新准确SHA专项实文件复审；不自动进入采纳、正式归档或A/B/C |

开工实际核对HEAD、branch、origin、status、普通/cached diff、worktree及根/相关嵌套AGENTS。若出现不属于本任务的改动或提交偏离，停止相关写入并给具体事实，不reset、rebase、amend或丢弃成果。Owner电脑状态由你实查，主线没有访问用户磁盘。

## 2. 输入与事实读取

完整读取本包任务书、授权与范围、审查报告、BASELINE-AND-SCOPE.json、evidence全部内容及SHA256SUMS。核对本包每件摘要；原字节归档到第8节对应reviews/world-entry-003-r1-inputs路径。保持子目录结构，不重写输入原件或其清单。

重新读取固定SHA的：
- 原WORLD-ENTRY-003任务书和来源表；entry-003的00—05、config-candidate、完整check.py/fixtures/results/review-notes、current-api-probe/probe-results与completion。
- 相关正式DEC-049/050、O2恢复补充合同、G1/G2/G3/G4现有支持界限；按AGENTS读取GDD/Slice/Architecture/相关Content，防止将旧医院语义或候选参数当新授权。
- 本次F01针对的C05/C08/C09/C10、T08/T09/T10，原任务关于非法输入/合法死亡/一次消费的要求。

原任务的五份inputs、候选四个数值及其状态、G1批准34参数、正式条款和全部src继续只读。成功120等没有因本返修得到采纳；不改变失败20、不重接、指定样本、正常无夜或期限先结后召回。

## 3. F01精确问题与修复边界

固定脚本check.py的240—251行只严校proposal.base和snapshot/body根键，没有先严校snapshot内会被覆盖的revision、phase、missions及deathPoint。265—283行先清退/覆盖再validate，令不合法原值消失。steps=[]在267行trace[-1]崩溃。

本包37项专项在原样模型上得到26项匹配、11个缺口：
1. revision的-1/False/True/1.5/unsafe/NaN/Infinity七类被接受。
2. 错误mission execution、未知phase、畸形deathPoint三类被覆盖后接受。
3. 空steps导致IndexError而非受控Reject。

这11个反例归为一个根因返修，不拆成11项工程。原106项记录不抹去；它们没覆盖这些输入不等于原执行自述造假。

必须实现：
- 在字段覆盖、资产清退、构造收据、trace[-1]或current提交之前，对“已执行但尚未终局关闭的死亡提案”做严格结构/数值/联合绑定校验。
- 验证原revision为有限安全整数、阶段有效、任务/执行/角色与独立current一致、非提案所有者的数据不能被其任意改写；既成历史/钱包/既有关闭事实应保持其所有权。
- 明确本有限模型producer.snapshot的revision含义。当前简化producer保留前revision，消费结果再递增；可在此约定内修复，但不以它冒充真实G2 LocationPlan的完整格式/签发。普通技术表示可收口，不另建通用事件总线、全任务SDK或防回档框架。
- 死亡提案允许HP0，不能直接复用要求生还的active最终聚合validate而导致合法死亡全拒绝；不能先改HP/mission/phase/数字再校验。
- steps先检查非空及受支持序列/来源关系；缺失、错误类型、不合法元素/顺序等全部为明确Reject；不能捕获所有Exception后伪称预期拒绝。
- 尽量在副本上工作。所有非法提案保留current与disk，commits/writes/notices均0；producer已被调用一次并不应伪写为0。合法动作死亡结果一次消费，不能重新扣血、重抽或重建物品。
- 在同一批自查所有“校验后被覆盖/清零”的相邻字段，以及step/index、映射/列表假定。新增相邻反例必须绑定具体条款，不能通过简化全部拒绝或改核心玩法解决。

本期限定单委托、明示固定内容夹具、有限资源上界与子组件证明范围可以保持。不要求此返修实现生产CTB、全定义资源、完整多任务历史或离线防篡改；不得以“未来再验证”豁免模型已经宣称支持的输入拒绝。

## 4. 文档同步与防止假通过

将F01的提案输入阶段、数值/绑定/历史责任、语义拒绝与合法HP0消费，局部同步到02、03、04候选合同及05验证限制。00仍清楚标待Owner采纳；来源表只补定位，不把本次技术澄清写成新规则批准。不要改变O1/O2/O3候选取舍或扩大支持矩阵。

在原fixtures中增加本包11个缺口回归及相邻自查用例。断言必须验证预期语义错误及零提交/写/通知，不能只检toThrow或靠额外无关字段拒绝误通过。保留至少一个完全合法的真实动作HP0提案、原正常成功/失败/期限/休整对照。补全body字段时不改批准值。

`validation/results.json`保留原106项/冻结/负控/自查历史，可增加清晰的r1部分和当前结果定位；不能把主线37项加进作者原106项宣称新总量，不将重复运行计新增。`completion.md`保留完整原前缀，末尾追加R1最新状态。两份共享overview/queue仅末尾追加当前主线NEEDS REVISION、R1作者状态与待准确SHA复审；不得自称主线已PASS。

原current-api-probe.mjs只读，不借返修改造生产探针期待；probe-results允许记录此次复跑并保留旧记录。当前10项仍是G4真实行为观察，与未来模型严格分开。

## 5. 一次完成的验证顺序

### 5.1 修改前复现

完成读取和Git检查后先运行原有限套件一次，记录真实退出码/106项分层；不以历史日志代替。再运行本包固定专项：

```text
python <输入包>/evidence/we003-review-probes.py --repo <仓库根> --phase baseline --output <仓库外>/r1-before-probes.json
```

预期37项中26匹配/11不符、10误接受/1空步骤崩溃，退出1。baseline模式还核对脚本/两配置Git blob；正常对照须成功，不能用导入失败冒充复现。真实仓库会额外核对本包base语义选段与原fixtures.base相等。

### 5.2 修复后专项与全套回归

```text
python <输入包>/evidence/we003-review-probes.py --repo <仓库根> --phase fixed --output <仓库外>/r1-after-probes.json
```

同一专项预期37项全部匹配、0崩溃、退出0；含4项明确未支持匹配，不能说已实现37项能力。不得编辑本包脚本/选段/断言或绕过配置指纹。新增主回归应独立写进仓库fixtures；保留原base夹具语义，不为此另造不兼容的模型输入格式。

依原任务完整复跑原106项及本次新增回归，不预设漂亮最终总数。四类负控仍从check.py运行，而不是用专项负控替代原套件：

```text
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --output <仓库外>/r1-run1.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --output <仓库外>/r1-run2.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control duplicate-settlement --output <仓库外>/r1-negative1.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control death-recall --output <仓库外>/r1-negative2.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control old-ready --output <仓库外>/r1-negative3.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control reopen --output <仓库外>/r1-negative4.json
node docs/design-drafts/world-infected-001/entry-003/validation/current-api-probe.mjs --output <仓库外>/r1-api-probe.json
npm run validate:architecture
```

自查/文档/模型/fixture全部完成后冻结规范材料，两次独立进程输出字节一致且退出0；四负控退出1、有语义失败ID且不崩溃。规范/模型/fixture再次变化则重新冻结两跑。参数和只读保护oracle不得随意改成当前值来消灭漂移；本次合法改变的候选文档要与“受保护原件”分层。

原生探针执行有真实环境阻塞时如实写NOT RUN和原因，不改src/依赖/核心返回制造可运行环境。生产全量npm测试和build不要求本设计重复，未运行继续NOT RUN；下一工程另建实际基线。

### 5.3 交付检查

按本任务26条白名单核对改动；未要求创建空文件凑数。全部src及旧正式文档/配置/G1—G4证据/旧entry-003 inputs不变；两共享文档和completion原前缀完整。归档输入逐件字节/大小/SHA-256/Git blob相符。检查UTF-8、相对链接与锚点、普通/cached/基线到工作区及提交后diff --check。无新增空白例外，不改Git/SSL/CI配置、不吞退出码。

## 6. 交叉自查与Git交付

同一会话一次完成内部所有步骤。可用只读助手复核未校验原字段、错误码假通过和合同一致性；唯一主写者负责修改与Git；助手审查不冒充主线独立验证。

全部符合后普通commit，建议`docs: harden terminal death proposal validation`，再：

```text
git push origin HEAD:refs/heads/feature/design-world-entry-003
```

最多两次普通网络重试并实际ls-remote确认；失败保留本地成果并报告REMOTE UNCONFIRMED，不降SSL/改remote/代理/凭据。禁止强推、合并、amend、推main或其他分支。无需为解除F01单独做小提交；整个R1收口一次交回准确SHA。

## 7. 完成报告

报告：起始/最终/父完整SHA、分支/实际文件；F01修复前后11反例及专项结果；原106项保留和新增/替换/净增计数；全部合法对照、四负控失败ID与退出码；18件旧冻结与R1新冻结分别记录；Node探针/架构实际执行；只读对象/原件/前缀/diff；commit/push和远端；未完成项/冲突/NOT RUN/停止点。

明确“作者R1已完成，待新准确SHA主线复审”，不写通过主线、不进入三项工程。候选采纳由后续Owner集中审阅，不要求Owner逐条手算或重复任务授权。

## 8. 精确路径白名单

以下26条是全部可写范围。原config-candidate、原五inputs、current-api-probe.mjs及其他未列文件一律只读；本包12个文件原字节归档，映射见BASELINE-AND-SCOPE.json。

```text
docs/design-drafts/world-infected-001/entry-003/00-owner-review.md
docs/design-drafts/world-infected-001/entry-003/01-source-and-adoption-map.md
docs/design-drafts/world-infected-001/entry-003/02-terminal-outcomes-and-settlement.md
docs/design-drafts/world-infected-001/entry-003/03-state-ownership-and-restore.md
docs/design-drafts/world-infected-001/entry-003/04-next-engineering-contracts.md
docs/design-drafts/world-infected-001/entry-003/05-validation-and-open-gates.md
docs/design-drafts/world-infected-001/entry-003/validation/check.py
docs/design-drafts/world-infected-001/entry-003/validation/fixtures.json
docs/design-drafts/world-infected-001/entry-003/validation/results.json
docs/design-drafts/world-infected-001/entry-003/validation/review-notes.md
docs/design-drafts/world-infected-001/entry-003/validation/probe-results.json
docs/design-drafts/world-infected-001/entry-003/completion.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/WORLD-ENTRY-003-R1-task-v1.0.md
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/OWNER-authority-and-scope-WE003-R1-v1.0.md
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/AUD-f93e17a-WORLD-ENTRY-003-review-v1.0.md
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/BASELINE-AND-SCOPE.json
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/SHA256SUMS.txt
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/evidence/base-fixture.json
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/evidence/we003-review-probes.py
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/evidence/mainline-results.json
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/evidence/negative-duplicate-settlement.json
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/evidence/negative-death-recall.json
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/evidence/negative-old-ready.json
docs/design-drafts/world-infected-001/entry-003/reviews/world-entry-003-r1-inputs/evidence/negative-reopen.json
```

规范和fixture可作F01局部修订；completion与两份共享文档仅追加；原始R1输入不可改写。
