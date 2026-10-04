# C：显式 v2 终局会话支持合同与验收定位

状态：作者实现／本地验证，待当前主线准确 SHA 源码与 headless 恢复实审。不是规则来源、玩家可玩结论、Owner 体验 PASS 或 O3 发布决定。

## 权威与版本

- 起点：`b9b1e0fee0e779669ca40e088ac9a867016bff82`，新分支 `feature/residence-terminal-session-001`。
- 正式依据：DEC-049/050/051、[A 合同](../terminal-core-contract-v1.0.md)、[B 恢复合同](../terminal-restore-contract-v1.0.md)、[批次计划](../terminal-batch-plan-v1.0.md)及[本批任务书](inputs/ENG-RESIDENCE-TERMINAL-SESSION-001-task-v1.0.md)。
- 前置 [B 准确 SHA 实审](inputs/AUD-b9b1e0f-ENG-RESIDENCE-TERMINAL-RESTORE-001-review-v1.0.md)限定 PASS；C 不修改该报告。
- 仅消费 B 的 `elevator-survival.residence-headless / formatVersion=2`。旧 v1 codec、默认 G4 入口和测试不变；不自动探测／迁移。34+4 配置只取现有受控句柄，不新增默认参数、rulesVersion 或保存版本。

## 入口与所有权

普通 [terminal-index.ts](../../../../src/state/residence-session/terminal-index.ts)仅值导出错误类和严格 command constructor；[terminal-controlled.ts](../../../../src/state/residence-session/terminal-controlled.ts)仅值导出 v2 factory 与原 `createResidenceSessionDomain`。精确导出由测试锁定。B 策略工厂仍为唯一策略入口。

[domain.ts](../../../../src/state/residence-session/domain.ts)仅保存 issued/claimed WeakSet，不保存 current、钱包、存储缓存或历史。无效组合不占域；有效 v1/v2 同型和交叉构造均不得再次占域。无 release/reset；这是单运行时技术域，不是跨标签锁。

[terminal-session.ts](../../../../src/state/residence-session/terminal-session.ts)是唯一 current owner。composition 必须是无额外键／无 accessor 的普通对象，显式包含签发 B policy、同步 read/write 端口和首次 factory，可含 execution provider。构造捕获这些依赖，运行时不重新读取外部 composition 属性。异步／generator 函数拒绝；伪装普通函数返回 Promise 不是受支持异步协议，read 被阻断、write 不宣称同步保存成功。应用不得提供异步端口。

getState 和订阅视图是冻结的完整 headless 诊断，**包含内部身份、种子、精确身体事实，不是普通 Player ViewModel**。queryKnowledge 只复用 G2 安全查询，queryTerminalEligibility 只复用 A 安全查询；非活动 phase 不访问历史地面，返回 null／全 false。

## 支持矩阵

| 当前边界 | 允许操作 | 不允许操作 |
| --- | --- | --- |
| unbootstrapped / 无 current | bootstrap 一次 | dispatch/createFirst/retrySave |
| read-error / blocked / 无 current | 显式 retryRead | 隐式 new、清档兜底 |
| no-save / 真实 read-null | createFirst 一次 | 第二 bootstrap 或普通任意安装 |
| fresh-hub / ready | 首次 launch；retrySave；只读查询 | move/终局；假高余额或第二委托出发 |
| active-world / ready | move、reveal、pickup、drop、rest、deliver、withdraw、deadline，具体资格仍由 G2/A 决定 | 请求提供 outcome、authority、计划、snapshot、patch 或 supported |
| living-hub / dead / ready | 冷恢复、诊断／安全空查询、retrySave | 旧现场操作、重复终局、另一个 commission 的 launch、复活 |
| 已有 current（含写失败） | 当前合法业务或 retrySave | bootstrap/retryRead/createFirst/replace |

首次链是实际 read-null→factory→B 验证 fresh revision0→预编码→提交。launch 核对身份、revision、D1 first-ready、未接声明与完整目录；全奖空间查询在 provider 前。合法 fresh 余额固定初值0，高余额不足不是合法首次正例：分别用 A 查询恰满／差1、真实 launch 窄守卫故障注入和非法 fresh 拒绝证明边界，不扩大 B。

实际首次 launch 调用身份激活、G1 depart、G2 establish 各一次。首次 steps=[]、身体、实物状态、仓库、余额、声明和历史完整承接。首次入口活着但 pending combat 不提交；这不是产品避战能力，只是当前未接协调器的工程拒绝。

## 规则与提交顺序

1. 严格 command parser 复用旧六意图 constructor 或 A 三终局 schema。只接意图／绑定／revision 和该正式动作参数。
2. 从当前完整值与 B policy 建立 G2 authority 和 A TerminalAuthority。命令无权提供权威或完成事实。
3. 活动调用一次原生 G2，核验原计划与完整局部前态。非 G2 字段从原 current 完整承接；不重算移动、负重、风险、实体或周期。
4. G2 death-required 把**原计划对象**交 A consume 一次；A 完整计划必须签发且对应旧完整 current。不能先把 HP0 active 交 B，也不能复制 plan 冒充签发能力。被动到达 pending 可保留在死亡档案，生还 pending 仍不支持。
5. 正常 deliver/withdraw/deadline 调用 A。正常返回保留真实 G1 steps=[]／body/cycle 不变；截止按实际流血→感染→饥饿短路，生还 ready，不造任务 Day8；C 不再调用 G1 或多加 revision。
6. B 完整聚合校验并生成 v2 字符串后，唯一 current 一次替换→write 一次尝试→一批只读通知。B 同进度 expected restore 不用作合法后继验证，也不从 next 复制 expected 自证。
7. write 失败仍返回 committed／save-failed，保留最新内存。retrySave 只编码当前最新值并写；不回读、不回滚、不补动作／周期／随机／奖罚、不发玩法通知。
8. 所有可写入口由 BUSY 包围，包括 read、factory、provider、规则、编码、write、listener、retrySave；监听异常单独记录 LISTENER_FAILED，不影响其他监听或回滚提交。

