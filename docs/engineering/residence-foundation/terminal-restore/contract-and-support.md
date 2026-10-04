# B：终局严格恢复接口与实际支持

作者实现说明；规则仍来自 [终局恢复合同](../terminal-restore-contract-v1.0.md)和[本批任务书](inputs/ENG-RESIDENCE-TERMINAL-RESTORE-001-task-v1.0.md)。A 在 `bfc6bd973eeb306df1e8ee916b2160c30b757cdf` 的[专项实审](inputs/AUD-bfc6bd9-ENG-RESIDENCE-TERMINAL-001-review-v1.0.md)仅为 A 限定 PASS。B 本地检查不是主线准确 SHA 恢复接缝实审，也不是 C、玩家或体验验收。

## 入口和唯一值

`src/state/residence-save/terminal-index.ts` 精确导出八个运行时值：

- `TERMINAL_RESIDENCE_FORMAT`、`TERMINAL_RESIDENCE_FORMAT_VERSION`、`TerminalResidenceSaveError`；
- `validateTerminalResidenceAggregate`、`createTerminalResidenceEnvelope`；
- `serializeTerminalResidenceSave`、`deserializeTerminalResidenceSave`；
- `restoreTerminalResidenceCandidate`。

`terminal-controlled.ts` 只导出 `createTerminalResidenceSavePolicy`。旧 v1 的七个导出、解析器、类型、旧测试及 G4 消费者完全不变；新旧字符串接口双向拒绝对方版本，无迁移或兜底首次创建。

可信 composition 提供 G1 已签发 configuration、A 已签发 terminalConfiguration、rulesVersion、完整 declarations 及对应 TerminalPolicy/catalog。策略构造先检查普通外壳／数组描述符，再复制冻结声明与角色数据、复用受控配置和目录句柄；不执行 getter，不冻结调用方数据，不持有 current 或签发动作权限。形似未签发的策略、配置和目录不被接受。

唯一外层为 `{ format: 'elevator-survival.residence-headless', formatVersion: 2, state }`。A 终局配置身份与 G1 角色配置身份分别严格保留。B 只定义技术格式常量；G1 34 项和 A 四项批准数值均从原受控依赖取得。

## 四态与验证职责

| state.phase | 实际支持 |
| --- | --- |
| fresh-hub | 真实 D1/first-ready、revision 0、完整未接声明、配置初始余额、site null、明确空历史和合法初始实物；独立 catalogRef。先严格读取 v2，再复用旧纯 fresh 子结构校验，不读取或转换 v1 文件 |
| active-world | A TerminalSnapshot；唯一生还执行、完整根／子绑定、现场和携带、真实旧历史及全奖容量。活人 pending 战斗拒绝，不能清 pending 洗白 |
| living-hub | A 完整正常成功、主动失败或期限生还结果；无 active/site，最新关闭／收据／归档、钱包、实物与 due/ready 现值相符 |
| dead | A 完整动作、休整或期限死亡结果；HP0、真实死亡步骤、关闭和处分。实际 active clock 可以保留，已关闭 archive 的 combat-required 可以保留，不恢复可继续战斗 |

读取顺序：纯数据边界 → 外部策略身份 → 声明全集冷校验后规范排序 → 原 A 完整联合读取 → B 来源／历史补充。B 补充不重跑结算：

- 起始执行从周期 1 开始，后续执行必须衔接前次结束周期 +1；期限 ready 后直接出发不再额外跨一天。
- 实际期限 end-cycle 精力事实与注入 G1 目标一致；最新流血／新增暴露／死亡前未重置抑制事实与当前身体相容，不将旧收据身体等同于后来角色。
- 当前／归档所有来源与真实携带、仓库、地面和处分联合核对；已兑现输出必须相容于一个完整目录候选，未兑现不能已有派生物；来源、执行、序号、定义、数量、先后归属不被归档洗白。
- 真实剩余耐久和电量按目录资源边界保留，不回填来源初值；明确已安装／消耗／交付／死亡处分不要求物品重现于地面。关闭任务物不泄漏到可用库存或后来执行。

来源 ID 核对复用 G2 `sourceItemId`。其内部的 `createRandomCursor` 是确定性纯值构造，不是随机 draw；不会签发新的游戏身份、重建物品或改变已保存 cursor。冷恢复不调用动作计划、周期计划、activate/terminate、A 清算或内容工厂。

## 冷值与独立 expected

