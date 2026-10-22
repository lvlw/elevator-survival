# ENG-WORLD-LOW-ASSET-UI-001 完整工程任务书 v1.0

## 0. 目标、授权和准确基线

交付真正可操作的独立DEV新世界低资产界面：明确初选、五停点、当前场景与战斗、完整背包／药食／任务／维护操作、真实浏览器保存恢复及首玩材料。不是重开世界设计，不是再包一层战斗引擎，不以“查询可调用”代替UI操作验收。

- 仓库：`lvlw/elevator-survival`。
- 起点：`0ac23bc3654d69c3d0a6289d5d9e97ce30c69164`；父：`bc60f24cc16625a25ad56b0b917da63b16f29f56`；tree：`4bd8ee9a9466483b26a07e6f2a8f31b4b77879d0`。
- 新建：`feature/world-low-asset-ui-001`。不在旧browser/foundation/设计/main分支交付，不创建不必要worktree。
- 依据：Owner已确认D1/D2及顺序、DEC-049—053、当前有效UIR和正式low-asset-ui-contract-v1.0；基础及browser-owner已准确SHA实审通过。Owner既有任务下发授权适用；本包是本项实际工程授权，不需要再申请开工。
- 许可96条精确路径是最大集合，不要求全部创建；一次完成W1—W4，允许同名分支普通commit/push。停准确SHA的UI／保存接线／视觉实审，不自动开始Owner体验、公开发布或下一工程。
- 包内6件原字节归档到本任务inputs，原SHA与历史失败记录不重写。模型／推理配置由Owner在会话外设置，不是本任务要求。

## 1. W1：实查、交互设计和接缝清单

1. 实查HEAD、branch、status、index、untracked和仍运行命令；不reset/clean/stash覆盖。读取本包、实际AGENTS、docs/01/02/03/05、docs/09当前有效速查与UIR-010—012/015、preplay三契约及真实player/controller/browser代码。当前阶段不能被早期医院快照覆盖。
2. 默认执行`npm run test:run`建立真实基线；287文件/4554项只是上批作者记录。保留环境、命令、exit和失败，不设worker/NODE_OPTIONS/全局timeout来替代默认结果。
3. 写一份简明的操作—视图—参数—选择句柄—controller方法—验收表，覆盖所有已有正式命令，而不是只把成功路线用到的按钮做出来。Stage-First布局和常用操作动线在implementation-notes内定稿即可，不另开设计任务，不要求Owner逐字段指挥。
4. 先检视真实组件与资产。旧医院primitives/样式/图片可只读复用，不能复用其Store、New Run、Scene Time、旧感染终末或清档流程。缺素材用中性框、名称和可访问占位，不要求Owner先提供新贴图／音频；不得把其他敌人冒画为护工。
5. 现有player预览主要针对完整请求；如材料／数量／格位／工具等必要输入说明尚无公开DTO，本批允许第2节所列纯只读窄补。必须先记录实际缺口和来源，不能在组件硬编码配方、从raw current猜隐藏资格，或做成让玩家逐项试错的通用JSON表单。

## 2. W2：明确DEV入口、唯一owner与只读参数接缝

### 2.1 入口与旧医院隔离

仅许可修改`src/main.tsx`和`src/app/application-entry.ts`的分支选择／动态加载接缝。

- 新显式标志为`?dev-infected-world=1`，仅`import.meta.env.DEV`生效。新entry kind可命名`infected-world-playtest`；不改默认医院或生产行为。
- 既有`dev-ui-preview=1`优先级保持；两标志同时存在时保持既有preview入口，不创建两个composition。非DEV时所有这些标志均不激活新入口。
- 新分支须先于医院storage/bootstrap调用；新入口下不得扫描、读取、写入、导入或清理旧医院槽。既有静态模块若有副作用，优先在main的已许可加载接缝隔离，不改旧医院实现。
- 动态载入新UI；未点击新入口或非DEV不产生新namespace IO/锁/身份。环境标志是范围隔离，不是鉴权、防作弊或公开发布许可。
- 不改App、旧dev-playtest-shell、旧Reset或旧run-save。不提供新槽清空、导入、迁移、自动repair、重建或复制委托按钮。

### 2.2 React与唯一browser owner

使用真实已审`createInfectedBrowserOwner`及其安全snapshot/controls，单个可写页面只有一个有效owner；React组件不创建S/domain、Storage、锁或规则状态。React可以存展示状态和未提交草稿，但不能复制完整canonical。

