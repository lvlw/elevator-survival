# WORLD-ENTRY-005 准确 SHA 实文件审查 v1.0

## 结论与当前操作

**NEEDS REVISION：先执行 WORLD-ENTRY-005-R1，暂不正式归档或开工 E02。**

受审提交：`df1c3ff6979703b72bf76d73761b3915e59eb5b2`。
父提交：`9c3c8a8c97c374bd1def6217c691137f3df10096`。
Tree：`6262d1aa53a8103f14b6e7e930af95f3bf17ad7d`。
分支：`feature/design-world-entry-005`。
日期：2026-10-05。

两组阻断问题均来自本轮有限合同检查器，不是现有玩家代码或v3恢复发生回归。已审E01-S保持原结论。当前仍无需Owner重新选择已批准战斗玩法；本轮不给技术候选批准生效。

## 1. 已读取与核验的材料

读取本次00—06合同主体、验证README、完整check.py、完整state-candidates.json、完整23项native-probe源码、完成报告，并核对原WORLD-ENTRY-005任务包及E01-S既有接口上下文。06文件尾部和07体验页未作为本轮阻断发现的依据，未声称逐字审完整设计目录。

GitHub读取确认父SHA、tree和当前远端同名分支均为上述值；src子树为`10501d897195173df2023b1ebd73f9f097228512`，与受审E01-S一致。没有宣称主线直接读取Owner本机HEAD/status。

独立计算本会话原任务ZIP五件文件的Git blob/大小，与准确提交的inputs逐件匹配，详见`evidence/archive-verification.json`。完整模型脚本与完整spec也匹配远端blob：

| 文件 | 字节 | Git blob |
| --- | ---: | --- |
| validation/check.py | 16672 | 95150e405ee7427badeebddd9c590106071ff602 |
| validation/state-candidates.json | 1862 | 60d059f7aaf3ec8b1a0bae231314fbcd107b55d0 |

模型以原样完整Python模块执行，没有修改规则函数、替换工具函数或把模型改写为另一引擎。主线使用自行编制的34个有限见证，不是完整复跑作者106项case。34项重复跑一次用于核对通用复现runner，不累计为68项。

## 2. F01：逐分支原始值与目标边界未全部先验

范围：`validation/check.py`，尤其check_state、entry、trace和restore分支。

### 2.1 实测错误接受

- entry的arrivalHp=13、arrivalEnergy=101仍返回ACTIVE_DECISION；这已经超出同脚本上限12/100，不涉及计算完整战斗。
- arrivalPending=1可以冒充布尔；入场battle.id为空亦接受。
- entry携带非空defense或escape对象仍返回ACTIVE_DECISION，而04合同和check_state都明确不支持把这类中间状态作为决策点。
- trace的finalHp=False能与实际0比较相等，返回DEAD_ONLY；firstAfter字符串`"true"`不被拒绝；生还trace的outcome=None亦返回TRACE_ALIVE。
- restore仅做expected外壳及Python相等比较：expected.revision=True可匹配revision1，expected.enemy.encountered=1可匹配true，expected.queue中的False可匹配0。

**以上12项错误接受不是新增玩家能力，也没有实际写盘。** 检查器没有current/storage；它们说明当前“原值、队列、死亡绑定验证完成”的有限证据还不可靠。

### 2.2 实测非语义异常

- trace.steps=None：`len(None)`触发TypeError。
- dead restore的terminal缺binding：先读取terminal.binding后才检查其keys，触发KeyError。
- dead restore缺可用独立死亡锚、expected.current=None：直接下标访问触发TypeError。

这三项必须是明确的语义拒绝，不能把程序异常当成“拒绝成功”。冷恢复本身不要求永远提供全量committed；但本样本当前依赖expected.current作为死亡锚，因此不能在缺少替代独立锚时盲读它。

### 2.3 修复范围

按操作/分支验证完整原形状、必要字段、数值域、布尔、标签和嵌套对象，再做等值、下标访问、覆盖或构建输出；entry的结果必须满足它所声称的决策边界。不要求另写CTB引擎或证明所有伤害可达。

相邻自查应覆盖相同旁路的exit、medicine、order、continuity等输入处理；不新增无关玩法，不用全局catch转换所有异常来掩盖程序错误。

