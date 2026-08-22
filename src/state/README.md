# State

应用状态适配、持久化边界及 UI 与纯规则核心之间的协调。本阶段不创建正式 Store。

## 当前最小 Run 持久化边界

`run-save/` 只持久化已经由核心规则完整提交的稳定 Run 阶段：当前日中枢、Run Scene Session 或 Run 失败。三者使用互斥的 tagged union，并作为一个完整、版本化的值写入唯一 Run 存档槽。

读取顺序为严格 JSON 与 envelope 校验、存档格式版本校验、规则版本注册表分派，再调用对应 core 正式恢复入口。损坏、伪造、未知版本或不满足正式快照不变量的存档会失败，不会修复、升级或回退为新游戏。

本边界不拥有游戏规则，不保存事务中间态、Effect 计划、预览或派生缓存。`command-execution/` 只接受严格恢复后的非终止阶段，在生命周期专用 handler 完成正式规则结算后重新规范化输出、验证 Run 身份连续性，并通过唯一 Run Save 写入一次。规则拒绝、Effect 不匹配、终止输入和跨 Run 输出均不写入；存储失败不会回滚已提交的内存结果。

Success 仍是 DEC-028 定义的未来正式终局概念；当前规则版本没有 Success Resolver 或主线成功条件，因此不能构造、保存或恢复 `run-success`。

当前未实现完整 Application command routing、Profile 持久化、完整 RunState、Zustand／UI 编排、Success Resolver、Run Abandon、New Run、多个存档槽、存档历史及迁移。
