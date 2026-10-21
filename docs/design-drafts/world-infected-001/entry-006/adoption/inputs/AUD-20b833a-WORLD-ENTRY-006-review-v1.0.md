# WORLD-ENTRY-006 准确提交实文件审查 v1.0

## 结论及适用范围

**候选合同实审通过，可交 Owner 集中采纳（PASS_FOR_OWNER_ADOPTION）。另有一项非阻塞 TEST 工具问题 T01，留下一次明确授权的文档归档任务一并修正。**

这不是D1/D2已经采纳、正式DEC/UIR已生效、生产开工、浏览器验收或Owner体验通过。没有要求重开世界设计，也不撤销394f59d查询工程的限定PASS。

- 仓库：`lvlw/elevator-survival`。
- 受审提交：`20b833aeec4693e56afee075c9878425d3c58605`。
- 父／起始提交：`394f59d3c5df2a65ce87186e8988982d76784a71`。
- Tree：`29271bdca786ba60fc9884ae12bc7fba844fa488`。
- 远端：`feature/design-world-entry-006`，本次读取与受审SHA一致。
- 本地工作区干净、其他远端引用未改为作者报告；主线不冒称读取Owner磁盘或独立复现22个历史分支的前后差异。

## 1. 审查来源

实际读取`docs/design-drafts/world-infected-001/entry-006/`的00—07八份主稿、三份contracts、completion、checks相关范围、native模板、runner及results；核对提交patch和该目录Git对象。

定点核对当前`combat-persistence.ts`、`combat-expectation.ts`及`combat-test-fixtures.ts`，并比较受审SHA与父SHA根目录树。完整`src`树保持`9d8807ee1ff1353f5e8d80baec2f4326364455cd`；脚本、配置、依赖、CI和AGENTS的根对象也相同。未以Project Sources旧副本代替仓库基线。

任务权限来自实际输入ZIP。主线独立重算5份原件的字节长度、Git blob、4条SHA-256和完整inputs tree；与受审提交一致，inputs tree为`ccebce0b82b3518e8de425e41bd2e028c178abf9`。

27条变更与任务许可匹配；五处既有文档patch为末尾追加。作者1470保护对象及五份原前缀逐字节审计没有在主线完整重跑，不把patch核对说成逐件本地checkout审计。

## 2. W1：身体提示及D1

D1正确地把“内部已经批准的结算区间”与“是否允许玩家看到该区间”分开。

实际配置`docs/content/infected-residence-core-test-config-v0.1.json`的`config.health.infection_damage`区间起点为0、60、90、120，对应内部损血表0、1、2、3；不是`infection_stages`增长表0、1、30、60、90。公开当前负担的建议使用前者，没有把两个分段系统混为一谈。

候选的四标签为“未达病程损耗档／低病程负担／中病程负担／高病程负担”。最低档不等于未感染、无潜藏暴露或下一周期安全；最高档不触发独立死亡，仍由HP0规则决定。周期先有其他身体变化，故当前档不能承诺下一周期扣血或生还。

主线推荐采纳D1，但这是待Owner决定的新知识披露。若采纳，只局部更新当前感染提示及相应安全等价类；同公开档不同精值、不同潜藏暴露仍不得通过预览、选项、数量、排序、错误或Feed泄露。实际明确用药后的拒绝/消耗是执行观察，不作“任何行为都无法推知”的虚假承诺。

D1不授权新增症状系统、扫描、诊断服务、精确进度/概率或日结预测；不改任何现行数值。

## 3. W2：刷新、交互与现有能力

候选已识别原生通知回调会读到blocked，而执行返回后才有ready。采用显式命令返回发布、稳定安全snapshot缓存、单飞门和对象草稿失效，避免把现有subscribe直接当作可用React状态源。

Presentation通知与原生玩法通知分开；retrySave无新玩法通知也更新保存反馈。投影失败不重发动作、不回滚current、不重复保存。UI不读raw current、receipt或trace补洞。

现有Preview并不提供完整命令死亡三态、全部安全结果事件或敌人视觉key。候选没有以23字段映射伪装这些能力已经具备，而将必要公开metadata及适用动态保护列为基础工程责任。缺少合法公开依据的分支保持unknown，不新增隐藏知识；也不能把整个Gate永久删除。

first-fit仍仅是明确普通拾取后的便利，不自动旋转、整理、合并、填快捷栏或替代任务placement。三份最近工程合同保留“基础准备→浏览器owner→低资产UI”的依赖和独立准确SHA停审。

## 4. W3：启动材料、expected和存储

关键缺口判断成立：`prepareCombatPersistence`已有`{value,text,expected}`，但既有普通`write(text)`没有expected交接。候选要求后续明确窄改受控交接，不让adapter从刚读到的payload推导expected。

