# WORLD-ENTRY-006 正式落文与首玩分批门槛 v1.0

状态：Owner已批准D1／D2与顺序；以下为主线技术职责，非连续开工许可。来源锁定20b833aeec4693e56afee075c9878425d3c58605与本轮Owner批准。

## 1. 批次及停止点

| 顺序 | 完整交付责任 | 进入条件与停止点 |
| --- | --- | --- |
| DOC-WORLD-ENTRY-006（本批） | 原件、DEC-053、D1查询局部覆盖、三工程合同、入口同步及T01工具小修 | 仅docs及指定TEST runner；完成后准确SHA文档／工具实审 |
| 基础准备 | 当前病程、必要公开metadata、适用安全保护、显式ready／稳定snapshot、草稿和错误／Feed边界 | 文档实审通过后主线下发精确SHA／路径；完成后源码实审 |
| 浏览器owner | 独立初始化材料、prepared expected/text交接、唯一checkpoint、保存故障／独占与五停点恢复 | 基础实审后下发；真实浏览器IO／多页证据，保存接缝单独准确SHA实审 |
| 低资产UI | 明确DEV入口、五停点、完整玩家选择、三敌／任务／四终局、浏览器恢复和首玩材料 | 基础与浏览器实审后下发；UI源码／浏览器实审与Owner体验分开 |

每项实际任务都一次完成详细设计、实现、正反例、组合、修订和检查；约三个工程任务或新生命周期／保存接缝以较早者停审。这里三批本来就有独立门槛，不能用“长任务”绕过。精确起始SHA、分支、修改路径、普通commit/push权限只在各批开工时确定，不预填未来SHA。

## 2. 文档权威与覆盖

[DEC-053](../../../05-design-decisions.md#dec-053)记录Owner范围，后续已确认DEC优先。技术依据为[病程局部补充](public-condition-contract-v1.0.md)、[字段v1.1](../player-query/player-query-field-contract-v1.1.json)、[基础](foundation-contract-v1.0.md)、[浏览器](browser-owner-contract-v1.0.md)、[UI](low-asset-ui-contract-v1.0.md)。同范围替代entry-006候选，不擦除候选正文、原DRAFT、曾经失败或历史已审结论。

player-query v1.0两个Markdown合同追加局部替代索引；v1.0字段JSON及原implementation报告／测试保持。v1.1只有body.infectionWarning公开边界变化，原24键与其他23条不改。当前生产仍有unknown，只有后续实现与实审才能改变实际支持计数。

## 3. 严禁提前关闭的Gate

D1批准不等于新公开映射已实现；控制器设计不等于React刷新验收；TEST cold expected不等于浏览器自举；domain不等于跨标签锁；单checkpoint不等于设备断电落盘保证；自动测试不等于Owner分段体验。每次报告区分作者证据、主线独立执行、CI和历史记录，NOT RUN不包装成PASS。

首次reservation已写而首checkpoint失败后崩溃，重开blocked；失败保存后的新内存不承诺恢复。处理工具、显式清理、回档、再建、O3、公开发布与永久双入口不随D2批准。不自动修改Project Sources或用聊天替代仓库正式条款。

## 4. T01仅工具修正

上轮主线发现外部probe runner将仓库内`..probe`误当父路径的低优先级缺陷。本批明确允许只在entry-006/validation指定runner／路径helper／定向测试修正：按路径分量和真实祖先落点，创建／写文件前拒绝仓库自身或其内部路径，处理符号链接／junction别名。保存原12项修前证据及新正反例，不改native模板或历史10项结果。

T01不是游戏、存档、性能或浏览器漏洞。路径检查不承诺对恶意并发替换链接提供操作系统级沙箱；权限／真实路径解析失败应保守拒绝，不将失败当外部路径。定向工具检查不计新增生产测试。
