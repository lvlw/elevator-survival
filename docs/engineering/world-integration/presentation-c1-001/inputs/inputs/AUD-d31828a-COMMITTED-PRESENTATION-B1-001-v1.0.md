# ENG-WORLD-COMMITTED-PRESENTATION-B1-001：主线准确SHA实审

日期：2026-10-31
结论：**PASS（本批授权范围）／无需B1-R1返修**。

本结论只覆盖六类已提交combat动作的粗粒度安全直接返回、独立临时scope/token，以及本批限定测试与资料。不是B2逐击披露、生产动画播放器、正式美术采用、完整C/UI、Owner体验或发布批准。后续工程由新任务另行明确授权。

## 1. 精确对象与交付绑定

- 仓库：`lvlw/elevator-survival`。
- 分支：`feature/world-committed-presentation-b1-001`。
- 起点：`12186083a8791e26b4e87f21ab1767d3ae4e4a58`。
- 首提交：`f1ce08e539c65c82f86d503e7f13409d35644c29`；parent为上述起点；tree为`34b0f41557bb9ce89cc44c4ff44e588db058e397`。
- 最终：`d31828a74fcb1b2e28c0f070ad7f8fd3b3e87cc4`；parent为上述首提交；tree为`85ac8131fd81c106b781667b9db60d21fd6298e0`。
- 实际上传文件：`MAINLINE-REVIEW(5).zip`，709,512字节。
- 实测SHA-256：`22a327d5d1bf40dff131c9e15df806880737f9072c05f3d817d25ae3d3f7ce4d`。

主线读取了远端两个commit对象、最终根tree、当前分支列表、CI178/179运行元数据、CI179 job及完整原始日志。以上提交链不是只引用作者回执。

| 核验 | 主线实际结果 |
| --- | --- |
| 包结构 | 183个文件条目，CRC通过，无重复/大小写冲突/越界路径/符号链接 |
| manifest | 182份清单载荷及manifest自身，文件集合、长度、SHA-256一致 |
| 48份提交文件 | 实际字节重算Git blob、SHA-256和长度，41新增、7修改，均在白名单 |
| 原输入 | 14份与本轮原始任务ZIP逐字节一致 |
| 两份旧测试 | 仅许可的键集合各一处增加；原其他断言保留 |
| 治理摘要 | 仅许可的“初配金属管/外套”“快捷位绷带1”两项字面纠正 |
| patch | 逆向恢复准确7份旧文件，正向应用重得全部48份最终字节 |
| 受保护对象 | 同一3067条保护对象集合与实际变化文件共同重建起点和终点完整Git根树，均匹配远端；并核对首提交根树 |
| 第二次提交 | 10条变化仅属本批新增测试/fixture/文档；生产实现与两份旧测试相对首提交不变 |
| 远端refs | 当前32个head；原31个保持，新增仅B1分支。main和固定baseline未移动 |

完整性脚本记录265个校验谓词，它们不是265项游戏测试。3067条记录并非仅信任作者的`sameIndexObject`布尔值；将其对象路径/模式/摘要与本批实际blob组合重建完整已知根树，完成了对象绑定。不声称逐字节下载了3067份原文件或全部仓库。

完整diff --check的非零记录来自原字节归档输入已有的Markdown行尾空白。主线验证输入保全且新增非输入正文无此空白；没有清洗原件来制造全绿。

## 2. 生产源码审查

### 2.1 动作分类来自原命令，不是猜测

`player-facade.ts`继续一次调用原dispatch，沿原同步/错误路径完成后查询；新增`committedAction`只由已经严格解析的`CombatSessionCommand`的combat枚举映射。六类为basic-attack、signature、temporary-attack、defend、retreat、quick-use。拒绝或非combat不带该属性；移动导致入战仍不是战斗动作演出。

没有根据中文标签、opaque句柄形状、地点、HP差或Feed文案分类。新映射辅助不读取raw trace、内部实例、来源、随机或响应次数。

### 2.2 直接返回与通知/快照分离

