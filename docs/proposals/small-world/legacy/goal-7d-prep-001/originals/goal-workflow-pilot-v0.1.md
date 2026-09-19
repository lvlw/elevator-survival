# Goal 协作试行稿 v0.1

> **Draft / Proposal — 待 Owner 评审。**
>
> 本文件不构成实现授权，不是 DEC，不修改 Git、审批或发布权限，也不覆盖 `AGENTS.md`、正式规则、Architecture 或 UI 契约。它只建议下一阶段如何用较大的可验收 Goal 减少逐文件交接。

## 1. 试行目标

用一个明确的玩家能力或生命周期边界作为工作单位，而不是把同一能力拆成连续的小文件任务。保持 Owner 决策权、Codex 无权自行改规则／commit／push、报告不替代 exact-source review。

## 2. 建议工作流

```text
Owner / Decision Partner
→ 设计方案与反例审查
→ 规则确认（必要时进入正式 DEC / Content / UIR）
→ Execution Goal
→ Codex 需求反讲
→ 实现与自测
→ Development Report 审查
→ Owner 授权提交
→ exact-SHA 源码核验
→ 阶段集成与 Owner 试玩
```

### 2.1 Owner / Decision Partner

- 集中处理会改变玩家策略、状态生命周期、随机或终局的 Decision Queue。
- 明确哪些内容已确认、哪些仍是 Proposal、哪些不在本 Goal。
- 不用实现任务替代规则确认。

### 2.2 Execution Goal

- 以“玩家获得什么能力”命名。
- 包含一条端到端验收路径、严格恢复／保存边界、反例与范围排除。
- 可以跨多个文件和相邻模块，但不能混入另一个生命周期或未经确认的玩法。
- 默认 NO COMMIT / NO PUSH，除非 Owner 后续给出独立明确授权。

### 2.3 Codex 需求反讲

开工前用简短清单确认：

1. 玩家能力和完成定义；
2. 正式规则来源；
3. 输入、输出和唯一状态 owner；
4. 会触及的生命周期／事务／随机；
5. 明确不做项；
6. 发现冲突时的停止点。

反讲不是重新设计。发现未决规则时进入 Decision Queue，不用假实现填空。

### 2.4 实现、自测与报告

- 先读实际 HEAD、工作区、正式文档和源码，不依赖旧对话推断。
- core 保持纯 TypeScript；React 只消费 player-safe 状态并发送正式命令。
- 以定向回归证明反例，以全量验证证明未破坏既有闭环。
- 报告列出实际修改、测试、规则冲突、未完成项和 scope check。
- “报告 PASS”只代表材料可供审查，不等于真实源码已经核验。

### 2.5 提交、exact-SHA 与集成

- 只有 Owner 明确授权后才 stage／commit／push；不 amend、不 force push，除非另有明确授权。
- 提交后记录完整 SHA、文件数、增删行、push 与干净状态。
- exact-source review 从该 SHA 重新读源码；必要 corrective 独立提交。
- 约三个工程任务或进入新生命周期阶段时，以较早者触发一次阶段提交与源码审查。
- 阶段工程验证不替代 Owner 试玩；内部自查不冒充独立核验。

## 3. Decision Queue 规则

重要问题集中为少量主题，每项记录：

- 问题；
- 已有规则；
- 选项与推荐；
- 玩家策略影响；
- 生命周期／工程影响；
- 不决定会阻塞什么。

以下情况必须进入 Queue，不能由 Codex默认决定：

- 新胜利／失败条件或结算优先级；
- 新跨日、跨 Run 或 Profile 状态；
- 新随机概率、资源供给保障、任务重生或永久损失；
- 专长、工具或内容成为资格锁；
- Save schema、rulesVersion、生命周期身份或恢复语义改变；
- 正式 UI interaction rule 或玩家知识边界改变。

普通实现细节若不改变这些语义，可以在 Goal 内由 Codex按现有架构作最小选择并在报告中说明。

## 4. Implementation Contract 模板

```markdown
# <Goal ID / 标题>

状态：Approved for implementation / Proposal
起始 exact SHA：<sha>

## 玩家目标
玩家完成后获得什么可操作能力？可观察完成条件是什么？

## 正式依据
- DEC / Freeze / Content / UIR：
- 已确认参数：
- 明确待定：

## 输入与输出
- 正式输入：
- 正式输出：
- 调用方不能提供的结果字段：

## 状态与生命周期
- 唯一 owner：
- 创建／更新／清理时点：
- strict restore：
- 是否进入 Save / Profile：

## 事务
- 一个 command 的原子边界：
- 保存次数与失败语义：
- terminal 或跨 phase 行为：

## 随机与确定性
- seed / stream owner：
- Preview 是否物化随机：
- 重载／重试保证：

## 验收
- Golden path：
- 关键反例：
- corruption / stale / save failure：
- 全量验证：

## 排除项
- 本 Goal 明确不做：
- 发现何种冲突必须停止：
```

模板只记录当前 Goal 必要契约，不复制整份 GDD、DEC 参数或建立平行规则文档。

## 5. 七日阶段的建议试行

第一项编码 Goal 应只在 Owner 确认“多场景重访／跨日进度”和“选择／身份绑定”后启动。建议依次验证：

1. 多场景选择、identity 与 location progress 基础；
2. 专长生命周期与最小 Modifier 接入；
3. 单个新场景完整闭环；

到第 3 项或更早进入新的 Save／terminal 生命周期时，执行阶段 exact-SHA 审查。随后再决定第二个新场景与 Final Day Resolver 的实现节奏。

每个 Goal 都必须能独立回答：当前玩家多了什么能力、保存恢复是否严格、旧医院闭环是否保持、未确认内容是否仍未被实现。

## 6. 权限与工具边界

本试行继续保留：

- Codex 不自行修改玩法、创建 DEC／UIR 或批准 Proposal；
- Codex 不自行 commit、push、merge 或更改保护规则；
- 不自动创建 branch／worktree，不启用自动提交；
- 多 Agent 或独立审阅只在明确可用且被授权时使用，并如实标记结果；
- 不建立完整 Skill Library、World SDK、命令平台或自动化审批系统。

Branch／Worktree、多 Agent 分权和自动化可以在出现明确协作瓶颈后另行评审，本稿不实施。

## 7. 试行成功标准

- Owner 的重大问题集中为 3–5 个决策主题，而不是散落在实现细节中。
- Execution Goal 足够大，可以独立形成玩家能力和端到端回归；又足够窄，不跨越未确认生命周期。
- Codex 开工前能准确反讲规则与停止点。
- Development Report、Owner 授权提交和 exact-SHA review 三者不混为一体。
- 每约三个工程任务或新生命周期阶段形成一个清晰审查点。
- 没有因为减少交接次数而放宽规则、Git 或体验验收权限。

## 8. 本稿停止点

本文件只建议流程。它没有创建任务、分支、Goal 状态、自动化或权限变更，也没有授权开始七日实现。Owner 评审后，需以独立、明确的 Execution Goal 启动任何代码工作。
