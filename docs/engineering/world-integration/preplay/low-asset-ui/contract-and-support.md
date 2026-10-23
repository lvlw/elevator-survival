# 低资产界面：契约与实际支持

本文件是 ENG-WORLD-LOW-ASSET-UI-001 的作者实现映射，不新增 DEC／UIR、公开知识或玩法规则。依据[正式 UI 契约](../low-asset-ui-contract-v1.0.md)、[现行 UIR](../../../../09-ui-design-record.md)及本批任务原件。工程验证、准确 SHA 实审和 Owner 体验分别记账；后两者不能由本表提前宣布通过。

## 唯一状态与只读说明

实际链路为 `React → BrowserOwner.controls → PreplayController → 玩家 facade → 既有唯一 S`。React 只订阅稳定安全 snapshot、组合明确请求及保存展示草稿；不持有 raw current、不创建 S/domain/writer，不直接读写 localStorage。系统状态、preplay 展示状态、四领域 phase 和五合法停点分别处理。

必要输入说明的同源接缝：

- `src/core/residence-supply/player-inputs.ts`：引用正式声明、配置和既有纯资格，形成输入形状、材料需求、固定产物几何、目标和维护总池；不生产结果。
- `src/content/infected-world-v0.1/player-ui-catalog.ts`：已批准的初选与方案公开词汇，不创建身份或初配。
- `src/state/residence-session/player-inputs.ts`：只在当前 action opaque 绑定内把内部引用替换为当前选择句柄。
- `player-preplay.ts/types`、`infected-preplay/controller.ts/types`、`infected-browser/owner.ts/types` 仅委托 `describeAction`，不改变资格、安全、确认、锁或保存语义。

最终资格、资源支付及完整命令安全仍来自既有 `preview/execute/confirm`。材料、数量、源／目标堆叠、快捷槽、伤口／挫伤、分配池及放置均明确选择。普通已揭示整实例拾取仅在明确点击后，未旋转 row-major 逐格安全 Preview；任务取得／搬运／交易／安装不使用此便利。没有自动整理、合并、补槽或替换材料。

查询不调用 producer/resolver，不揭示未知搜索产出、精确病程／潜藏暴露、敌人精确生命／CTB、未来抽签或风险百分比。消毒剂和抑制剂的隐藏目标资格仍为 `unknown`；完整后果不足时安全判断仍为 `unknown`，不能称安全。`not-guaranteed` 只表示未证明必死／有非死亡分支。当前病程四档直接展示安全 DTO，不重新划阈值。

## 停点与系统状态

| 停点 | 展示及操作边界 |
| --- | --- |
| first-hub | 真实初配、已锁定选择、手动出发；不改选或补发 |
| stable-active | 当前房间、已知只读地图、单边 Travel Cluster、来源／地面／任务、整理、药食及维护 |
| battle-decision | 当前公开意图、敌阶段、相对顺序与正式战斗／快捷动作；携带区只读 |
| living-hub | 成功、主动失败或期限失败的真实结算；无后继不自动过夜／治疗／出发 |
| dead | 正式 HP0 结果和实物处置；不复活、不重接，不套旧医院 New Run |

`occupied`、`unsupported`、读取错误、坏档阻塞、预留失败、失锁和投影不可用均是独立系统反馈，不冒充死亡或空档。保存失败保留最新内存；只保存重试不替换选择上下文、不重播规则。失锁后的旧 controls／选择／确认失效，明确重获独占后冷恢复。

当前 combat DTO 没有敌人公开名称／定义映射，因此舞台使用“当前对手”中性占位；不按房间、意图或隐藏身份猜图。它不把搬运工或技术员画成感染护工，也不扩大玩家知识。

## U01—U10 证据索引

下表记录实际证据，不把旧 browser-1 的局部失败追改为 PASS。定向联合记录最初为 22 files / 93 tests PASS；随后 SystemScreen 增加三项回归，最终默认 check 为 309 files / 4650 tests PASS，browser-3 为 7/7 PASS。提交／CI 另按最终 Git 收据核对。