必须处理当前StrictMode挂载／卸载／重挂，重复渲染、锁申请中的卸载和异步返回；不得将一次dispose过的owner当作仍可用，也不得在render里创建可写副作用。可使用`useSyncExternalStore`或等价稳定订阅，保留getSnapshot引用语义。窗口生命周期只交现有owner，不在组件另写保存或锁逻辑。

系统态与游戏态分开：idle/acquiring/occupied/unsupported/setup/loading/read-error/blocked/reservation-failed/ready/suspended/disposed不等于角色死亡。ready内部还必须检查preplay.status及PlayerView.status；投影失败旧按钮不可执行。现有current不能通过retryRead覆盖；可受控synchronize重建安全展示，不重新执行动作。

从占用／suspended恢复只提供明确重试获取独占；不能自动排队继续旧内存。旧controls、草稿、confirmation、selector失效后显示需要重选，不捕获后静默获取新句柄并重发。关闭/导航解除效果只操作自己的owner，不管理其他页面进程。

### 2.3 可选但明确许可的纯输入说明

允许新增`core/residence-supply/player-inputs.ts`、`content/infected-world-v0.1/player-ui-catalog.ts`和`state/residence-session/player-inputs.ts`及对应测试；允许player-preplay/types、preplay controller/types、browser owner/types仅增加只读说明的委托通路（例如`describeAction(actionHandle)`）。这是为完整UI参数输入服务的最小技术补充，优先不改已有返回形状；不是改规则、资格、安全三态、保存或锁生命周期。

- 只对当前已公开动作及真实opaque绑定返回必要字段形状、公开选项／名称、已批准声明的材料需求、产出几何、显式数量／格位／目标／分配约束。初选目录可读静态已批准公开内容，但不为了展示Setup提前造角色、policy、S或初配。
- 同源引用正式content/config和现有纯校验；不在新helper复制玩法公式或硬编码第二套配方数值。UI只组合完整PlayerRequest，最终资格／安全仍由已审inspect与execute判断。
- 不新增未发现来源、远端实时状态、隐藏医疗目标、风险百分比、精确敌HP／CTB、未来抽签或感染答案。未完成请求不通过试跑producer/resolver求结果。
- 读说明、Hover、Focus、输入编辑及取消零dispatch、零IO、零规则／随机／签发／消费。不生成含seed/execution/origin的选择器；旧scope、克隆及跨会话句柄拒绝。参数候选不得自动选第一件／最大数量或自动替换材料。
- 只可额外公开本次已获准当前动作的必要参数说明，不将研究得到的隐藏规则解释当作默认公开知识。真正改变玩家知识或玩法的问题，报告精确冲突并停止相关项。
- 不改变现有PlayerView、PlayerPreview、PlayerRequest、writer或controller状态语义，不动S、domain、v4、P/R/G1/G2；全部既有测试原字节保留。必要接口扩展在本批准确SHA实审，不以“UI代码”免审。

## 3. W3：完整低资产界面与分级交互

### 3.1 主舞台、五停点和信息层级

以当前有效UIR与正式UI合同为准：中央房间／战斗舞台是主体；桌面主要决策无需整页滚动。详细物品、日志可局部滚动，不裁掉必要控件或缩小字伪装一屏。窄屏按合理堆叠降级，必要操作与文字完整可达；不要求另做移动端产品。

- 无档Setup：三工具×三专长，明确选择后确认创建，不默认提交、不自动出发。初配后只显示锁定结果。
- first-hub：真实初配、当前身体与出发说明；已有初配不能改选／补发。
- stable-active：当前房间、已知地图、真实任务来源／地面、只执行单边移动的Travel Cluster；地图只读，不另造快捷移动或全图开门入口。未发现节点/来源不凭背景图或文字透出。
- battle-decision：三敌真实对应的公开意图、阶段、当前相对顺序，玩家动作／快捷药和战斗日志。无精确敌HP、连续生命百分比或raw CTB；无战中背包整理、隔空药食或移动跳战。
- living-hub：成功、主动失败、期限失败分别展示真实结算与保留实物；无后继就是静态中枢，不自动补一夜／治疗／出发。
- dead：真实HP0终局，不复活或重接同委托，不照搬旧医院New Run/Reset。四终局、双方归零／敌仍活死亡的存档含义保持。

当前病程只显示安全DTO给出的四档及机制文案；最低档不得叫健康／无感染／安全，最高档不得叫自动死亡。隐藏医疗资格Preview继续unknown。对not-guaranteed解释为未证明必死／存在非死亡分支，不直接标“安全”。

