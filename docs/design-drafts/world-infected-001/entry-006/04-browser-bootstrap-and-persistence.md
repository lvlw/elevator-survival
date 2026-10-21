# 浏览器启动与唯一持久化 owner 候选

状态：AUTHOR_DRAFT / 尚未接线、未做浏览器验收；不更改三键 v4 或批准迁移。

## 实际接缝与威胁模型

既有 S 是同步 `read(): string|null`／`write(text): void`；已有 v4 严格 reader、expected 和 codec，不是浏览器启动器。`prepareCombatPersistence` 内部已经有 `{value,text,expected}`，但普通 facade／composition.write 不传出 expected。**真实缺口是受控 checkpoint handoff**：未来窄工程必须把这份已认证／已预编码结果的 expected 与 text 一起交给唯一应用 adapter；不可解析 text 后调用 committedExpectation 自证。旧 expected 校验和 v4 reader 不放松，raw expected 不进入玩家 DTO。

威胁模型：检测随机损坏、错版本／身份／初配／阶段、部分写入及受支持页面的重复 writer；保留保存失败后的最新内存。浏览器用户能改整套客户端数据、旧备份、代码或打开不合作旧页面；不承诺防作弊、离线防回档、跨设备恰好一次或全局可信根。没有云端 Profile／签名服务。hash 可检测字节不一致，不是防篡改授权。

## 主推荐：同步新槽＋独立初始化记录＋一笔 checkpoint

选择 localStorage 是适配现有同步 S 的技术建议，不是已通过浏览器实现。IndexedDB 可事务化但需要异步生命周期／port 改造，当前不优先；sessionStorage 不能承担跨会话继续；不建立双存储“主状态”。新命名空间示意 `elevator-survival:infected-playtest:v1:*` 为候选，不触及旧 `elevator-survival:active-run`。

| 材料 | 生成／固定时点 | 留存位置／权威 |
| --- | --- | --- |
| 角色 identity | 玩家确认首次创建后，应用环境熵边界生成；严格格式校验 | 初始化小记录；不是从存档角色字段抄回 |
| 世界／模板／具体委托／声明全集 | 已批准 content/composition 静态受控声明 | 打包内容、校验版本；不得每次生成新委托 |
| execution、seed | 同一确认一次生成，绑定声明及规则 | 初始化小记录；恢复不再生成 |
| 工具／专长 | Setup 明确选择，初配锁定 | 初始化小记录；恢复不得改选 |
| rules/config/content/profile/random 版本 | 版本绑定依赖提供，不读候选决定 | 应用支持 registry＋小记录交叉校验 |
| 完整 phase/revision/cycle/missions/battle/closure expected | 上次真实受控 prepared checkpoint 生成，而非 cold payload | checkpoint 外层 metadata；包含原 v4 完整 expected，不能删 battle/closure 所需锚 |
| 同进度 committed | 活会话内唯一 S 的完整 current | 内存；不另存第二身体／库存／钱包；冷启动没有外部完整历史真值 |

建议两条应用记录（都是技术候选，不是新 save schema）：

```text
reservation = { applicationFormat, version, slotId, generationRoot,
                initialIdentity, declarationRefs, versions, execution,
                choices, state: reserved }
checkpoint  = { applicationFormat, version, slotId, generationRoot,
                checkpointGeneration, expected, v4Text }
```

reservation 只存身份／初配材料与初始化占用，不存身体／余额／库存／任务成果；存在即不再视为新用户。checkpoint 的 expected 是验证锚，不是可编辑第二 current；v4Text 仍是唯一完整状态。战斗死亡 closure 需要真实 trace 锚，原 expected 结构必须完整保留，不能为了“小”省字段。不得向玩家显示这些身份或内部锚。

冷启动先在锁内读／严格校验 reservation 和外层 checkpoint metadata，对照受控声明、版本及初始材料，固定原结构 expected；随后 storage.read 才把 v4Text 交给原 S。不能访问 v4Text.state／origins／battle／closure 来修补 expected。两者同处客户端不提供外部真实性，独立性指来源与调用顺序，不是密码学可信。缺必要 metadata 时 blocked，不将完整内部 state 当作备用 expected。N09 仅证明现有 S 的 expected-before-read 顺序，不证明本候选落盘已实现。

一次读取外层字符串可以同时取得包含payload的字节；不能把这一物理I/O说成“尚未读取任何候选字节”。这里要求的是受控启动顺序：先仅使用独立生成的metadata固定expected，再让原S读取并解码领域candidate，绝不先解析payload取锚。持久化expected与payload都可被用户一起改写，因此仍不证明离线历史真实性；需要外部可信根将是另一个产品范围，当前不承诺。