`combatCommittedExpectation`包含版本、初始材料、任务生命周期、场次和关闭锚等；它不是完整第二身体/库存。完整expected可能含战斗死亡trace，不可为缩小外层而省字段。候选外层checkpoint与reservation是技术建议，不修改v4三键领域格式。

N09的TEST helper确实从上次已提交current及独立initial材料形成expected，而非解析v4Text取锚；但这是TEST能力，不代表已有浏览器持久化实现。

草案已承认：外层metadata与payload同处客户端，hash不等于可信根；整套数据可被编辑/回档，不承诺离线防作弊。一次读取外层字符串会拿到含payload的字节，不能误称物理上未读取候选；应保证先从独立生成metadata固定expected，再交S解码领域值。

首次reservation写成功、first checkpoint写失败后，本页保留内存并可retry；崩溃再开则blocked，不重发初配。后续写失败再刷新只能读最后成功checkpoint。该保守支持代价应在Owner采纳说明中显式呈现，不能以后悄悄补清档/重建。

Web Locks负责合作页面的独占，domain不能代替。无相应能力或未获锁时不进入可写会话；BFCache、失锁、第二标签和崩溃仍必须真实浏览器测试，不用localStorage布尔/TTL冒充互斥。

## 5. 非阻塞工具问题T01

文件：`validation/run-native-probes.mjs:12`。

原条件以`relative.startsWith('..')`判定路径可能在仓库外。对于`/fixture/repo/..probe`，`path.relative('/fixture/repo', out)`得到`..probe`，原条件放行，虽然它实际是仓库内子目录。Node的win32路径运算有同类结果。

主线取与提交blob一致的完整runner，执行其原样路径判断12例：10符合、2误放行、0非预期异常，exit1。只执行路径谓词，没有执行游戏、十项原生探针或浏览器；也不是Windows OS实跑。源blob和可复跑脚本见证据包。

严重性：LOW／非阻塞候选采纳。已记录作者正常输出位于仓库外临时目录；没有证据表明本轮曾因此污染src或改变十项结果。不得将本发现泛化成存档/游戏漏洞。

处置：下一份文档归档任务明确加入该runner路径保护及定向回归；按路径分量而不是字符前缀判定，并处理实际存在的祖先路径/符号链接落点。新增仓库根、普通子目录、`..probe`子目录、正常父/兄弟目录及链接案例。保留原探针结果，修前/修后独立记录；不改生产或扩大为性能/浏览器工程。无需为此再开一轮完整世界设计。

## 6. 实际证据分账

| 证据 | 本轮状态 |
| --- | --- |
| 主线原件核验 | 5件blob/大小、4条SHA-256及完整inputs tree匹配 |
| 主线代码/文档审阅 | 上述11份主稿/合同、模板与结果、关键真实源码、提交patch与根对象 |
| 主线路径谓词检查 | 12例：10符合、2误放行；只支撑T01 |
| 作者原生probe | 最终10/10；首跑7/10三项夹具错误单独保留；主线未复跑 |
| CI161 | 准确20b833a，attempt1，completed/success；四阶段success；未下载完整日志重计测试 |
| 主线完整仓库/npm/架构 | NOT RUN：容器Git请求DNS失败，未取得完整仓库 |
| 浏览器IO、多标签、UI、Owner试玩 | NOT RUN；候选合同的未来责任，不是PASS |

W01仍是原两文件七处硬换行的历史限定例外；本轮没有扩大。作者累计exit2不改写成全部干净；主线没有在完整checkout重跑累计diff命令。

## 7. 外部API交叉核对（与项目证据分开）

仅用于验证候选采用的API边界，不替代原生/浏览器执行：

- React `useSyncExternalStore`官方Reference：未变化时getSnapshot须返回同值，快照不可变；对应候选的稳定安全缓存。
- W3C Web Locks工作草案：合作锁、回调任务结束释放；对应独占会话持锁而非localStorage标志。未据此宣称所有浏览器已测试。
- WHATWG HTML Web storage：跨agent-cluster不应假设已有锁；对应独立锁及显式失败路径。

读取入口：`https://react.dev/reference/react/useSyncExternalStore`、`https://www.w3.org/TR/web-locks/`、`https://html.spec.whatwg.org/multipage/webstorage.html`。不对浏览器支持率、性能或未来版本作额外承诺。

## 8. 下一停止点

Owner只需在当前WebGPT集中决定D1及D2。主线推荐两者均采纳，具体范围见`WORLD-ENTRY-006-ADOPTION-v1.0.md`。确认后按已有权限下发集中正式落文任务，并纳入T01低优先级修正；归档提交准确SHA实审后再分别授权基础、浏览器、UI工程。

此刻不向Codex发生产任务、不变更Project Sources、不合并main、不清旧槽，不要求Owner逐字段或逐函数协调。