| Gate | 原生／DOM 证据 | 浏览器与剩余收口 |
| --- | --- | --- |
| U01 | `entry.test.ts`；`setup.test.tsx`、`browser-binding.test.tsx` 的 StrictMode、重挂、晚到锁 | browser-3 实际 DEV／旧 preview／默认隔离及当前 dist 生产页忽略参数通过；0 新 key IO／writer 锁 |
| U02 | setup 九组合、零身份／写／发物、初配锁定；phases 系统错误 | browser-1 明确创建和首次 Hub；真实 reservation/checkpoint 计数独立记录 |
| U03 | inventory 搜索结果重开零作用；privacy 已知数据与隐藏字段 | browser-3 A 真实探索／来源／任务链；22 已知节点地图与键盘菜单零 IO／execute／confirm |
| U04 | `parameters`、`inventory`、`first-fit` 的真实输入／格位／菜单／拆合快捷／多材料及多输出 | A 实际材料搬运与样本显式 2×2 放置；普通整实例与特殊任务便利分开 |
| U05 | `medical-maintenance` 实际退却后第二材料堆维护／绷带；输入说明测试覆盖六类药食、维护／充电和目标边界 | B 实际立即维修→医疗→休整；样本护具支付由正式 Preview 与真实执行对照 |
| U06 | `combat` 三敌真实 CTB；`terminal` 四终局、Day7 补充和两种敌终态；A 完整成功 | browser-3 A／B 和双方归零／敌仍活死亡均通过；browser-1 驱动匹配失败历史保留 |
| U07 | confirmation-stale 取消／双击／外部正式变更；faults 重入／程序错误；browser-binding 第二 click | 同源竞争和生命周期有真实浏览器记录；旧上下文不能靠刷新句柄重发 |
| U08 | 原 owner 回归与 DOM 保存失败／retry／冷接续；combat 两种 dead 重挂零重放；坏档读取／投影故障分流 | browser-3 五停点及两类 dead 刷新、同分区竞争、真实 BFCache persisted=true 通过。6 次端口写失败不冒充 OS 故障 |
| U09 | privacy 同粗档不同隐藏值、同敌阶段不同 HP、相反样本抽签；accessibility 真实键盘／焦点／取消 | browser-3 12 图逐张查看；实际 Shift+F10／Escape、菜单可见轮廓与边缘、焦点返回通过，console 0 |
| U10 | 两条 React DOM 长链各自 30000ms 局部预算；所有旧测试保持；T02 独立工具证据 | 默认完整 check 309/4650 PASS、浏览器 7/7、三类语义负控恢复 PASS；截图 ZIP 见最终记录，Owner 体验 NOT RUN |

两条新 DOM 长链在 `src/ui/infected-world/longchain.integration.test.tsx`：A 从真实 read-null、明确初选，经三敌和真实材料／安装／样本至 H0 成功；B 从独立空档退却、立即维修、医疗、休整，插入保存失败和只保存重试，再冷恢复、原敌再入及合法止损。驱动点击真实 React 控件及输入事件，不用 owner.execute 或纯路线结果代替 UI 链。

独立 S spy 记录 dispatch/current/notice/生产者/随机；浏览器 `controlsCalls` 和 IO 不是同一指标，不能冒充原生 dispatch 数量。补充低 HP、Day7 或终局 checkpoint 明确标记 TEST 来源并严格验证，不冒充空档主链。

## 未宣称完成的事项

Owner 自由首玩、体验与平衡验收、最终 Art/UI Skin、其他浏览器覆盖、真实 OS 配额／ACL 耗尽、断电持久性、O3、公开发布、迁移／清档及永久双入口均未由本批批准。截图 ZIP 与准确提交信息见 completion 和最终 Git 收据，不把作者验证升级为主线实审。

## R1 UI-01／02／03／V01 对应（不重写原 U01—U10）

R01 关联 U03/U05/U06：来源、无参数调查、移动、战斗、出发、休整和终局入口均有 L0；完整无参数请求读正式 metadata，必要参数未齐不构造试算。R02 关联 U02/U04/U05：三工具三专长具体说明及 component/module 中文展示。R03 关联 U04/U05：对象菜单依据安全输入的 opaque 候选，通用药食仍可显式选其他药；战斗携带继续只读。R04 关联 U07/U08：只澄清会话保存文案。

U01 默认／旧入口隔离、U09 隐私／失效和 U10 验证责任原样保留。隐藏医疗目标和战斗完整后果不能因新说明被改称安全；新层没有生产者、ID、存储读取或规则缓存。当前能力、源码位置、逐条来源及旧测试定位更新见[r1/wording-and-test-map.md](r1/wording-and-test-map.md)。准确 SHA／Owner／O3 仍分别验收。