controller在同步executeCaptured窗口获取正式纯query前态，取得本次正式执行结果，在原run成功返回后才签发`presentation`。查询、订阅busy/stable通知、snapshot、Feed、draft、confirm待确认、cancel、retrySave、synchronize、bootstrap及冷恢复不签发。

载荷显式重建：A的kind/visualKey/name、公开阶段前后、固定单条玩家发起动作、正式stop及本次保存反馈。null阶段不被解释为胜利或死亡；核心终局仍先发生，不等动画完成。

前态辅助query故障没有阻止原本明确请求的原执行。故障保留并在执行后走可见不确定错误；捕获时的业务类异常被局部转为程序异常，避免把已提交动作伪报为可重试的业务拒绝。原错误测试未被改成“动作未执行”。程序异常未被吞掉，也不补发遗漏演出。

### 2.3 独立临时scope/token

每个controller只有一个新建冻结空scope；不是随revision变化的选择器scope，不携带seed、execution、battle ID、时间或UUID。ordinal从0起，仅实际附加载荷时增加。保存失败照样可返回一次真实动作；retry只保存，不发新token，旧载荷的save-failed不被原地改成saved。

安全整数耗尽后停止附加呈现，不回绕、不阻止原提交。这是纯边界检查，不声称执行了超长原生动作序列。scope/token只按当前内存引用使用，不提供跨重载或序列化后的身份保证。

### 2.4 隐私和单记录边界

公开sequence恒一条，只表示玩家发起动作已经执行，不表示一击命中、一次敌方反击、伤害次数或零伤原因。原生两个敌方响应仍只输出一条。实际投影不遍历队列/trace，也不通过缺字段或长度编码隐藏分支。

原生同公开档不同隐藏值、不同内部身份/seed及同阶段不同敌HP的测试先验证全公开前后图相等，再比较完整载荷；正控保留公开敌组/阶段差异。额外私有字段与抛错getter验证没有复制/读取私有输入。所有嵌套载荷及token冻结。

### 2.5 消费和失权边界

本批生产BrowserOwner未改，headless测试证明直接结果透传；晚到返回、suspend/dispose、冷恢复新scope等由TEST消费者协议验证。真实已提交动作可在post-commit监听中失权后仍返回，这不应回滚玩法；未来真实UI必须检查当前owner/controls/消费generation并丢弃晚到呈现。

本批没有生产播放器。TEST消费者的去重、取消、skip/reduced-motion及假时钟不被记成真实浏览器演出通过。此责任明确移交后续C1。

## 3. CI178失败与修订是否可信

首提交CI178确实失败，作者保留24个新增对照失败及原日志。固定Windows采集的公开菜单顺序与Linux默认localeCompare顺序不同。最终修订没有修改生产排序、CI、核心或旧测试来迎合结果。

主线将新增fixture内的旧facade/controller函数体与逆向恢复的准确base原件比较：除了导出函数名，函数体一致。最终在同一环境分别执行旧实现和新实现，只剥离一个获准新增属性后比较完整字段、数组顺序、opaque引用拓扑及计数。原Windows捕获的current/存档摘要与计数继续核对，没有删掉旧样本或把新实现当自己的oracle；新增en/zh-CN正控证明排序差异确实存在且各环境内新旧等价。

因此本轮修订属于可信的TEST-only可移植性修复。CI178仍FAIL，不追改；最终准确SHA的CI179另记SUCCESS。两个提交的原始历史保持，不需要主线再退B1-R1。

## 4. 验证证据分账

