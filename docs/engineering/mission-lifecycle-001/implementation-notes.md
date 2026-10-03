# ENG-MISSION-LIFECYCLE-001 实现记录

2026-10-03。依据 [DEC-049](../../05-design-decisions.md#dec-049) 与 [唯一已批准合同 B1—B10](../../design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md)。本记录是实现映射，不是新规则或平行合同。起点 `6b48b3de6521d9a9c296754a4d8135c7f7c7ca35`。

## 实现前的需求复述与选择

目标为同一角色具体委托的唯一未接／活动／关闭事实，提供只读首次／继续资格、空列表和窄纯转移。资格不是完整出发许可。不实现玩家入口、死亡判定、成果、奖罚、现场、周期、存储或新内容。

输入分离：受控只读 scope 持有角色及真实声明；生命周期值保存绑定和互斥状态；执行复用 RunIdentity 三字段。恢复另接独立 expectation，包含绑定、状态以及该状态必须具有的执行／结果，不能从候选自身推导期望。声明目录只做资格依赖，不供给任务、不注册生产规则版本。

| 前态 | 动作 | 结果／预期 |
| --- | --- | --- |
| 首次事实不存在 | 受控首次建立（由未来唯一 owner 确认首次） | 明确未接值；普通查询缺事实则拒绝 |
| 未接 | 首次激活 | 绑定一次执行的活动值 |
| 活动 | 同一完整执行继续 | 只读成立，不重建任何资源 |
| 活动 | 受控成功／主动失败／期限失败／死亡结果 | 完整关闭值，执行绑定不变 |
| 活动或关闭 | 再次激活 | 拒绝 |
| 未接或关闭 | 终止 | 拒绝，旧事实不变 |
| 任意合法值 | 严格恢复候选 | 同一语义的独立候选包装，不安装 |

公开 index 仅查询、候选恢复、错误与类型；controlled 单独出口持有 scope 建立、首次事实、激活与终止。没有通用命令 dispatcher、reset、reopen、replace 或成功布尔入口。候选用不同包装，不能直接被查询／转移当作当前值；显式取出其只读 value 也不证明可信历史，真正安装仍在后续 owner。测试 harness 只模拟这一受控安装，不能作为生产出口。

严格 schema 拒绝未知／缺失／错类型、根与嵌套额外字段、不规范身份、未知格式与声明版本及交叉绑定。先验证再复用 createRunIdentity；不 trim、不补值、不丢字段。身份采用非空、无首尾空白／控制字符的字符串，不定义游戏 ID 编码。deepFreeze 仅处理新拷贝，调用方对象不被冻结或修改。

实现前预期：K01—K07覆盖合法转移及明确拒绝码；K08—K16逐身份轴、版本、状态、嵌套字段拒绝；K17检查冻结输入及完整输出；K18通过实际出口跑完整闭环；K19在已关闭的 harness 当前事实旁构造并恢复未接候选，确认它不改变后续正式操作。K20审阅出口／依赖；K21重新跑全量 check；K22保持真实安装／聚合等后置。

## 后续接线责任

- 唯一应用 owner 保存当前已提交事实，验证首次建立与恢复安装权；缺值或恢复失败不得初始化代替。
- 该 owner 与协调边界验证跨全部委托的活动唯一性、身份复用及最新稳定版本。单值与冻结不能证明从未丢弃历史。
- 真实终局规则产生成功、失败、期限或死亡结果；核心接收结果，不判断条件。
- 完整事务合并关闭、身体、奖罚与物品后一次提交、一次保存尝试；失败保存保留已提交内存，不重跑玩法。不得先关任务再让订阅补结算。
- 浏览器保存／可信恢复、兼容迁移、真实入口及人工体验均 NOT RUN／未接线。旧医院 executor、New Run、phase 与随机不变。

## 实际结构与出口

| 文件 | 实际职责与出口 |
| --- | --- |
| [types.ts](../../../src/core/mission-lifecycle/types.ts) | 声明、绑定、三态联合、完整执行、四种结果、候选包装与带 code 的错误；没有身体／钱包／现场 |
| [validation.ts](../../../src/core/mission-lifecycle/validation.ts) | 模块内部严格 schema 和绑定比较；不在公开 index 导出。拒绝原型对象、访问器、符号、隐藏字段和循环后再解析，不调用输入 getter |
| [queries.ts](../../../src/core/mission-lifecycle/queries.ts)／[index.ts](../../../src/core/mission-lifecycle/index.ts) | 首次资格、同执行继续、声明范围完整事实集的可接列表、候选恢复；无 mutation 出口 |
| [controlled.ts](../../../src/core/mission-lifecycle/controlled.ts) | createMissionScope、establishMissionFact、activateMission、terminateMission。受控 composition／规则协调调用，未接任何现有 application 或 UI |
| [mission-lifecycle.test.ts](../../../src/core/mission-lifecycle/mission-lifecycle.test.ts) | 固定测试声明、四结果组合、严格负例、局部 owner harness；不从生产出口导出，不注册玩家内容 |

scope 是受控注入的只读依赖快照，建立时核查已有规则版本 lookup、克隆与冻结声明。通用 core 没有医院名称／内容 ID 或新生产 rulesVersion；测试版本只在测试中声明。查询时继续校验 scope 结构与声明唯一性。受控调用者负有提供真实 scope 的责任；恶意重造 scope 并非已解决的认证问题。

生命周期只保存一份状态；结果只在 closed 状态出现，execution 只在 active／closed 出现。formatVersion=1 仅是本窄值标识，不是 Run Save 格式。绑定包括 characterId 与 worldId／templateId／commissionId／rulesVersion／contractVersion。相同 commissionId 的重复／冲突声明拒绝；列表要求每份声明恰好一份事实，缺失不是空列表；空声明范围可以合法返回空。

恢复期望比仅角色／委托更窄：还显式绑定预期三态、活动／关闭执行及关闭结果。可信调用方不能把候选传来的这些字段原样当作独立期望。恢复输出 `{kind: 'mission-lifecycle-candidate', value}`，直接交给当前值入口会被严格拒绝；取出 value 仍没有存储／安装操作。K18 harness 只从自己持有的当前事实产生独立期望（恢复方法不接受外传期望），演示同进度恢复；K19同时验证已关闭期望拒绝降格候选，以及旁边成功解析的未接候选不影响已关闭事实上的真实激活／终止调用。

这不是防恶意调用保证：任意调用者若主动丢弃历史，或者把候选自证期望、显式换掉当前值，单个纯核心无法发现。controlled 单独出口是编排责任隔离，不是身份认证平台。对旧活动前态重算合法终止得到相同值，不等于并发重提或旧档回滚已经解决。

复用 [deepFreeze](../../../src/core/config/deep-freeze.ts)、[RunIdentity 工厂](../../../src/core/domain/run-identity.ts)。严格解析先产生新拷贝再冻结；不冻结调用方提供的可变对象。返回值是完整不可变窄后态，零提交／保存／通知权。旧 [executor](../../../src/state/command-execution/stable-run-command-execution.ts) 的身份连续性与保存失败语义、[医院 New Run](../../../src/app/hospital-new-run-transaction.ts) 及 [Run Save codec](../../../src/state/run-save/run-save-codec.ts) 保持未改。

## 错误语义

所有已知规则拒绝抛出 MissionLifecycleError 并断言具体 code：INVALID_INPUT 为严格结构／非规范字符串错误；MISSING_FACT 区别于合法空列表；UNKNOWN_FORMAT、UNKNOWN_RULES_VERSION 为不支持版本；DUPLICATE_DECLARATION／DUPLICATE_FACT 拒绝冲突全集；UNDECLARED_MISSION、BINDING_MISMATCH、EXECUTION_MISMATCH 分别定位未声明、角色／委托与执行绑定；RESTORE_STATE_MISMATCH 拒绝独立期望下的状态／结果变更；ALREADY_ACTIVE、MISSION_CLOSED、NOT_ACTIVE 拒绝非法转移。不吞错回退未接。

<a id="k-matrix"></a>

## K01—K22 实际映射

下表测试均在 [本模块测试文件](../../../src/core/mission-lifecycle/mission-lifecycle.test.ts)，K标签是测试名可检索前缀；参数化展开是独立断言用例，不等于22行各只有一个测试。完整真实运行记录见 [verification-results.json](verification-results.json)。

| K | 实际证据入口 | 可证范围／后置部分 |
| --- | --- | --- |
| K01 | repeats first queries and deterministic activation | 首次重复查询，输入不变 |
| K02 | 同上；activateMission | 首次生成完整活动值；无环境熵见K20 |
| K03 | rejects active activation | 同／异执行编号均拒绝 |
| K04 | continues only the same full execution；rejects wrong execution | 完整三字段继续，不重建资源 |
| K05 | closes … once（四结果参数化） | 成功／主动失败／期限失败受控结果关闭 |
| K06 | closes … once；closing another mission with death | 局部死亡结果关闭、历史不改；角色聚合 NOT RUN |
| K07 | refuses termination before activation；closes … once；rejects wrong execution | 重复／矛盾／未接／跨执行拒绝 |
| K08 | closed facts remain closed；rejects extra command field | 换runId／seed不重接；标题／显示名等严格拒绝 |
| K09 | rejects changed …；activation and termination reject request binding axis；declared but different commission | 六身份／版本轴与同scope交叉委托均拒绝 |
| K10 | rejects extra command field | 部分交付、设施、保管／任意后态无入口，不搭对应生产系统 |
| K11 | returns empty for the closed sole mission | 合法空结果没有死亡判断或新任务 |
| K12 | distinguishes a real test-only declaration；closing another mission with death | 同世界异委托分别判断，未注册玩家内容 |
| K13 | rejects missing facts, undeclared commissions and duplicate or incomplete lists | 缺失、未声明和集合冲突明确拒绝 |
| K14 | preserves … semantics（三态） | 恢复保持语义与完整绑定，不激活 |
| K15 | missing field；nested unknown field；wrong type；noncanonical identities；unregistered declarations；accessors | 根／嵌套缺多错、不修复、合法版本及数据边界 |
| K16 | altered restored execution；impossible state；coherent state or outcome downgrade | 内部互斥与独立期望同时核验 |
| K17 | frozen input；copies mutable inputs；activation immutable assertions | 冻结输入可用，返回深冻结，调用方对象不变 |
| K18 | complete public and controlled export chain（四结果） | 初始化→查询→激活→恢复活动→继续→终止→恢复终止→拒绝再接 |
| K19 | candidate parsing and fresh construction cannot replace；read-only exports exclude | 实际接口与harness候选分离；可信安装／防回滚 NOT RUN |
| K20 | read-only exports exclude；人工逐文件导入／导出／副作用审查；架构检查 | 仅Zod、冻结、RunIdentity和本模块；无玩家入口、状态存储、熵、异步结算或内容注册 |
| K21 | 本轮 npm run check 及最终基线 diff | 旧医院真实全量回归与范围；远端CI另标NOT CHECKED |
| K22 | 本文后续接线责任；B5／B6 | 聚合唯一性、真实安装、合法结果产生、完整事务和保存均NOT RUN，不声称生产接线成立 |

## 交付检查阻塞（2026-10-03）

实现与全量npm检查已完成。原字节归档的前置审查第3—5行有Markdown行尾双空格，完整暂存／基线diff检查退出2；当前无法同时满足原件保全与检查通过。未改输入、Git空白配置或检查器，未commit／push；详见 [完成报告](completion.md)。