`validateTerminalResidenceAggregate(unknown, policy)` 和 `deserializeTerminalResidenceSave(string, policy)` 返回深只读完整值，没有安装资格。冷态只保证内部自洽，不承诺识别同时篡改全部关联事实的离线伪造或回滚。

`restoreTerminalResidenceCandidate(candidate, expected, policy)` 必须提供另有权威的独立完整同进度 expected。两边分别严格读取，再逐项用原 `restoreMissionCandidate` 对照 **expected 的**具体委托状态／执行／结果，最后比较完整聚合。身份、revision、身体、clock、钱包、现场、物品及历史不能降格、合并或换成更新状态。缺 expected 不降级冷读。

返回 `{ kind: 'terminal-residence-candidate', value }` 只是值；没有 nonce、安装闭包、owner 或防回滚索引。反序列化不能恢复 A/G2 计划签发能力。C 未来仍必须自行保证 current 安装、重复 bootstrap 拒绝等边界。

## 错误与副作用

稳定错误为 `INVALID_JSON`、`INVALID_ENVELOPE`、`UNKNOWN_FORMAT`、`UNKNOWN_VERSION`、`INVALID_POLICY`、`BINDING_MISMATCH`、`INVALID_STATE`、`UNSUPPORTED_STAGE`、`EXPECTED_MISMATCH`。原型、访问器、非枚举、符号、循环、稀疏数组和非法标量在 JSON 编码前被拒绝，不用 JSON round-trip 清洗输入。成功读取复制并深冻结结果，不修改或冻结调用方可变输入。

六种真实夹具在构造后独立清零 24 个 spy，codec／warm 校验阶段均为 0：G1 周期／精力计划、使命建立／激活／关闭、G2 目录／现场工厂与四类计划、A 终局／死亡消费／权限／签发、四个随机 draw、会话工厂、Storage get/set/remove/clear。没有 B commit/notify API；其缺席由精确导出与生产依赖扫描共同验证，未伪造一个会话来报告零通知。

## B01—B12 证据定位

测试目录统一为 `src/state/residence-save/`；辅助工厂只由测试引用。

| 验收 | API 与测试 |
| --- | --- |
| B01 | envelope/serialize/deserialize；terminal-save.test.ts 的 B01 true first creation，真实 G1→mission→G2 出发 |
| B02 | 字符串往返；terminal-save.test.ts 的 B02，Day1/Day7 成功／失败真实空步骤、期限生还、move/reveal/rest 及期限三种死亡 |
| B03 | 字符串往返；terminal-history.test.ts 的 B03，旧成功／失败→第二声明 active/dead，期限 ready→D8 出发，旧历史原值保留 |
| B04 | aggregate/policy；terminal-aggregate.test.ts 的 B04 和 policy 边界，未知／漏／重声明及绑定错误 |
| B05 | aggregate/A 复用；terminal-aggregate.test.ts 的 B05，terminal-history.test.ts 的周期／当前身体联合反例 |
| B06 | aggregate/codec；terminal-save.test.ts 的 P0/19/20/47 和容量，terminal-history.test.ts 的 B06 钱包／收据／处分 |
| B07 | aggregate/source history；terminal-history.test.ts 的 B07，真实低资源、堆量、所有权、来源组合、归档与处分 |
| B08 | restoreTerminalResidenceCandidate；terminal-expected.test.ts，原 restore spy、独立 expected、冷自洽与 warm 拒绝区别 |
| B09 | 双 codec 和精确导出；terminal-compatibility.test.ts，terminal-save.test.ts 的 envelope 版本错误 |
| B10 | serialize 前严格读取；terminal-save.test.ts 的 B10，terminal-aggregate.test.ts 的策略访问器／未签发句柄 |
| B11 | 全部纯接口；terminal-purity.test.ts，原生构造与 codec 24 项独立计数、输入不变／冻结、计划能力不复活 |
| B12 | 原文件不变及原生回归；见[验证记录](verification-results.json)与[完成报告](completion.md) |

测试标题以实际源码为准，表内描述为定位摘要，不代替原生断言。有限夹具覆盖不是无限历史性能承诺。

## 明确未执行

C、current 安装／替换、存储适配器、真实写盘失败／单 owner 重入、玩家入口、浏览器／多标签、真实五图生产者、战斗医疗、商城、专长／工具箱、O3 发布和 Owner 试玩均为 NOT RUN／未决定。本项不变更正式规则，不关闭后续 Gate。
