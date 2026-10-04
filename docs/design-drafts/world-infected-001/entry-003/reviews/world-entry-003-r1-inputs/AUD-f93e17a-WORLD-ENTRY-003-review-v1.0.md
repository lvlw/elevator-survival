# WORLD-ENTRY-003：固定提交实文件审查

标识：AUD-f93e17a-WORLD-ENTRY-003 / v1.0。
日期：2026-10-04。结论：**NEEDS REVISION — 一个设计验证入口阻塞 F01**。

## 1. 结论与停止点

本轮不批准采纳、不进入正式文档归档或 A/B/C 生产工程。限定返修只处理“已执行动作死亡提案在终局覆盖字段前的严格校验”及其错误诊断、回归和合同对齐；不重做五图设计，不改变已确认玩法，不撤销 G4 的限定 PASS。

四终局、一次完整清算、先编解码后会话消费的组织可以继续保留为候选。成功120／初始0／余额上限与空间策略、返回分流和任务件细则、新技术格式仍待Owner采纳。此次发现不要求Owner重新选择已确认的失败20、不重接、正常返回无补夜等方向。

## 2. 精确基线及证据来源

- 仓库：lvlw/elevator-survival。
- 审查提交：`f93e17ac7b47af39833f2ecf05681fea03dbf689`。
- 父提交：`7ca547ab8ab4f411d1102a79baf8c0796f4b082c`。
- 最终 root tree：`b7136d7e088b1881957a573e0210b6faf92a8a51`。
- 远端设计分支：`feature/design-world-entry-003`，本轮实读与最终SHA一致。
- main仍为`a76e9c1c998051fc1643b6e0c3d53443fa55feed`；G4仍为`7ca547ab8ab4f411d1102a79baf8c0796f4b082c`。
- 两端根tree逐项读取：除docs外其余根节点对象相同；`src`均为`4d28340ad020950e90bbbed1dc0b902a7f6880db`，故本次生产源码与测试没有变化。AGENTS、package/lock、scripts、CI与构建配置也没有变化。
- Owner电脑的HEAD/status/diff与工作区干净为作者报告；主线没有读取用户本地磁盘。

实际阅读：原WORLD-ENTRY-003任务包；本提交00—05六份正文、config-candidate；完整483行有限模型check.py；fixtures的基线和有关数值/恢复用例选段；完成报告、交叉审查、results中的冻结/执行分层记录；提交元数据、两端根tree、远端refs和五份归档原件的远端blob元数据。

主线未完整重跑作者106项套件，未复跑10项Node原生API探针，未重新执行作者的全路径/778对象/18件冻结/50处链接套件，也未运行生产npm、架构、构建、浏览器或试玩。此处不把这些项目写成主线新增验证。报告仅就已实读证据和定点执行给出限定返修结论。

## 3. 原件与可执行材料完整性

本地已交付原任务包的五份文件，逐件计算大小、SHA-256和Git blob，与本提交inputs目录的远端大小/blob一致。可复核明细见独立复核包input-fingerprints.json；返修包BASELINE-AND-SCOPE.json也记录同一明细。这不表示Project Sources已经同步。

有限脚本从连接器读取的完整正文落到独立审查目录，再核对Git blob与SHA-256；执行的是该原样脚本，不是重写的结算算法。数值依赖也按固定提交核对。

| 材料 | 大小 | Git blob |
| --- | ---: | --- |
| entry-003/validation/check.py | 29012 | e4219d0acc20608df8b889859830d6b1c7adae25 |
| entry-003/config-candidate.json | 1521 | f0a5b2190feea4ca541e68fc0ea0e11ec53244b3 |
| docs/content/infected-residence-core-test-config-v0.1.json | 1417 | db6959ac02bf1e3bf8e816fe2b0d148ced9ca273 |

check.py SHA-256：`b953839d79a907dbd6552c0ed22da04eb6b070ac06c97c10931de1c133bf297f`。

专项输入base-fixture.json是fixtures.json中base对象的语义选段，不是46796字节全夹具文件的副本；专项脚本在完整仓库执行时会另断言该选段与仓库base相等。主线未修改模型或替换其依赖函数。正常成功、失败、期限、休整和动作死亡均由原函数实际执行；没有用mock成功返回证明结算。

## 4. F01：死亡提案的非法原字段被最终后态覆盖，且空步骤导致崩溃

优先级：阻塞本次设计验证准入，不是已经接入玩家入口的生产漏洞。

