# DOC-WORLD-ENTRY-004 完成记录

文档交付：W1—W4已完成，实际检查通过；本文件随本次普通提交交付。提交后完整SHA／父SHA／tree、push及远端回执由最终消息给出，不在本文件追逐自身提交SHA。当前授权停止点是准确SHA文档实审，生产工程未启动。

## 基线与实际批准

- 起点：`612ac6673223cc93237184892e6713e789a9dce1`；父：`0362460b259cba6ea160e79ad04a6cb14181cef0`。
- 起始tree：`b4a24ed36d181bb86fdd26c0339fe765c933255b`；保护src tree：`98c840dd0b6b1a6cc014df4ac9165bc94bf2c794`。
- 分支：`feature/design-world-entry-004`；origin为`https://github.com/lvlw/elevator-survival.git`。开工HEAD／分支／工作区／普通与cached diff均符合；既有worktree沿用，20条新增落点未被占用，13项远端参照全部匹配。
- 执行依据：[本任务书](inputs/DOC-WORLD-ENTRY-004-task-v1.0.md)、[Owner实际批准](inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md)、[获批稿原件](inputs/WORLD-ENTRY-004-ADOPTION-owner-review-v1.0.md)。[R1实审](inputs/AUD-612ac66-WORLD-ENTRY-004-R1-review-v1.0.md)只按其F01/F02限定范围承接，不替代Owner批准或本次文档实审。

## W1—W4交付

| 包 | 实际成果 |
| --- | --- |
| W1 | 全部13件输入按原字节归档，SHA清单12件有效；保留旧稿待采纳／不授权归档的历史原话，以实际批准更新当前身份 |
| W2 | [DEC-052](../../../../05-design-decisions.md#dec-052)严格按旧blob＋两个LF＋载荷追加；[103键试用配置](../../../../content/infected-world-entry-test-config-v0.1.json)和[限定内容](../../../../content/infected-world-entry-content-v0.1.json)整文件复制 |
| W3 | [E01-P首契约](../../../../engineering/residence-foundation/content-supply-core-contract-v1.0.md)、[来源恢复合同](../../../../engineering/residence-foundation/content-supply-restore-contract-v1.0.md)、[批次门槛](../../../../engineering/residence-foundation/world-content-batch-plan-v1.0.md)整文件复制，P→R→S分别准确SHA停审 |
| W4 | 10份旧文仅末尾追加、13份来源入口仅前插附记；共44条精确白名单路径，无旧正文删除／重写；实际检查与字节指纹见[checks.json](checks.json) |

103键／193整数叶对照锁定Git源的完整值与数组结构，不只比较数量；原104键仅排除`grant.H2-random`。内容精取九字段，唯一内部结构变化为`H2-random.grants=null`；24节点／29连接、choices／weights／unit保持，没有固定多送消毒剂。两个原38值配置原字节不变，未将有限模型初态、外部CTB／伤害轨迹或Python字段搬入正式数据。

正常H0生还返回保留真实`steps=[]`，实际休整／截止／死亡保留相应真实步骤。新医疗可先治疗再流血，因此新来源死亡独立验真，旧G2单调伤害校验不放宽；A只消费一次，B旧v2整输出校验不删，v3补有界来源份额守恒。样本直接／谨慎都有效，旧谨慎＋外套只是条件路线；quickEligible不等于战斗资格，消毒剂不可战中使用。

## 本轮实际检查

- 原包`verify-doc-package.py --phase input`、`--phase final`均exit 0；归档13件、六载荷、DEC拼接和23份前／后缀保全通过；白名单外930个基线blob保持。
- `npm run validate:architecture`：exit 0，实际52条DEC、257个core production文件；未改校验器、依赖或阈值。
- UTF-8／JSON／新增与未跟踪内容空白、链接／锚点核对通过。精确文件集合、链接出现次数、锚点数和解析上下文逐项保存在checks；原件载荷链接按正式目标解析，其余原件保留包内上下文。未把未修改的历史正文链接宣称全部通过，外部旧路径不作为有效仓库链接。
- 工作树、暂存及基线diff检查按真实阶段记录命令／退出码／输出；无空白例外。暂存后按44文件逐字节和完整cached diff核对，再普通commit；提交后blob与远端结果见最终消息，不把提交前快照写成已push。
- 两项只读辅助审查分别核对批准／载荷与现有G1/G2/A/B/C合同接缝，未发现实质矛盾。它们属于作者辅助交叉检查，不称主线独立验收。暂存时仅两份作者报告出现CRLF转LF提示（add退出0），已将报告输出固定为LF后重新暂存；输入原件未改，无空白豁免。无需调参或扩路径。

完整命令与原始输出也保存在仓库外临时目录`C:/Users/zjl/AppData/Local/Temp/doc-world-entry-004-i9obp7t5`，checks保存日志路径、退出码、摘要和字节指纹。最终Git回执在同目录留存；不因记录回执追加提交或amend。

## 证据边界、未完成与停止

旧作者194项有限检查（含5未支持）、24项原生观察（含5未支持）、原31项复现及主线41项专项检查分别保留历史身份，本轮没有重跑、覆盖或累计成绩。当前本地文档检查、历史作者证据、前置主线实审与远端CI分开。

起始／最终生产测试均 **NOT RUN**，新增生产测试 **0**；`npm run check`、typecheck／build、历史模型、浏览器／多标签、Owner试玩和安全审计均 **NOT RUN**；远端CI **未核验**。实际模型／推理配置没有可核验运行时回执，不作指定型号或强度已经生效的声明。

本轮范围内无未完成文档或已知规则冲突，无白名单外修改。Git交付阶段结果以最终实际回执为准。E01-P／R／S、E02／E03均未执行，v3仅文档指定、未注册；R具体结构依P实值另定，活战斗格式、完整体验、UI／浏览器、商城／服务、未来改专长、第二委托及O3继续保留各自门槛。未改Project Sources、正式旧合同、原38值、源码、生产测试、依赖、CI或Git配置；没有分支／worktree创建、合并、强推或电源操作。

完成普通提交与同名分支push后，停止等待当前WebGPT主线准确SHA文档实审；不自动进入下一工程。