## 首次创建及一次写入

1. 获取独占后检查新命名空间：两记录都不存在才可进入真正无档 Setup。记录孤立、坏 JSON、版本不支持、被标记已有历史却缺 checkpoint，一律 blocked，不回退首次创建。
2. 玩家确认后生成一次身份材料，先成功持久化 reservation；失败则不调用初配 provider。成功后一次 createFirst，由真实 P 发物并形成 current。
3. 受控 handoff 将 prepared.expected 与原 text 绑定；adapter 单次 setItem 写完整 checkpoint，不先改预期再单独覆盖 payload。随后 S 原生一次通知，controller 消费返回 ready。
4. checkpointGeneration 只标记技术 checkpoint，绑定当前提交，不充当 gameplay revision；同 current retry 使用同一含义，不额外推进 domain revision。adapter 可缓存本次只读预编码字节／expected 交接，不复制可变身体／库存。

reservation 先写成功而 first checkpoint 失败：本页保留最新 first-hub 内存并可 retrySave；若此时崩溃，再开见 reservation 无完整 checkpoint 必须 blocked，**不自动重发初配**。这是保守支持代价，不设计自动补发、删除恢复或隐式迁移。后续恢复／显式重置产品流程另审，不借旧医院 clear() 自动执行。

## 保存／故障矩阵

| 情况 | 本页 | 之后冷启动 |
| --- | --- | --- |
| 读取异常／权限受限 | read-error、禁止创建；显式重试 | 仍按原材料重读，不换身份 |
| malformed／版本或 generation 不一致 | blocked，保留字节 | 不修复、不删槽 |
| 初次 reservation 写失败 | 未发物，报告系统失败 | 真无档才重新明确确认 |
| 任意 S 写配额／权限失败 | 完整 current 已提交，显示未保存；retry只写最新 | 只能恢复最后成功 checkpoint；不声称未落盘动作已恢复 |
| 刷新／进程退出发生在失败保存后 | 提示风险不能保证拦截关闭 | 接受未保存进度丢失，不重放动作 |
| metadata／payload 更新中断 | 单 checkpoint 字符串减少应用级半写组合 | 外层严格匹配；不承诺设备断电落盘原子性 |
| 已有 current 后再次加载 | 禁止第二 bootstrap／读盘覆盖 | 新会话才受控冷恢复 |
| 完整终局保存后重开 | 恢复 living-hub／dead | 无奖励、扣款、日结或死亡消费重跑 |

一次正式操作仍一条 S dispatch、一笔 checkpoint write attempt、一次原生通知。reservation 是首次创建前的独立应用写入，必须独立计数，不混成“初次确认只有一次物理写”。除首次 reservation 外，不用监听器另写进度 metadata。保存反馈不从无条件 UI 成功通知猜测。

## 跨标签与占用

主推荐在允许的同源安全上下文使用 Web Locks，整个可写应用会话持有同一新命名空间独占锁；`ifAvailable` 未取得则第二标签只显示占用页，不构造 S、不生成身份、不读为新槽、不写入。不使用 steal，不给并行只读页面提供仍可执行的旧 selector。锁不存在或能力不满足则阻止此封闭入口，不能用 localStorage 布尔／TTL 冒充互斥。

锁释放／页面终止／BFCache 恢复／跨同源 frame、锁申请竞争、第二标签重试必须真实测试。恢复页面先确认仍持锁；失锁即废弃可执行上下文和草稿，重新取得锁后只冷恢复最后成功 checkpoint，不安装失锁旧内存。租约心跳、时间戳和 storage event 只可作诊断，不代替锁。主标签关闭后的新页面自动取得锁不等于能把旧内存未保存状态带来。

依据：[Web Locks 工作草案](https://www.w3.org/TR/web-locks/)的协作锁语义；[HTML Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)不提供跨 agent-cluster 的 read/modify/write 锁保证。这里是技术推荐，不作浏览器覆盖或跨标签 PASS；私密模式、分区、存储淘汰、用户编辑、不合作脚本和系统崩溃仍有限制。

## DOC-WORLD-ENTRY-006：浏览器启动后继合同

主线已定稿候选外恢复材料、prepared handoff 和唯一持久化责任；不从刚读到的 candidate 自证 expected。进程内 domain 不等于跨标签互斥，孤立 reservation 必须 blocked，不自动清档或补发；本轮未实现 browser owner。

依据：[DEC-053](../../../05-design-decisions.md#dec-053)、[同范围后继正式合同](../../../engineering/world-integration/preplay/browser-owner-contract-v1.0.md)。本轮文档与 T01 交付仍待准确 SHA 实审；批准／定稿不等于生产或体验验收。
