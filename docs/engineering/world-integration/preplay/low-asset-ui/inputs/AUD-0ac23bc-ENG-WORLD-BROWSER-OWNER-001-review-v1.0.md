# AUD-0ac23bc — ENG-WORLD-BROWSER-OWNER-001 准确SHA专项实审 v1.0

## 结论与停止点

**PASS：本批浏览器启动／prepared持久化／合作页面独占接缝通过限定实文件审查。** 没有发现需要退回浏览器生产实现的阻塞项。可按已批准批次顺序下发低资产UI工程；不是已完成UI、Owner首玩、公开发布、O3或全平台验收。

非阻塞工具附记 **T02**：本批浏览器TEST runner的输出目录保护仍是字面路径前缀判断，会误放行“外部符号链接实际指向仓库内部”。应在下一批UI测试工具工作包内窄修，复用已审T01 helper；不要求重做存档设计，不倒改已有浏览器结果。

## 1. 精确事实基线

| 项 | 值 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 最终提交 | 0ac23bc3654d69c3d0a6289d5d9e97ce30c69164 |
| 父／起点 | bc60f24cc16625a25ad56b0b917da63b16f29f56 |
| tree | 4bd8ee9a9466483b26a07e6f2a8f31b4b77879d0 |
| 分支 | feature/world-browser-owner-001 |
| CI | #165 / run 39803879210 / check job 119911785695 |

本轮实际读取Git commit、分支ref和compare。远端同名分支指向受审提交。compare为1个直接后继提交，59文件，8修改／51新增，全部在原63路径许可内；4份共享文档追加、4份S生产宿主窄扩展，其余新文件。没有main、App入口、旧控制器、P/R/G1/G2、domain、格式、参数或依赖变更列入本diff。

用户本地工作区干净、其他24个远端引用不变，仍按作者记录；主线没有读取用户磁盘或独立重算其1583个保护对象。禁止把这一限定审查称为完整仓库逐字全审。

## 2. 审查依据与阅读范围

依据Owner已采纳D1/D2、DEC-053、已归档browser-owner-contract-v1.0、batch-plan-v1.0和本批原任务包；不将早期项目说明快照作为当前开工状态。

重点逐读：browser owner、lease、lifecycle、startup、storage、checkpoint、schema、reservation、identity-materials、initial-materials、composition、types、snapshot、errors；四份S宿主combat-types/composition/persistence/session；选读startup、lease、faults、owner及prepared-persistence测试；实际浏览器runner、harness、两条路线脚本、结果与实施记录。读取原UI合同、有效UIR速查及main/application-entry仅用于下一批任务范围确认。

未宣称所有17份新增测试逐行独立重验；未读取作者临时目录截图、完整原生执行原始日志或用户工作区patch。远端完成报告与自动证据不单独构成通过理由。

## 3. 保存与启动判断

### 3.1 S交接保持单写

`combat-composition.ts`以严格数据属性区分旧read/write与显式prepared模式，不允许同一composition同时包含两套writer。异步函数在组合校验拒绝；调用后非undefined、thenable或异常按保存失败处理，不await S端口，不fallback第二writer。

`prepareCombatPersistence`先完整聚合、再生成原v4字符串，冻结checked expected与handoff。`combat-session`仍先一次替换current/expected，再一次writer尝试，再原生通知；retry只重新验证／编码／写当前值，不重新提案。没有第二份可编辑canonical current。

### 3.2 初始化与冷expected

只有真正不存在的两个记录进入Setup。身份熵在明确初选后调用，reservation先成功写入才创建真实S／initial provider。部分初始化保守阻止，坏JSON、孤立记录和错配不会退回空档补发。

冷checkpoint外壳用严格schema，reservation与静态composition／版本／声明绑定；expected先与reservation交叉核对再交S解码原v4Text。适配器不解析payload.state来调用committedExpectation自证。元数据与领域text在一个checkpoint setItem中写入。一次读外层已取得payload字节，逻辑校验顺序不被夸大为物理未读取。

同客户端记录不形成外部可信根；不宣称防用户同时修改全套记录、旧备份回档或设备断电落盘。

### 3.3 独占与失效

固定namespace/slot锁名，exclusive+ifAvailable，全会话保持callback的未完成promise。未获锁不读盘、不生成身份、不创建S或发物。失锁先丢弃旧上下文和写能力；captured controls与writer再次检查租约；取得新锁只冷恢复最后完整checkpoint。

`startup.ts`在controller发布busy回调之后也复核租约，避免只在外层检查一次。`retryRead`不能覆盖已有current，即使展示投影已经失败。pagehide与persisted pageshow使旧上下文失效；不承诺页面崩溃后的固定释放时限。

对照W3C Web Locks规范核查了callback promise持锁及ifAvailable语义；这是平台语义核对，不是额外平台运行证据。参考：`https://www.w3.org/TR/web-locks/`。

## 4. 主线实际执行：39项隔离控制流