## 3. F02：死亡恢复错误绑定示例首场battle

范围：`validation/check.py`的restore死亡分支，原约第191—199行。

当前流程先确认terminal.battleId等于外部expected.current的对应值，随后却用`spec['activeBattle']`拼出trace前态。该对象固定为首个示例`TEST-execution:11:orderly`。

独立正例：同一TEST执行的再入场为`TEST-execution:21:orderly`，entryRevision21，持续敌人/50CTB再入队列及外部expected一致；在该场产生HP1→0的合法有限流血死亡记录。其active冷恢复能过，但相同场次死亡的cold及same-progress都被REJECT:BINDING错误拒绝。

两项是假阴性，不是坏历史通过。它们没有宣称真实新世界战斗已经生成或完整CTB可达，只验证合同已经要求的“不是只有固定首场能恢复”这一身份关系。

修复必须依据经过验证的该条历史及独立锚建立trace验证上下文，不从全局示例首场借battle身份、节点或入场revision。不准删掉sourceBattle比较或无条件接受任意battle。错误第二场ID的对照仍须拒绝；缺最小证据就明确语义拒绝或补充候选最小原事实，不伪造材料。

## 4. 独立执行结果

| 分类 | 数量 |
| --- | ---: |
| 总固定probe | 34 |
| 符合预期 | 17 |
| 不符合预期 | 17 |
| 其中错误接受 | 12 |
| 其中程序异常 | 3 |
| 其中合法有限见证被误拒绝 | 2 |
| 已符合项内的明确未支持 | 3 |

所有输入执行后保持不变。14项正常/既有拒绝对照及3项UNSUPPORTED识别成立。合法E0到达、HP0入场前短路、首入/再入、治疗封顶、HP1流血死亡及正常H0空步骤均保留。

`evidence/review-results.json`包含全部输入、预期、实际、异常与分组。`evidence/review-probes.py`生成并运行原34项；`evidence/review-cases.json`提供不依赖生成器的固定输入；`evidence/run-review-cases.py`可对旧/修后check.py执行同一语义比较。

主线runner实际exit1并明确报告3个异常；这是复现runner的返回约定，不冒称原check.py CLI在出现异常时也返回1（原CLI约定2）。

## 5. 可以保留的设计工作

实际复用矩阵、G2到达已设置encountered这一接缝、三敌profile窄适配、旧CombatEncounterSnapshot仅瞬时投影、v4独立于v3以及E02-P/R/S停审顺序均不因这两组模型问题被推翻。

同点排序、一次退出E、真实药耗、旧历史及无初粮等既有批准内容不重新选择。本轮没有提出新数值或新玩法；“Owner无需新增玩法采纳”仍可保持。但这不等于主线已批准整个技术合同或可以跳过正式归档。

## 6. 作者证据、主线证据和未执行项

作者报告：有限106项=36支持边界+67预期拒绝+3未支持，冻结双跑一致；原生23项；四类负控exit1；架构52DEC/289core；57链接/锚点与1102范围外对象检查通过。它们是作者证据。本轮没有完整复跑106项、23项原生探针、四负控、57链接或1102对象套件。

主线实际执行：34项有限专项（17符合/17不符）；五件原件blob/大小独立核验；完整源脚本/spec blob独立核验；读取远端分支与提交/root tree。没有运行生产npm全量、typecheck、build、真实新世界CTB、浏览器、真实Storage、多标签或Owner试玩。没有查询此设计提交CI，未声称其通过/失败。

主线容器直连raw GitHub时DNS不可用，因此没有取得完整可原生运行的仓库；通过GitHub连接器取得并按Git blob校验完整Python源与spec。这不影响上述有限专项的实际执行，也不能扩大为原生生产验证。

## 7. 下一步与授权

下发WORLD-ENTRY-005-R1，仅设计合同与隔离验证限定修订。保留原五件输入、历史报告和既有源码树。允许该设计分支普通commit/push；不合并、不推main/其他分支、不强推。

R1一次完成完整仓库基线复现、F01/F02及相邻输入自查、原106语义回归、23原生观察、负控、冻结双跑和提交。完成后准确SHA专项实审，暂不进入正式技术归档或E02-P/R/S。