### 3.2 真实物品与完整请求

装备／背包切换，真实6×4 footprint与两个快捷位常驻。物品图片缺失有中性占位；数量>1才角标；详情可Focus/键盘访问。背包／快捷右键菜单及键盘等价入口，其他场景就地操作，不把右键推广为所有操作唯一入口。

覆盖已实现的来源搜索／打开结果／重开结果；普通pickup/drop、move、split、merge、to-quick/to-backpack；任务件取得／留置／拾取；任务方案、交易多输出格位、安装材料；六类战外药食与明确伤口／挫伤目标；机械单总池分配、外套／工具箱维护、充电及真实材料。只显示已有正式装备操作，不顺带实现换装或新仓库。

搜索成功后自动展开当前公开结果；重开只读，不重搜、不补物。普通已揭示整实例拾取可在明确点击后，按未旋转row-major（y后x）逐格用安全Preview寻找首个合法锚点；只形成一次正式请求。无位置才进入手动格位／旋转；不自动重排、合并、拆堆、补快捷或旋转。任务取得／任务搬运／交易／安装不扩展此便利。不得套旧医院“优先堆叠”规则改变新P的整实例语义。

格位、旋转、数量、源／目标、材料和池分配都显式；必要参数选择用L2，不额外叠通用确认。当前界面必须能读到需要什么和实际会支付什么，而不是只报“不可用”。若安全接口只能给unknown，明确显示未知，不用隐藏事实填空。

### 3.3 确认、失效与防重复

L0读取零副作用；L1完整普通请求一次执行；L2补缺参数；L3沿用主动返回、截止、关键物留置和基础工程已有动态必死保护。具体是否需要保护由controller的正式metadata决定，不在组件重判死亡、奖励或费用，不套全动作统一Modal。

确认绑定原请求／scope和关键安全事实；发生新current、阶段、战斗、恢复、失锁后旧草稿/确认不能误执行。仅retrySave的同current不悄悄换对象。取消不执行；双击／回调重入不能产生第二dispatch或写入。过期请求不能通过“刷新再试一次”变成新动作。

### 3.4 保存、错误、Feed和隐私

ready+save-failed显示“操作已生效，尚未保存”，保留最新内存；提供只保存的明确重试，并说明刷新可能丢失尚未持久化进度。孤立初始化占用、坏档、读取异常、失锁分别呈现，不伪装空档或角色死亡。无自动清理/回滚/恢复新初配。

Feed委托既有session-local安全Feed；UI可显示最近六条和局部历史，不另建持久化事件真相或从raw commit补隐藏结果。恢复只说明恢复当前状态，不重演动作。明确普通业务拒绝、投影问题和程序异常；不吞AssertionError或任意code异常，不向玩家展示内部stack/identity。

DOM、aria、title、data-*、React调试文案、排序和图标与同档非干涉一致；不展示seed/execution/origin/真实item或wound ID。不为了debug在新玩家界面嵌raw state控制台。只读测试观察端可在独立TEST页面存在，不注册至正式DEV玩家入口。

## 4. W4：原生、真实浏览器、视觉和交付

### 4.1 U01—U10（完整验收，非截图占位）

| Gate | 最低实际证据 |
| --- | --- |
| U01 | DEV明确入口／非DEV忽略参数／默认医院和旧preview保持；冲突参数优先级明确；StrictMode、重复挂载、卸载再入单owner |
| U02 | 九组合明确初选，Setup读零身份／发物，reservation先行；first-hub锁定／出发；五停点与系统错误各自正确 |
| U03 | 当前场景／已知只读地图／单边导航／任务来源；搜索重开不重播，隐藏来源不泄露 |
| U04 | 真实网格、菜单、first-fit边界、数量／旋转／拆合／快捷／任务件／多材料和多输出位置；不自动替代 |
| U05 | 六类战外医疗、机械总池／维护充电、目标拒绝、样本护具支付；unknown与正式执行分开 |
| U06 | 三敌真实战斗、快捷用药、末次资源／E0、退却→立即维修→休整→原敌再入；完整成功及四终局 |
| U07 | L0—L3、动态确认、取消／双击／回调再入／旧selector草稿确认失效；同current重试意义保持 |
| U08 | 真浏览器首建、五停点刷新／继续、写失败保内存、最新重试／最后durable、占用页／失锁／BFCache显式恢复；无重放 |
| U09 | 同档／相反抽签／同敌阶段非干涉覆盖安全DOM、aria、title、选项／错误；程序异常不吞；键盘操作与焦点 |
| U10 | 默认全量、原E03四路线/72样本、旧测试保护、真实DOM长链、视口截图、console、T02及完整材料 |