执行文件在source/，以下六件完整源码的Git blob与受审SHA一致：

| 文件 | Git blob |
| --- | --- |
| owner.ts | a432870d559dd7e610110992c0ce1040c4c24549 |
| lease.ts | 5cf50c7d2a697eb3535fb4fa273f644389708e1b |
| lifecycle.ts | af95dd0d7c20715fd4be3f81aae48c8ae779770e |
| storage.ts | 11ec47d56e4708ea6d75be3dfcee3075a5b17118 |
| snapshot.ts | ea07e3e498d4e91a85812d9745ad43868d29f2af |
| errors.ts | 29e7676f7ec19bf36316fdccb9c55023dca11ceb |

原样模块只经TypeScript转译，外围schema／identity／reservation／checkpoint与S/controller和LockManager使用明确TEST适配器。**不是完整Zod／v4／P/R/S／真实Web Locks或浏览器复跑。**

39项通过，0非预期异常：无档只读、初始化先后、非法初选、重复确认、无能力、竞争失败、并发acquire、待授锁时取消／dispose、读取失败、孤立记录、坏JSON、reservation失败、孤立占用、首checkpoint失败、最后durable恢复、最新保存重试、已有current禁重读、所有旧controls拒绝、pagehide/BFCache事件模拟、通知重入、busy回调失锁、初始化回调失锁及直接失效writer。

两类仓库外负控实际退出1：
- 放松孤立记录条件：37符合／2个业务断言失败／0非预期异常。
- 移除writer租约检查：38符合／1个业务断言失败／0非预期异常。

负控没有写进受审仓库；39项不与作者67新增或4554全量累加。

## 5. 作者原生与浏览器证据

作者基线270/4487，新增17文件/67项，最终287/4554及默认check通过，仍是作者执行证据。主线读取实际测试与记录，未在容器全量运行。

实际归档browser-results与runner相互对应：Edge 155.0.4283.62、独立临时profile、真实localStorage与navigator.locks、同源双页/iframe、五停点刷新、三敌真实动作及两类死亡。A/B路线通过browser controls→controller→facade→S，不直接安装current；边界死亡checkpoint单独标记TEST。保存异常是实际浏览器IO加故障注入，不冒称OS配额／权限耗尽。

B08记录实际pagehide.persisted=true、pageshow.persisted=true，及两个renderer-crash协议事件；崩溃后多次occupied才ready。原300ms假设失败保留，最终显式重试不自动排队。不得将此单平台观察推广为全浏览器保证。

截图在作者本机临时目录，主线未取得图片；本批是保存接缝审查，不是视觉验收。设备断电、其他浏览器／移动端／隐私分区、Owner体验继续NOT RUN。

## 6. CI与完整性

主线实际读取CI165的准确head_sha、completed/success和check步骤：安装、架构、typecheck、test、build均成功。本轮未下载完整日志重新计数；287/4554仍引用作者记录，不称主线复跑。

从本会话实际原ZIP字节重算：6份blob、5条SHA-256和完整inputs目录tree均匹配远端 `fb06aa50361cc8d5c7c6bacc40663722070f4130`。原包检查脚本实际exit0。

W01/W02历史约束不变；增量exit0与累计exit2的全仓执行按作者记录，主线未整套重跑。npm audit镜像404维持UNCONFIRMED；CI成功不等于依赖安全。

容器尝试访问完整仓库失败于DNS（curl exit6）。因此全量npm、实际Edge、Windows关闭／崩溃／BFCache不由主线冒领。完整源码通过GitHub连接器读取，有限执行与源指纹已保存。

## 7. T02：非阻塞TEST输出目录附记

`docs/engineering/world-integration/preplay/browser-owner/validation/run-browser-checks.mjs:3–4`仅比较path.resolve(out)与real repo字符串。临时Linux目录实测：仓库自身和直接子目录正确拒绝、真实外部允许；外部symlink实际指向仓库内时误允许。4项中3符合、1误放行，exit1，未运行浏览器且未触碰实际项目目录。

影响限定为运行器输出位置保护，不是游戏／存储漏洞，也不直接否定已归档的9组浏览器结果。下一UI长任务明确许可：仅将该runner目录预检／创建后复核接入已审T01 helper，保留其真实浏览器用例和旧结果；新UI runner也采用同一边界。不得扩成新文件系统框架或承诺抗恶意并发换链。

## 8. 下一步授权边界

正式顺序仍为基础→浏览器owner→低资产UI→准确SHA源码/浏览器/视觉实审→Owner自由首玩。可下发ENG-WORLD-LOW-ASSET-UI-001，采用受控DEV分支、独立namespace和Stage-First，不接商城／身体服务／第二委托，不决定O3，不迁移或清档，不推main/merge/force。

当前通过只针对受审SHA及上述范围。UI任务必要的只读参数说明可作技术窄补，但不得新增玩家知识、复制规则公式或让组件读取raw state。详见单独完整工程任务书。
