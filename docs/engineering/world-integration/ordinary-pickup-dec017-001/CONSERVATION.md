# 普通拾取来源守恒

本轮没有改来源格式、存档 schema、恢复校验器、物资配置或 ItemState 规则。

## 正式生产者

`planSharedInventory` 的新分支仅匹配当前节点真实物品的 ordinary && stackable。每次先用统一容量结果决定允许量，再按现有 partitionRanges 转移份额；结果经过原 context.read 和 context.issue，仍是一次正式提交。

完全并堆时保留目标实例，源实例耗尽才移除其 live allocation/ItemState，lineage 不删除。部分并堆时，源原实例及未转移区间留在原节点。另有新堆叠且地面仍剩余时，使用现有 deriveStableSplitInstanceId（supply-v1:revision）生成稳定子身份，记录 split lineage/unitTransfer、复制原资源状态并划分不重叠范围。新堆叠耗尽剩余源时沿用源真实身份。没有时间戳、UUID、随机身份或按名称复制物品。

并堆顺序使用现有背包位置的 y/x 稳定排序。DEC-017 没有对多个目标另立条文，因此“多个兼容目标按 row-major”记录为本次实现 Draft，不新增 DEC/UIR。背包之外的快捷位、装备位不参与补堆。

## 可复核结果

原生 Edge 两个独立 TEST profile 均从同一合法库存边界开始：6×4 的 24 格全占，背包口粮 1，当前节点另有真实口粮堆 2，背包重量 23。

| 情景 | 玩家请求 | 实际并入 | 地面原堆余量 | 格位 | 重量 | revision |
|---|---:|---:|---:|---|---|---|
| full-merge | 1 | 1 | 1 | 24→24 | 23→24 | 41→42 |
| partial | 2 | 1 | 1 | 24→24 | 23→24 | 41→42 |

两个结果相同是预期：请求 2 的一例被格位限制为 1，另一例仅请求 1。两张 after 原图字节相同，均由各自 profile 实际截图获得，没有复制/缩放/拼接来代替截图。

`evidence/conservation.json` 保存原始长实例 ID、来源区间前后值、新增的唯一 merge 回执、revision、checkpoint hash、浏览器版本与四张图 hash。独立展开 allocation 的 (originId, unitIndex) 后，前后 29 个 live units 集合完全相同且无重复；origins、所有 ItemState 和格位数组逐项相等。冷恢复后 checkpoint 和全部 state 逐项相等。

这份逐单位核查只覆盖这两次浏览器拾取；它没有取代正式严格恢复验证。其他来源消费、安装和医疗守恒由原测试与本轮默认 check 覆盖。

## 新边界回归

- 满格但可合并；请求 2 只能合并 1；再拾取无容量拒绝；剥除 transfer 的伪造恢复拒绝。
- 留空格后先并入 1，再放入 1，沿用剩余源真实身份；保存恢复后恰好一次。
- 真实生产资产达到重量 27，请求 2 仅可取 1；达到 28 后拒绝，原状态不变。
- 重量受限的新堆叠生成稳定子身份、保留地面原实例与分离份额；相同输入计划结果一致；去掉 split 回执拒绝恢复。
- 多个目标按 y/x 而非输入数组顺序合并，合法恢复且数量守恒。
- 门禁卡、样本、组件、模块先由正式 task-drop 留置，再验证 ordinary pickup 拒绝、task-pickup 缺位拒绝、原明确格位取回通过。
- 非堆叠急救包缺位或附加 quantity 拒绝；原完整实例及合法旋转放置通过。
- 当前九种生产 stackable 资源均为 none。因此“不兼容资源但有空格”的正例只能是纯容量 seam 的显式合成输入，不能宣称生产目录存在带电量的口粮。该 seam 不并堆、可产生独立放置候选；同一伪造资源输入被实际 producer/严格恢复拒绝。

真实浏览器边界由正式物资/任务生产者产出所有物资，再使用 TEST-only 的危险解除与位置安排汇集地面物品，并经原严格 codec 绑定。它是库存边界验收，不是从开局原生行走战斗到此的完整通关证据。浏览器本身使用原 React、原 BrowserOwner、原 Web Locks、原 storage、原正式命令与保存。

保存故障注入在 PlayerSession/真实 React 的隔离端口中执行：一次提交、一次尝试写，retry 仅保存、冷恢复不重取。原生 Edge 没有注入写盘故障，原生浏览器故障项为 NOT RUN。