至少A成功链和B分段／止损链通过**实际React控件与DOM事件**完成，不从页面脚本直接调用owner.execute/route helper代替交互。A从新独立TEST profile真正空档至真实任务材料／安装／样本／H0成功；三敌组合至少覆盖真实动作和再入，不清敌或手设completed。B真实取得材料→退却→立即维修→医疗→休整→原敌再入→合法终局；插入真实刷新和保存故障。

可在独立TEST harness中注入已声明的环境seed复现路线；默认玩家入口仍使用真实受控crypto，不提供seed输入、作弊或调参开关。保留默认RNG，不覆盖draw输出求通关。九组合创建用独立隔离profile或TEST槽数据，不新增玩家Reset。低HP／Day7／两类死亡可用明确标注、经完整聚合验证的TEST checkpoint作补充，不冒充空档主链。

完整记录一次点击的dispatch、resource use、current、checkpoint尝试与原生通知；首次确认额外reservation写单列。Hover/Focus/菜单/地图/编辑/取消统计零玩法与IO（真实应用bootstrap读盘另计）。retry/cold/双标签与当前owner回归保持，不为显示多写一次。

### 4.2 真实浏览器与视觉证据

沿用当前实际可用浏览器／独立临时profile/CDP，不接管Owner正常浏览器或存档，不崩溃其他页面。使用已批准新DEV路径测试，不把旧browser-harness按钮当作游戏UI。故障注入放独立TEST包装层，与真正OS配额／权限耗尽分栏。

记录至少桌面1366×768和1600×900、窄屏390×844；检查主动作可见、无遮挡／裁切、必要信息可读、菜单/Tooltip/确认层边缘、键盘Focus可达、整体不成为长列表开发台。截图必须实际渲染，不合成，不把只测bounding-box当美术或体验通过。

准备8—12张代表截图（Setup、first-hub、稳定房间／已知地图、背包格位与输入、战斗、保护确认、保存失败、静态中枢／死亡、窄屏），按需要覆盖可用状态而非机械凑数。保留截图对应提交/被测指纹、视口、场景和测试来源。截图可仓库外保存。

生成仓库外`ENG-WORLD-LOW-ASSET-UI-001-UI-REVIEW-ASSETS-v1.0.zip`，只含必要PNG、browser-results、视觉审阅说明和摘要，不打包profile/存档/浏览器二进制。完成报告给出确切路径，便于Owner把此ZIP与报告一并贴回WebGPT；不能杜撰远端下载链接或“人工已验收”。

### 4.3 T02非阻塞工具小修（本批一并完成）

明确许可只窄改上批docs/browser-owner/validation/run-browser-checks.mjs的输出目录预检和创建后复核，并在原README末尾附记。实际浏览器用例、断言、结果处理和历史9组记录不改。

复用只读的已审`docs/design-drafts/world-infected-001/entry-006/validation/output-path-guard.mjs`：planProbeOutput在任何mkdir/log/profile/spawn之前，mkdir后recheckOutputDirectory，真实解析异常保守拒绝。新UI runner使用同一原则；不再复制字符串startsWith或relative.startsWith('..')版本。

仓库外副本复现外部symlink／Windows junction回仓库的误放行，修后验证仓库自身/直接子目录/..probe/真实外部/别名回仓库/悬空链接/缺失子目录。实际平台、路径计算和注入权限故障分栏；不承诺抵挡恶意并发换链。负控恢复旧判断应语义检出，原浏览器程序后缀字节保持。T02不计新增玩法测试。

### 4.4 默认检查与语义负控

执行实际默认基线、定向新测试、跨controller/browser/player组合、全部默认`npm run check`。原75/43基础、67browser、E03四路线/72固定样本及全部旧测试/helper不删除、不放宽。新完整DOM长链可单个新用例30000ms，逐处记录；不改旧/全局timeout、worker、依赖或CI。

至少三类仓库外语义负控：泄露隐藏身份/病程→DOM非干涉断言失败；旧确认或双击复发→计数/状态断言失败；非DEV或锁失败仍触发新初始化/IO→隔离断言失败。逐类恢复后复跑；AssertionError和具体用例/exit留证，类型/导入/fixture/超时不算检出。不要为了制造负控改正式参数。

