# G3 headless 会话与严格恢复合同

依据 [任务书](inputs/ENG-RESIDENCE-SESSION-RESTORE-001-task-v1.0.md)、[O2 已批准补充](../runtime-restore-supplement-v1.0.md)及[续办授权原文](implementation-notes.md)。本页记录作者实现，待主线准确 SHA 实审；不是新规则、产品格式发布或 Owner 体验通过。

## 支持矩阵

| 候选 | G3 安装与操作 |
| --- | --- |
| fresh-hub | 生还 D1/first-ready，受控声明全集均明确未接，无现场／执行；真实携带容器和每实例 ItemState 完整。成功 read-null 后显式 factory 创建 revision 0；也支持严格字符串冷恢复。无 launch。 |
| active-world | 首执行 startCycle=1、D=T、T 不超过注入配置上限；恰一个 active，其余明确 unaccepted，无 closed 历史；G2 完整现场、身体、携带物和 pending=none。支持真实非战斗单边 move。 |
| closed／return-due／deadline-ready | 窄 mission 冷解析保留四类终止事实；整个聚合不安装，不丢弃历史、不兜底 new。完整接续仍 OPEN。 |
| dead／未结束战斗／pending／后续委托历史 | 不安装／不提交。不是玩法禁止，也不是未来玩家规避合法死亡机制。 |
| 到达损血／暴露事件 | 目录预检查即拒绝；未执行 G2 plan。 |
| 移动后遭遇或死亡 | 真实纯 G2 计划可形成提案，但 coordination／后态门禁拒绝提交；不忽略流血，不保存部分位置／身体。 |

## 形状与唯一事实

保存 envelope 严格为 `format=elevator-survival.residence-headless`、`formatVersion=1`、`state`。这是开发 headless 格式，不是旧浏览器 Run Save 版本升级或 O3 选择。

state 公共字段为 phase、character、missions、carried、itemStates；fresh-hub 另有 catalogRef（携带物规则目录引用，不是现场），active-world 另有原 G2 site。character 是唯一身体／D/T／revision owner；不增加镜像 body、权威 authority、派生 cache、计划、Effect 或玩家查询数据。委托数组是受控声明全集的一份事实表；嵌套 binding 均交叉核对，不能替换目录。

策略只接受经过 G1/G2 工厂签发的配置和 catalog handles、明确 rulesVersion 与声明全集。policy 的复制对象不是受控 handle。冷档根角色 ID 是待校验值，不是独立历史证据；scope 来自根 ID 与独立声明。所有嵌套角色、委托、执行、配置、目录、D/T 校验后才产生冻结候选。既有 G1/G2 schema 和公式保持。

原 `restoreMissionCandidate(raw, expected, scope)` 仍要求独立 expected。新增 parseMissionColdCandidate 仅在 controlled 模块，不经普通 core index 导出。它无当前状态安装权；K18/K19 保留，K20 只依 ADDENDUM-01 增加一项精确预期。

来源检查不重抽：复用 G2 stable sourceItemId，未兑现却已有对应实体拒绝；已存在实体须与至少一份目录输出的定义／数量相容。不存在的实体不自动补发，既有资源损耗不重置。G2 自身继续校验来源游标、敌人状态／意图、真实跨容器唯一实体／资源、几何、负重、知识及现场引用。

## API 与状态机

受控入口 `src/state/residence-session/controlled.ts` 提供 createResidenceSavePolicy、createResidenceSessionDomain、createResidenceSession；domain 由 composition 保管，同域第二 writer 在 IO 前报 DOMAIN_CLAIMED。普通 index 仅导出命令 constructor、错误类与只读类型，无 install/replace/setState/loadRaw 或任意 initialState。

| 当前控制状态 | 允许控制操作 | 结果 |
| --- | --- | --- |
| unbootstrapped | bootstrap | 仅一次真实 read；null→no-save，字符串合法→ready，异常→read-error，坏档→blocked |
| read-error，无 current | retryRead | 再次真实 read；只有真正 null 才成为 no-save |
| no-save，无 current | createFirst | 受控 factory 一次、严格 fresh 校验和预编码；提交一次、write 一次、通知分发一次 |
| ready | dispatch(move)、retrySave、只读查询 | 不允许第二 bootstrap/create；retrySave 不接受旧字符串，不调用规则、不增加 revision、不通知 |
| blocked | 只读诊断 | 不提供 clear、自动升级／修补／new 或重装 |

getState 是内部 headless 诊断，可含身份和 seed，不能直传普通 UI。queryKnowledge 仅调用 G2 玩家白名单投影；fresh-hub／无 current 返回 null。subscribe 不立即通知，注册／取消均零玩法副作用。

## 提交、故障与重入

进入 bootstrap、retryRead、factory、dispatch、retrySave 即 busy。请求严格复用 G2 constructor，只允许 move+完整绑定+expectedRevision+edgeId，不接受费用、快照、支持布尔、结果或多边队列。

真实 G2 plan 一次 → 签发／完整前态新鲜度校验 → 身份／执行／目录／revision+1 连续性及聚合校验 → 序列化 → 单次 current 替换 → 一次同步 write 尝试 → 一次订阅分发。写失败仍 ready、保留已提交内存，另标 save-failed；不 reload、rollback、retry 或重新 draw。之后合法命令读取新 current；显式 retrySave 只保存当时最新 current。

write／notify 期间只读可见完整新 current，重入 bootstrap/create/dispatch/retryRead/retrySave 均 BUSY。通知逐订阅隔离，抛错不阻断后续订阅，不撤销提交；仅返回 LISTENER_FAILED，不暴露原始 Error。无控制状态通知，便于与玩法通知分开计数。

错误分层：INVALID_JSON、INVALID_ENVELOPE、UNKNOWN_FORMAT、UNKNOWN_VERSION、UNKNOWN_RULES、UNKNOWN_CONFIGURATION、UNKNOWN_CATALOG、INVALID_STATE、UNSUPPORTED_STAGE；存储读异常为 STORAGE_READ_FAILED，写异常为 save-failed。规则拒绝保留正式 core 异常，但不将含内部身份的 raw 错误投影为玩家文案。

## 后续 Gate

关闭历史／完整返回／期限／死亡协调、第二委托接续、CTB、五图、钱包、玩家入口、浏览器持久化与跨标签一致性均未交付。O3 发布安排和 Owner 分段突破／恢复负担试玩为 OPEN / NOT RUN。冻结对象和域句柄不证明离线文件未回滚或跨标签互斥。禁止据本实现自动启动下一工程。