错误分层：Session 的 BUSY／domain／composition／phase／stale／binding／provider／plan 错误；G2/A/B 的正式规则、签发及编码错误保留各 owner 类型；存储 read 异常只记录 STORAGE_READ_FAILED，write 异常只记录 save-failed，不泄漏原始错误。非法提案在 commit 前失败；存储失败发生在 commit 后，两者不混淆。

## C01—C12 原生验收映射

下表文件均位于 `src/state/residence-session/`；完整计数和运行证据见 [verification-results.json](verification-results.json)。

| 编号 | 文件与实际用例定位 | 证据类别／失败阶段 |
| --- | --- | --- |
| C01 | terminal-compatibility：one issued domain、same-type construction、invalid composition；旧 session 七文件原样运行 | 原生构造与运行时负例；占域前 |
| C02 | terminal-session：actual read-null、reward capacity、invalid first factory、launch rejects、first entry；terminal.integration：完整首次长链 | 原生首次链；容量分层查询＋真实守卫注入负例；provider 前 |
| C03 | terminal-actions：跨图往返、一次来源、E0 整实例、A/C rest、非零 arrival、非法 placement/carry；terminal.integration | 原生 G2；局部规则拒绝零 commit |
| C04 | terminal-endings：H0 day/complete 参数化、Day7 deadline alive/bleeding/infection/hunger、错误意图与非 Day7 | 受控 A/B 合法内容起点＋原生 C/A；不声称 fresh 到真实五图成功 |
| C05 | terminal-endings：real first chain closes 九种死亡；terminal-persistence：move/reveal/rest 死亡写失败 | 原生首次链及 G2 原计划对象；consume 一次、无重放 |
| C06 | terminal-session：factory input 不改不冻结；terminal-endings：copied/foreign/malformed G2、copied A、三种 encoding failure | 原生正例＋明确生产者／编码故障注入；预编码前后边界 |
| C07 | terminal-history：四态冷恢复；terminal-session：坏／旧字符串、read-error 和已有 current 拒绝重建；B 原六文件 | 真实字符串和新域；冷安装一次、零规则/write/notify |
| C08 | terminal-persistence：三类链独立计数及重复 retrySave | 原生结果＋同步 storage fault；current 保留、最新字符串恢复 |
| C09 | terminal-reentry：十种回调点、未捕获 write 重入、listener 隔离／退订、provider 失败后恢复 | 回调注入 BUSY 负例，外层真实生产者 |
| C10 | terminal-history：旧 success/failure/deadline × move/rest/withdraw、旧 ready 不免夜；terminal.integration | 原生 A/B 两声明历史作为冷起点；C 不开放第二 launch |
| C11 | terminal-compatibility：隐藏 seed/enemy HP/infection 对照、精确 exports/nine commands、pending cold | 只读安全投影＋类型/运行时测试，不将诊断当 UI |
| C12 | 全量 check、白名单／Git 对象／配置／前缀／输入哈希／链接／源码指纹与远端核验 | 静态和实际命令；浏览器／Owner 未运行 |

## 独立故障计数的口径

观察器在夹具生产结束后安装，分别 spy 身份 activate/terminate、G1 cycle/action、G2 establish/move/reveal/transfer/rest、A plan/consume、draw；factory/provider/read/write 分别记录。current 提交数从 write 回调观察到的不同实际 current 引用计数，不使用 committed 标签；通知批次和两个 listener 独立计数。冷安装没有 write，另在四态测试核验 null→新 canonical 引用一次，不能把提交观察器的0说成没有冷安装。

- ①成功／失败正常终局：冷活动→A→write失败→重复意图拒绝→retrySave→新域冷恢复。
- ②来源随机 reveal 写失败→真实 pickup→rest 写失败→合法终局→retrySave→新域冷恢复。失败返回支线从真实首次链开始；成功支线从 A/B 完整达标夹具冷读开始。
- ③原 G2 move/reveal/rest 致死→A consume→终局写失败→dead 禁业务→retrySave→新域冷恢复。

各支线不是混成“总调用1”。详尽独立计数在 verification-results；所有 cold 的身份／G1/G2/A／draw/factory/provider/write/notify 增量为0，仅 read1 和一次冷安装。

## 未支持与停止点

活着的 pending combat、后继委托接续和出发日结死亡、五图真实任务件／安装生产者、战斗医疗、专长、工具箱、商城、UI、安全提示、浏览器存储、多标签协调、O3 发布仍不在 C。历史中下一声明出发由既有纯生产者构造，不代表本 owner 提供玩家第二任务。

浏览器、刷新、多标签、Owner 分段突破及恢复负担试玩：**NOT RUN**。同步注入端口故障不是浏览器持久化体验验证。依赖安全审计不在本轮，不调整已有构建告警阈值。

交付普通 commit 仅推同名 C 分支，准确 SHA／parent／tree 在提交后报告，不为自引用改写或 amend。完成后停止，等待当前 WebGPT 主线实审。