代码/测试/运行时资产指纹、暂存及最终blob相同；保留失败修订与原发现，不挑一次绿灯覆盖失败。依赖审计404仍UNCONFIRMED，不npm audit fix或因CI绿灯称安全。

## 5. 范围、文档与停止

只许可清单内路径。8份旧src宿主分别只有入口动态接线，或只读参数描述的最小委托；不得以此修改current/锁/保存/安全/确认/提交语义。其余旧生产与测试/helper只读。新UI/styles必须局部作用，不能改全局样式破坏医院。无需创建所有候选文件或通用SDK/设计系统。

5份共享文档只追加作者实现附记；docs/09不新增UIR或改变已确认分级。browser旧runner/README只作T02。所有正式合同/DEC/UIR/参数/content定义、S/domain/R/v4/P/G1/G2、旧入口语义、依赖/CI保留。

W01原两文件七处与W02原任务书第249行EOF仍保留精确例外：本UI起点增量原始exit0；ff2b79f以来仅W02 exit2；8c19ca0以来W01+W02八处exit2。不得排除inputs、改检查配置、删除原件或再造W03。本包任何新原件冲突先报告，不自改。

建议提交`feat(ui): add isolated infected-world playtest interface`。普通commit/push仅`origin feature/world-low-asset-ui-001`；不main/merge/force/amend，不自动下一批。完成报告含完整SHA/parent/tree、基线/新增替换删除净增、U01—U10、必要说明接缝实际范围、两真实DOM链、浏览器/视觉/IO/负控/T02、保护对象、W01/W02、CI、所有NOT RUN和截图ZIP确切路径。

另给Owner首玩指南：实际启动命令与DEV地址格式、适用浏览器、如何使用独立测试profile且不触碰旧槽、已实现操作、保存限制、何时停止反馈。不要求Owner手算或用控制台发命令。首轮自由首玩不要塞最优路线；对照一次完成／合理撤退／主动分段／连续分段留作随后体验审查。

自动/源码/截图审查不等于Owner体验；当前仍未批准O3、发布、迁移/清档、永久双入口、商城/身体服务、第二委托或新玩法。任何未跑浏览器Gate不得包装COMPLETE，通过准确SHA实审前不宣称可以正式交付Owner首玩。

## 6. 精确路径许可（96条）