文件：`docs/design-drafts/world-infected-001/entry-003/validation/check.py`，固定审查SHA。
定位：240—251行接收resolved-action提案；265—267行清退与生成deathPoint；279—283行覆盖钱包/任务/revision后才validate。

### 4.1 原因

入口严格验证了proposal.base及其与current的相等性，但对snapshot只检查根键集合和body键集合。snapshot中将被覆盖的revision、phase、mission execution、deathPoint没有在原值尚可见时完成类型、身份或阶段验证。终局随后强制写回dead、E、有效revision和新deathPoint，最终validate只能看到已被修正的值。

这直接违背本稿C09/C10以及原任务T09/T10要求：非法输入不能因HP0、清零或合法后态被洗成合法；不能以最终可恢复替代对输入提案的校验。模型已经有bad-proposal测试操作，故本发现是在它宣称覆盖的边界内，不要求实现完整生产能力安全或离线防篡改。

### 4.2 最小复现

使用原base夹具，将身体设为HP1且bleeding=true，原producer按bleed_action真实扣至0。只改它返回的snapshot.revision=-1，保持独立base和其他字段不变。Session.dispatch接受并产生revision5的dead结果，计数为plans=1、commits=1、writes=1、notices=1。

同一方式，False、True、1.5、9007199254740992、NaN、Infinity也被覆盖后接受。另将snapshot.missions.M.execution改为OTHER、phase改为不存在的值、deathPoint改为畸形对象，也被同一个最终覆盖路径消除后接受。它们不应取得一次有效终局提交。

steps=[]虽通过“列表且元素为字符串”的检查，267行trace[-1]随即IndexError。它没有提交current，但不是语义Reject，也不能作为预期拒绝或有效负控检出。

### 4.3 修复要求

在清退资产、写闭合事实、覆盖revision或索引步骤之前，验证“已执行但尚未关闭的死亡提案”本身。该提案允许真实HP0，不能直接套用要求生还的active聚合验证，更不能把HP改回1来通过校验。

须明确有限模型自身的revision约定，并核对数值、完整身份/任务绑定、可用阶段、尚未形成终局凭证、步骤非空/合法顺序，以及producer不拥有的任务/钱包/既成历史。当前固定模型producer保存前revision，不能把它的简化表示冒称真实G2 LocationPlan的完整格式；生产合同继续消费真实G1/G2结果。

拒绝必须发生在零提交/零写/零通知边界；只有提案来源调用本身已发生一次，不要求倒改成零次。合法HP0提案仍应关闭为dead，不能一律拒绝死亡来消除反例。原已算动作/身体/实例结果不得重跑。

## 5. 主线独立执行结果

专项脚本：evidence/we003-review-probes.py。

- 37项：26项对照符合预期，11项缺口；其中10项被错误接受，1项空步骤IndexError。
- 26项对照内含4项“明确未支持”的匹配，不能算已实现能力；其余覆盖成功、四个余额失败、Day7正常无补夜、截止三类死亡短路、生还休整、真实动作死亡、模型Reject对照、四类终态值恢复及幂等。
- 专项整次退出1，完整结果见mainline-results.json；不把“成功复现缺陷”称为37项契约PASS。
- 在同一专项脚本的controls选择上，原四类语义负控分别检出1/3/1/1项不符，均退出1、没有崩溃。这不是作者原106项四次负控复跑。
- 原作者报告106项（28正、70拒绝、4故障、4未支持）和10项原生API观察原样保留为作者证据；不与本次37项累计成“总覆盖”。

可重复命令：

```text
python <本包>/evidence/we003-review-probes.py --repo <固定f93e17a仓库或审查胶囊snapshot> --phase baseline --output <仓库外>/mainline-baseline.json
```

修订后的命令仅将phase改为fixed，正常专项应退出0且原合法对照仍成立。专项输入文件和断言不应被修改来迁就结果；新增仓库回归由Codex独立完善。

## 6. 下一步

直接下发WORLD-ENTRY-003-R1，在同一设计分支从f93e17a继续，一次完成F01入口修复、相邻被覆盖字段审查、反例回归、六份候选文档局部对齐、原106项套件与四类负控、冻结双跑、原生观察和普通提交/推送。

不把R1扩大为新经济设计或生产修复。R1交回新准确SHA复审；通过后再给Owner集中采纳稿，不重复要求任务下发授权。当前不启动正式归档或A/B/C工程，不合并main，不更新Project Sources或项目说明。
