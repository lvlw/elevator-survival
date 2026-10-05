# AUD-8c19ca0：ENG-RESIDENCE-CONTENT-SUPPLY-001（E01-P）源码实审 v1.0

状态：**PASS / 可进入 E01-R**  
受审准确 SHA：`8c19ca0d28058cf743b41c8547cc2629c8eac767`  
父 SHA：`ad56a7d9dfc08e38f966f20cf7e07c71c08c09dc`  
Tree：`7de411403ecdde135fe0f0e6fa1ae9d9b9ed7936`  
分支：`feature/residence-content-supply-core-001`

## 1. 结论

E01-P 在批准边界内完成真实任务/来源/稳定点药食与维护的纯核心实现，可进入下一独立生命周期 **E01-R：严格 v3 聚合与编解码**。本次未发现需要返修 E01-P 的阻断项。

本 PASS 仅覆盖 E01-P 的准确提交与纯核心责任，不等于 E01-R/S、活战斗、浏览器持久化或玩家体验通过。

## 2. 实际核对

- Git 关系：受审提交相对父 SHA 仅 1 个提交，70 个变更文件；7 修改、63 新增。
- 远端工程分支已指向准确 SHA。
- GitHub Actions：准确 SHA 对应 CI `#143` / run `37279314677`，状态 `completed/success`；architecture、typecheck、test、build 四阶段均 success。
- 作者记录的本地基线为 147 files / 3274 tests；最终为 161 files / 3365 tests，新增 91、替换 0、删除 0。主线未把 CI 与作者本地运行重复累计。
- 主线未在自身容器完整重跑 npm；本结论依据准确 SHA 源码阅读、提交范围、关键契约/测试核对与远端 CI。

## 3. 重点源码审阅

实际阅读或定点核对：
- `src/core/residence-supply/`：authority、validation、provenance、history、allocations、inventory、medical、maintenance、plans、initial、cycle-adapter、queries 及联合测试。
- `src/core/residence-task/`：catalog、validation、actions、sources、transfer、random、plans 及相邻测试。
- `src/core/residence-terminal/`：新 supply terminal 消费、共享钱包结算及旧 A 窄接缝。
- `src/core/residence-location/`：移动内部策略接缝、被动现场校验、调查边知识。
- `src/content/infected-world-v0.1/`：103 键配置绑定、24 节点/29 双向连接内容、初始组合。
- 旧 G1/B/C 没有被 E01-P 改写。

核对结果：
1. 来源守恒不是总数核对：按 origin range、split/merge transfer、disposition 逐单位回放，能拒绝跨来源替代、重复份额、缺失输出与已处分复用。
2. 任务件保持本执行真实原实例；普通合法历史资产不被强制重绑到当前执行。
3. H1/H2 随机使用受控、可注入且确定的 RNG；H2 无额外固定消毒剂。
4. 真实初配为管、外套、单工具、快捷绷带 1；无初粮/电子；专长/工具锁定。
5. 六类战外药食走真实实例消费；E0 合格自救为免费 G1 行动；维护/充电仍是付费 G1 行动。
6. 机械维护 15 为单次总池；材料实际消费，ItemState 不删后重建。
7. 新任务/维护死亡由原计划一次交 A 新窄消费者；旧 G2 死亡、正常 H0 `steps=[]` 与 Day7 G1 周期语义保持。
8. 公开普通入口仍只暴露 `SupplyError`、只读安全查询与类型；动作能力留在 controlled/internal seam。
9. 长链明确从危险已合法解决 TEST 前态进入任务生产者段，不冒称 CTB 或完整世界通关。

## 4. 非阻断观察，必须带入 E01-R

### R-GUARD-01：first-hub 的待执行身份必须来自独立 expected

E01-P 的 `first-hub` 纯值中，待首次出发使用的 execution 由受控 `establishSupplyInitial` 写入四个 initial origin binding；unaccepted mission 本身没有 execution。P 阶段没有冷恢复/current，因此该结构不构成本批阻断。

E01-R 不能从 v3 候选自身的 initial origins 反推出“expected execution”再自证。对 first-hub 冷候选，独立 expected 必须显式绑定待执行 identity（runId/seed/rulesVersion）或等价受控事实，并与四个 initial origin binding 联合核对。active/closed 状态同样继续按独立 mission/execution expectation 验证。

### R-GUARD-02：纯值校验不等于安装权限

`readSupplyValue`、成功解码或 roundtrip 均只形成严格候选；不得发放 `SupplyAuthority`、current 安装权或存储写权。E01-S 才拥有唯一 current 与保存故障责任。

## 5. 证据边界

- 没有运行真实浏览器 IO、多标签、Owner 试玩或 CTB。
- E01-P 没有 codec/current/storage，所以保存“恰好一次”不属于本批。
- CI #143 的成功证明准确提交在远端工作流通过，不替代本次语义审阅。
- 后续 E01-R 必须重新建立真实生产测试基线；不得沿用 3365 作为新任务的“已跑”结果。

**停止点：E01-P PASS；允许下发 E01-R，E01-S/E02/E03 仍未授权自动执行。**