1. `src/main.tsx`
2. `src/app/application-entry.ts`
3. `src/state/residence-session/player-preplay.ts`
4. `src/state/residence-session/player-preplay-types.ts`
5. `src/app/infected-preplay/controller.ts`
6. `src/app/infected-preplay/types.ts`
7. `src/app/infected-browser/owner.ts`
8. `src/app/infected-browser/types.ts`
9. `src/core/residence-supply/player-inputs.ts`
10. `src/core/residence-supply/player-inputs.test.ts`
11. `src/content/infected-world-v0.1/player-ui-catalog.ts`
12. `src/content/infected-world-v0.1/player-ui-catalog.test.ts`
13. `src/state/residence-session/player-inputs.ts`
14. `src/state/residence-session/player-inputs.test.ts`
15. `src/state/residence-session/player-input-privacy.test.ts`
16. `src/app/infected-preplay/input-descriptions.test.ts`
17. `src/app/infected-browser/input-descriptions.test.ts`
18. `src/ui/infected-world/index.ts`
19. `src/ui/infected-world/app.tsx`
20. `src/ui/infected-world/use-browser-owner.ts`
21. `src/ui/infected-world/view-model.ts`
22. `src/ui/infected-world/types.ts`
23. `src/ui/infected-world/labels.ts`
24. `src/ui/infected-world/assets.ts`
25. `src/ui/infected-world/styles.css`
26. `src/ui/infected-world/interaction.ts`
27. `src/ui/infected-world/first-fit.ts`
28. `src/ui/infected-world/request-draft.ts`
29. `src/ui/infected-world/components/game-shell.tsx`
30. `src/ui/infected-world/components/world-stage.tsx`
31. `src/ui/infected-world/components/battle-stage.tsx`
32. `src/ui/infected-world/components/setup-panel.tsx`
33. `src/ui/infected-world/components/hub-panel.tsx`
34. `src/ui/infected-world/components/status-hud.tsx`
35. `src/ui/infected-world/components/travel-cluster.tsx`
36. `src/ui/infected-world/components/knowledge-map.tsx`
37. `src/ui/infected-world/components/inventory-panel.tsx`
38. `src/ui/infected-world/components/item-tile.tsx`
39. `src/ui/infected-world/components/context-menu.tsx`
40. `src/ui/infected-world/components/action-strip.tsx`
41. `src/ui/infected-world/components/action-form.tsx`
42. `src/ui/infected-world/components/placement-picker.tsx`
43. `src/ui/infected-world/components/material-picker.tsx`
44. `src/ui/infected-world/components/medical-picker.tsx`
45. `src/ui/infected-world/components/maintenance-picker.tsx`
46. `src/ui/infected-world/components/confirmation-layer.tsx`
47. `src/ui/infected-world/components/details-popover.tsx`
48. `src/ui/infected-world/components/terminal-panel.tsx`
49. `src/ui/infected-world/components/persistence-banner.tsx`
50. `src/ui/infected-world/components/feed-panel.tsx`
51. `src/ui/infected-world/components/system-screen.tsx`
52. `src/ui/infected-world/entry.test.ts`
53. `src/ui/infected-world/setup.test.tsx`
54. `src/ui/infected-world/phases.test.tsx`
55. `src/ui/infected-world/inventory.test.tsx`
56. `src/ui/infected-world/first-fit.test.ts`
57. `src/ui/infected-world/parameters.test.tsx`
58. `src/ui/infected-world/medical-maintenance.test.tsx`
59. `src/ui/infected-world/combat.test.tsx`
60. `src/ui/infected-world/terminal.test.tsx`
61. `src/ui/infected-world/confirmation-stale.test.tsx`
62. `src/ui/infected-world/browser-binding.test.tsx`
63. `src/ui/infected-world/privacy.test.tsx`
64. `src/ui/infected-world/accessibility.test.tsx`
65. `src/ui/infected-world/presentation.test.tsx`
66. `src/ui/infected-world/longchain.integration.test.tsx`
67. `src/ui/infected-world/faults.test.tsx`
68. `src/ui/infected-world/route-test-fixtures.ts`
69. `src/ui/infected-world/test-fixtures.tsx`
70. `src/ui/infected-world/test-observers.ts`
71. `docs/03-architecture.md`
72. `docs/08-rule-implementation-traceability.md`
73. `docs/09-ui-design-record.md`
74. `docs/design-drafts/world-infected-001/10-decision-queue.md`
75. `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
76. `docs/engineering/world-integration/preplay/browser-owner/validation/run-browser-checks.mjs`
77. `docs/engineering/world-integration/preplay/browser-owner/validation/README.md`
78. `docs/engineering/world-integration/preplay/low-asset-ui/completion.md`
79. `docs/engineering/world-integration/preplay/low-asset-ui/implementation-notes.md`
80. `docs/engineering/world-integration/preplay/low-asset-ui/contract-and-support.md`
81. `docs/engineering/world-integration/preplay/low-asset-ui/verification-results.json`
82. `docs/engineering/world-integration/preplay/low-asset-ui/browser-results.json`
83. `docs/engineering/world-integration/preplay/low-asset-ui/visual-review.md`
84. `docs/engineering/world-integration/preplay/low-asset-ui/owner-playtest-guide.md`
85. `docs/engineering/world-integration/preplay/low-asset-ui/validation/browser-harness.html`
86. `docs/engineering/world-integration/preplay/low-asset-ui/validation/browser-harness.ts`
87. `docs/engineering/world-integration/preplay/low-asset-ui/validation/browser-cases.ts`
88. `docs/engineering/world-integration/preplay/low-asset-ui/validation/run-browser-checks.mjs`
89. `docs/engineering/world-integration/preplay/low-asset-ui/validation/check-output-boundary.mjs`
90. `docs/engineering/world-integration/preplay/low-asset-ui/validation/README.md`
91. `docs/engineering/world-integration/preplay/low-asset-ui/inputs/ENG-WORLD-LOW-ASSET-UI-001-task-v1.0.md`
92. `docs/engineering/world-integration/preplay/low-asset-ui/inputs/OWNER-authority-and-scope-ENG-WORLD-LOW-ASSET-UI-001-v1.0.md`
93. `docs/engineering/world-integration/preplay/low-asset-ui/inputs/AUD-0ac23bc-ENG-WORLD-BROWSER-OWNER-001-review-v1.0.md`
94. `docs/engineering/world-integration/preplay/low-asset-ui/inputs/BASELINE-AND-INPUTS.json`
95. `docs/engineering/world-integration/preplay/low-asset-ui/inputs/verify-task-package.py`
96. `docs/engineering/world-integration/preplay/low-asset-ui/inputs/SHA256SUMS.txt`