| 层次 | 实际证据 | 证明范围 |
| --- | --- | --- |
| 作者开工 | 323文件/4725项，实际test:run | 本轮开工基线 |
| 作者新增 | 7个游戏测试文件/74项；另有两份fixture | B1原生/对照/隐私/生命周期/TEST消费/透传 |
| 作者组合 | 162文件/1723项，通过 | 包含原E03四路线及72默认样本，不与全量相加 |
| 作者最终默认check | 330文件/4799项，架构/类型/构建通过 | 本机最终源码；源摘要开始/结束一致 |
| 作者语义负控 | 四项独立变异检出 | 错误retry签token、响应数扩sequence、选择器scope复用、私有battle ID外泄；审读patch与AssertionError日志，不把语法/加载错误作检出 |
| 主线完整性执行 | 265个谓词通过 | ZIP、原输入、blob、完整Git树、patch和白名单；不是玩法测试 |
| 主线实际隔离执行 | 37个独立用例通过 | 直接运行交付两纯辅助及新/旧controller；周边imports/ports为明确测试替身，不是P/R/S全链 |
| 主线复跑作者工具 | 6项通过 | 交付完整性工具测试，单独记录，不加为新增游戏测试 |
| 独立回读CI179 | 330文件/4799项；310.40s；架构/类型/构建通过 | head准确为d31828a；读取了run、job和完整原始日志 |

主线没有本地重新运行4799项。完整仓库取得尝试受代理DNS解析失败阻断；现有运行环境Node22.16.0/TypeScript5.8.3只用于上述转译后隔离检查，不冒称与CI的Node24.22.1/npm11.19.1完全同环境。

主线未进行真实浏览器、图片像素/alpha边缘、Owner试玩或全部历史源码复审。作者原生零到期响应/无损动作，不等于已经证明每类已执行敌响应的零伤演出。当前参数不可达或仅纯schema覆盖的组合按支持矩阵保留，不造状态凑验收。

主线工具的初次本地TS加载路径写错（MODULE_NOT_FOUND）已经纠正后实际37项通过；这不是产品缺陷或语义负控检出。完整性脚本开发中的一次本地清单形状读取错误同样不计为产品缺陷。

## 5. 仍开放的门槛

1. CI179安装日志继续报告7项依赖告警：2 moderate、5 high；当前数量已有CI证据，但完整公告、可达性和修复方案仍未核清。不升级、不audit fix，不称dev-only安全。
2. 19个逻辑资产元数据风险（15个SVG换行绑定、4个共享代码源摘要滞后）、18背景原生2×、最终透明清稿和Owner观感继续开放。本批未改素材，也未关闭图像质量门槛。
3. 低资产UI R1、设计R2、readiness三阶段最终专项原件缺口继续按治理证据等级记录。可做后续新范围审查，但不补造历史完整PASS。
4. B2逐击敌响应/命中语义需单独批准知识与合同；本B1并非完整战斗时间轴。
5. 完整新UI/皮肤、Owner自由首玩及分段/九组合体验、O3旧槽/旧入口发布决定、商城/身体服务/第二委托均不由本次通过自动批准。

## 6. 接续决定

B1收口，无需作者重做A或B1。下一准确开发起点使用`d31828a74fcb1b2e28c0f070ad7f8fd3b3e87cc4`；不移动固定baseline或main。

主线另发`ENG-WORLD-PRESENTATION-C1-001`：仅在现有独立DEV低资产UI接入A当前对手名称与B1一次性动作反馈、生产临时消费生命周期及真实浏览器验证。使用现有中性占位与受限CSS，**不加载新图、不采用设计素材、不修改整套布局、不实现B2、不把这批叫最终战斗演出**。它是本次另行限定授权，不是从B1 PASS自动推导全面C权限。

## 7. 可核查入口

- Git对象：https://api.github.com/repos/lvlw/elevator-survival/git/commits/d31828a74fcb1b2e28c0f070ad7f8fd3b3e87cc4
- 父提交：https://api.github.com/repos/lvlw/elevator-survival/git/commits/f1ce08e539c65c82f86d503e7f13409d35644c29
- CI179：https://github.com/lvlw/elevator-survival/actions/runs/41197399114 （job124526232353）
- CI178：https://github.com/lvlw/elevator-survival/actions/runs/41194953853
- 工程记录：`docs/engineering/world-integration/committed-presentation-b1-001/` @最终SHA。
- 本报告配套小证据包仅含主线核验脚本/结果和来源选段，不重复原交付源包、旧图片或真实存档。
