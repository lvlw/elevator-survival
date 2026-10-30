# B工作包：原生源证据，不实施新的演出生命周期

B的已有候选位于：
docs/design-drafts/ui-v1-001/readiness-001/contracts/B-committed-motion.md

本批可以读取真实源码、调用现有P/S/facade/controller、用测试spy记录准确结果并形成候选。
本批不能改这些宿主来获得希望看到的结果。

当前已核对：
- PlayerExecution只有kind/view/preview。
- PreplayResult有kind/snapshot/confirmation?/execution?。
- PreplaySnapshot.feed为ordinal/kind/text；不是可靠结构化战斗事件。
- core CombatValue的entry/decision/battles/combatDeaths包含内部见证，但不能直接对UI公开。
- A的新增公开组与原enemyStage不提供精确敌HP、未来意图、原始CTB或历史战斗序列。

B交付请附表：
“期望演出”→“当前真实证据入口”→“可信字段”→“已允许公开的最小事实”→“是否缺接缝”→“不得泄漏的信息”。
至少明确区分：
1. 命令被拒绝，零commit。
2. 原命令commit成功，但保存失败。
3. retrySave没有新命令/结果。
4. 冷恢复只得到已结最新状态。
5. 终局关闭与战斗胜败的实际时序。
6. 多次敌响应、当前决策停点与未知未来之间的界线。

不要把测试采集器或分析投影当作运行时owner/event bus。
不要为了输出漂亮的动作序列，遍历并发布全部原始trace。
如果只能安全得到很粗的已结结果，报告这个事实和最小后续改动，不编造细节。
同样，不用“核心有trace”一句话推断整套演出都已具备安全公开依据。

正式B任务未来须独立明确允许修改的提交接缝、字段、生命周期、去重/取消/恢复和非干涉测试，并保留准确SHA停审。
