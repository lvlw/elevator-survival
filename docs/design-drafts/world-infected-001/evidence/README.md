# WORLD-DESIGN-004有限证据入口

**Draft v1.4 / Engineering Review Candidate。** 仅Python标准库、共同perform、显式人工轨迹；不导入或改写生产resolver，不实现通用CTB、RNG、UI或保存引擎。

## 1. 当前命令与输入

从仓库根运行：python -B -X utf8 docs/design-drafts/world-infected-001/evidence/check_design.py。当前默认入口只写v1.4输出；旧main输出器已移除，不能混用当前参数重跑旧269或重复供给。

| 有效输入 | 责任 |
| --- | --- |
| [parameters.json](parameters.json) | 集中参数、单一真实委托CURRENT；失败20已确认，其他价格和专长仍Draft |
| [scenarios.json](scenarios.json) | 原52场景／5扰动定义原字节保留，当前选48＋5执行 |
| [check_design.py](check_design.py) | 共同动作、实体、病程、资格、终局与中枢 |
| [checks_v1_4.py](checks_v1_4.py) | 选择原输入并加入117当前边界；预期直接在各case声明 |
| [fixtures-v1.4.json](fixtures-v1.4.json) | 明确不同具体委托FOLLOWUP／AFTER，仅验证接续，不是第二份玩家内容 |
| [expected-v1.4.json](expected-v1.4.json) | 首次执行前的关键独立预期与限制 |

角色／世界／模板／具体委托／一次执行分开。默认只有transfer-001，终止后改执行ID不重接。active查询不刷新；未实现真正存档。None专长仅作为普通效果对照夹具，不是拟议玩家“空专长”选项。

## 2. 结果、首次失败与两次复跑

[results-v1.4.json](results-v1.4.json)共170：84正例、85预期拒绝匹配，1未支持被识别，0实际不符。53项原输入含pipe_capacity_10未支持；117当前边界中包含显式异委托fixture，不能作为产品入口。分类来自执行前预期，意外拒绝仍报不符。

[metadata-v1.4.json](metadata-v1.4.json)记录六输入SHA、两个输出字节SHA和独立canonical结果SHA；规范化为results数组的UTF-8排序紧凑JSON，allow_nan=False。运行环境另记，不混入游戏结果。

[witnesses-v1.4.jsonl](witnesses-v1.4.jsonl)按ID给摘要及逐动作记录：位置／日／精力／HP等和变化物品，四基准269／318／373／338E与电子补救均有原动作。不是全快照复制，也不是生产可恢复存档。

首轮真实156项146匹配、10比较器类型异常，退出1；[first-run-v1.4.json](first-run-v1.4.json)保留原输入指纹、实际失败与规范化哈希。[修复摘要](fixes-v1.4.md)说明如何修正并增加14边界；没有改预期掩盖失败。导出整理未改变玩法预期。

最终冻结后仅两个独立Python进程复跑，输入前后指纹、命令、exit code、稳定字节和规范化结果一致性见[复跑原记录](../reviews/reproduction-results-world-design-004.json)。两次170不计作340项。

## 3. 旧269的状态，不沿用旧成绩

[逐ID迁移](migration-v1.3-v1.4.json)：52原输入重验、1仍未支持、63被当前边界替换、34历史条件、119未重验。替换只认新用例实际断言，不承诺原例所有状态字段等价重跑；未重验也不自动宣称旧规则已废止。

旧[raw-results](raw-results.json)、[joint-results](joint-results.json)、[route-ledgers](route-ledgers.json)、[CSV](route-ledgers.csv)、[metadata](execution-metadata.json)、[首轮003失败](first-run-v1.3.json)及旧checks_v1_3／joint_checks原字节保留。旧规范化28a03ac…只属于003历史，当前参数不能复现旧假设。

准确追溯使用Git 25e420ed9f36f1bf2acfbb0d96e3a798fbdd6bf8的同批输入；历史源／输出指纹见[manifest](../reviews/input-world-design-004/manifest.json)。不复制大账、不改旧哈希，也未运行历史三图、十次同供给或新经济参数搜索。

十成功642、S-F-S78及20E／50E重复所得都只是独立供给假设。004实际检验单次成功准备余30、20E／50E失败所得和不重接；A不能证明长期经济已解决。

## 4. 可证边界与缺口

共同入口覆盖具体委托关闭、零／少／足余额失败、同奖和样本、普通实体、正常不补夜、末日先结后召回／死亡、下一周期、先拒绝后危险、最新身体、F1／F02、采购／治疗／维护及专长代表。

代表测试移除了预览中的隐藏感染和暴露，但完整玩家安全未来预测未支持。三专长九组合、CTB战斗医疗、H1工具箱电子的新E映射及完整工具箱路线、真实保存／严格恢复／事务／随机／浏览器／Owner体验均未验证。四路线只证明指定人工风险输入，管容量10未支持不是世界无解。

本轮生产测试、构建、浏览器、存档实验均NOT RUN，新增生产测试0。正式覆盖与生产独立实审仍须后续授权；具体门槛见[readiness/04](../readiness/04-evidence-and-playtest-gates.md)。
