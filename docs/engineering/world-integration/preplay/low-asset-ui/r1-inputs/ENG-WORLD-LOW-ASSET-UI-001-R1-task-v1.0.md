# ENG-WORLD-LOW-ASSET-UI-001-R1 完整限定返修任务书 v1.0

## 0. 目标、起点与执行权

一次收口低资产界面首玩前的三个交互问题与一项保存文案小修。保留现有Stage-First布局、同源规则、真实背包/CTB、controller/browser owner和两条DOM路线；不是重开世界设计、重新制作美术或改游戏难度。

- 仓库：`lvlw/elevator-survival`。
- 准确起点：`2e3d13a52ada1fdcd9848574e918b97db43cb0c2`；起点父提交：`0ac23bc3654d69c3d0a6289d5d9e97ce30c69164`；tree：`8673c1c7a7492756c2c686de18a268321b37668b`。
- **沿用** `feature/world-low-asset-ui-001`，继续原工程会话，不新建分支或不必要worktree。
- 本包依据Owner既有任务下发授权及已批准低资产UI契约下发；允许一次完成W1—W4及同名分支普通commit/push，不逐步骤申请开工。
- 最大许可66条精确路径，不要求全部创建。原96路径不自动全部延续；以本包清单和更窄语义限制为准。
- 本包9件原字节归档到`docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs`。两个内嵌ZIP在档案目录保留原字节；只在仓库外解压供审阅，不把其中大量原件再次散落写入仓库。

## 1. W1：实查与修前真实复现

核对HEAD/branch/status/index/untracked/仍运行命令、AGENTS、正式UI契约、docs/09当前有效UIR-010/015、DEC-052/053及实际安全查询、controller和browser接口。保留已完成实现和失败记录；不reset/clean/stash或覆盖。

先默认执行`npm run test:run`，记录真实环境、时间、exit。309文件/4650项是历史参考，不是本轮基线。不得以worker覆盖、全局timeout或忽略失败替代默认结果。

先阅读原截图ZIP全部12张和合并实审报告。按REPRODUCTION-AND-ACCEPTANCE规格加入真实DOM修前回归。保留修前失败和本轮最小fixture适配；导入/类型/fixture/超时不是语义检出。隔离脚本只提供定位，不要求新实现保留某个onFocus属性或特定组件名来迎合旧脚本。

在implementation-notes追加短的“发现→来源→修复路径→测试”表，自主选局部实现。确需新玩法/隐藏知识/生命周期变化才停止相关项报告精确冲突；普通文案、布局和测试问题在本范围内自查修订。

## 2. W2：UI-01行动前只读说明与UI-02公开文案

### UI-01：L0可访问说明，L1仍一次执行

对当前完整的普通动作提供独立可读、可关闭的正式费用、公开资源/材料支付和已有机制说明。优先使用锚定Hover/Focus、就近详情入口或可访问的说明层；不能让Hover/Focus成为执行前置，不把所有行为加一次确认。

完整请求读取当前controls.preview；输入未齐用controls.describeAction及已有公开目录说明缺什么，不能偷偷填工具、材料、数量、目标或格位。禁止试跑producer/resolver、先execute再丢结果、读取raw current、Storage、隐藏值或在React计算费用。

覆盖来源、无参数任务/调查、移动、战斗和可用的终局/休整入口。已显示的移动费用与战斗资源不删除；参数表单与保护确认保留SafeFacts。多方案动作在说明/参数/确认中保留已选方法及目标的可辨认信息，不让谨慎/直接到下一层只剩同名标题。

L0打开/切换/Focus/关闭零dispatch、零current替换、零写入、零随机/签发/消费；不写第二份事实缓存。上下文或opaque变更时旧说明/草稿/确认必须失效，禁止自动刷新句柄后重发。保存retry同current不无故更换目标。异常处理不吞任意程序异常，不以读取错误自动重试规则。

说明与菜单需在桌面边缘及390px可访问，不遮掉唯一取消/主要控件；键盘可访问和返回焦点。具体视觉可自主设计，不重排整个游戏Shell。

### UI-02：已批准能力应让玩家读懂

集中修`player-ui-catalog.ts`的三工具/三专长说明，去掉“正式……方案”“提供已批准的……差异”这类只有工程含义的占位表达。给出具体受益行动/实际效果及适用边界；文案逐条引用现行批准来源。只解释已有能力，不新增或扩大效果，不预告隐藏地点/来源/未来结果，不把局部优惠泛化成所有行动优惠。涉及数字直接引用已有配置/内容；没有依据则不写精确数字。

为已公开的`component`、`module`及核查到的同类公开占位词建立集中Presentation映射，优先使用正式稿已有中文名称。覆盖菜单、地面、携带详情、材料/目标选项、结果摘要、title与aria。可以在现有content展示catalog和UI labels适配，不改领域definition/instance/name原事实、选择器生成、保存或内容参数；不要为了改显示字去改P的item catalog。

同一公开对象仍靠原opaque引用操作，不靠中文名称重新找第一件或猜物品身份。非药食/任务件的公开名称不是新的隐藏知识；对真正未公开的内容不补名。不制作新资产，不依房间或别名猜敌人图片；已批准中性占位保持。

## 3. W3：UI-03对象菜单与V01保存说明

### UI-03：对象菜单与实际对象一致

修复InventoryPanel对任何背包物品添加medical的问题。采用现有安全describeAction的输入候选及opaque引用建立适用性，不硬编码一份药品名称表/临床公式，也不执行Preview/规则去试出隐藏医疗目标。

非药食材料与任务模块不再拥有以其为对象的“使用药食”。确有帮助的不可用说明可以只读展示，但不能提供误导的可执行入口。通用“药食与维护”入口仍可另选合法药食；上下文入口保留原明确选中的合法实体，不静默换到其他药。

保留普通移动、任务件留置、快捷与背包合法转换、数量/格位/伤口/材料的显式输入。战斗携带区继续只读；隐藏消毒/抑制目标的菜单与说明不得因是否存在隐藏目标而变化，沿用unknown。克隆/跨session/冷恢复/已消费/已拆合/移动后的旧选择继续拒绝。

本轮不必改core/player-inputs、facade或controller：现有describeAction输入列表已可提供绑定依据。若实际发现该接口还缺必要公开事实，先给出精确冲突，不擅自扩大到core/state/app路径。

### V01：只改状态表述，不改持久化

`not-attempted`是本次会话尚无写入尝试，不等于不存在已成功加载checkpoint。修正孤立“尚未尝试保存”的含混文案，采用准确会话级中性表述；只有已有可靠安全状态确证时才写“已恢复”。不能把枚举改saved、自动写一次或读Storage来让文案变绿。

save-failed继续明确“已生效未保存”和刷新风险；retrySave只存最新状态。未发生任何玩法的读取/文案变化不得新增dispatch/写入或Feed玩法记录。

## 4. W4：默认检查、浏览器截图、负控与交付

### 4.1 测试范围与明确的旧测试更新许可

原有96项新增UI测试及更早全部验收意图保留。**本包列出的既有UI测试和route-test-fixtures允许必要的公开文案断言、DOM查询及新增只读入口/菜单定位更新**；不得删除测试、降低数据/金额/次数断言、改seed/策略、跳过真实DOM事件或把expect换成宽松匹配掩盖错误。逐项记录旧断言/定位为何变化、是否同等或更强。语义修订了错误旧断言须明确记录，不能仍宣称所有旧测试原字节不变。

其它core/P/R/S/恢复/锁/保存/旧医院/E03测试和helper仍原字节保护。原E03四路线、72固定样本策略不改。原两条真实DOM链继续实际运行；因新显示名改driver只能映射同一公开对象，不直接调用owner.execute绕过控件，不自动选择首材料/首伤口。

新增回归包含：UI-01无参数动作可独立查询且匹配正式metadata；参数不足不试跑；setup零身份/发物/IO；所有人类可见名称一致；非药食菜单正反例与实际实体绑定；隐藏感染/相反抽签菜单和说明非干涉；取消/旧选择/失锁；V01冷恢复/保存失败/retry计数；方法名清楚且确认仍绑定原请求。

至少两类仓库外语义负控并逐类恢复。真实AssertionError、case ID和exit留证，类型/导入/fixture/超时不计检出。已有负控无须全数重跑，未重跑写NOT RE-RUN，不累加为新增生产测试。

默认执行定向、新旧组合、`npm run check`。只允许本批新增完整DOM长链单项30000ms；不得改任何旧/全局timeout或worker，遇到保护旧测试超时保留准确结果，不擅自放宽。

### 4.2 真实浏览器与视觉证据

在独立临时测试profile继续真实Edge/可用浏览器验证，不接触Owner存档。原七组场景及A/B DOM链、保存/刷新/同分区占用/BFCache责任保持；新增改动通过真正React控件事件验证。禁止用隔离context代替同分区竞争、用headless字串端口冒充真实浏览器IO。

新增鼠标Hover/键盘Focus/只读详情打开关闭计数、选择失效、非药食和合法药食菜单、冷恢复提示。浏览器控制调用与原生S计数分栏；读到描述不等于写入成功。

提供8—12张本R1实际截图，覆盖1600×900、1366×768、390×844。必须包含初选具体说明、完整普通行动L0、战斗L0、任务物中文菜单且无误导medical、合法药食/参数、恢复文案、save-failed；窄屏至少实际打开新的说明与必要参数/菜单，不能只用初选/终局替代。保留样本护具支付与显式格位对照。所有新图需逐张实际查看，记录遮挡/焦点/视口和剩余限制，不要求最终美术/新图片。

生成仓库外 `ENG-WORLD-LOW-ASSET-UI-001-R1-UI-REVIEW-ASSETS-v1.0.zip`，含新PNG、浏览器结果、逐图核查、manifest、被测运行时指纹和摘要。不要打包profile/存档。给Owner确切路径、大小、SHA256。作者交付与主线/Owner验收分别记录。

### 4.3 文档、完整性与Git

原5份共享文档和5份作者报告只末尾追加，保留先前COMPLETE/原发现/原素材说明及源阶段报告，不追改历史。新增R1验证与浏览器结果放独立r1目录；旧JSON不覆盖。原任务及所有输入原件只读，本包9件原字节归档。

本R1起点增量diff-check必须原始exit0；历史ff2b79f起点仍仅W02一处，8c19ca0累计仍W01七处+W02一处，真实exit2保留。不得排除inputs或修改检查配置。新增任何原件冲突先报告，不自行制造W03。

核对范围、批准合同/参数、保护对象、append-only前缀、UTF-8、链接、已测试/暂存/最终blob一致。依赖维护仍独立：CI166摘要6项告警与本机audit404分开，不audit fix、不升级、不将绿灯说成安全。

允许普通commit及push到同名分支。建议提交 `fix(ui): explain actions and bind contextual choices`。不amend、不merge、不push main/其他分支、不force。

交付最终完整SHA/parent/tree、实际基线/新增/替换/删除/净增、R01—R04与U01—U10对应、文案来源、旧测试定位变更理由、两个真实DOM链、L0/执行/retry独立计数、负控、浏览器/截图/所有NOT RUN、完整检查和准确SHA CI实际状态。

停止等待主线准确SHA源码/浏览器/视觉复审，不自动进入Owner体验、发布或下一工程。

## 5. 范围外与不可自动升级的授权

不改src/app、src/state、任何core生产代码、入口分流或main；不改P/R/S/domain/v4/G1/G2、隐藏知识、安全三态、确认/提交/保存/锁语义；不改正式DEC/UIR/数值/内容定义/依赖/CI。docs/09仅附记，不产生UIR编号。只改content的公开Presentation catalog。

不新增新玩家任务、商店/身体服务、重开/清档/迁移、永久双入口或O3。低资产占位许可保持，不因为UI修复升级成新美术/音频任务。不能从本包推导下一批授权。

## 6. 精确路径许可（66条）

1. `src/content/infected-world-v0.1/player-ui-catalog.ts`
2. `src/ui/infected-world/app.tsx`
3. `src/ui/infected-world/labels.ts`
4. `src/ui/infected-world/styles.css`
5. `src/ui/infected-world/components/game-shell.tsx`
6. `src/ui/infected-world/components/world-stage.tsx`
7. `src/ui/infected-world/components/battle-stage.tsx`
8. `src/ui/infected-world/components/travel-cluster.tsx`
9. `src/ui/infected-world/components/setup-panel.tsx`
10. `src/ui/infected-world/components/hub-panel.tsx`
11. `src/ui/infected-world/components/status-hud.tsx`
12. `src/ui/infected-world/components/inventory-panel.tsx`
13. `src/ui/infected-world/components/item-tile.tsx`
14. `src/ui/infected-world/components/context-menu.tsx`
15. `src/ui/infected-world/components/action-form.tsx`
16. `src/ui/infected-world/components/confirmation-layer.tsx`
17. `src/ui/infected-world/components/terminal-panel.tsx`
18. `src/ui/infected-world/components/persistence-banner.tsx`
19. `src/ui/infected-world/components/action-information.tsx`
20. `src/ui/infected-world/components/details-popover.tsx`
21. `src/ui/infected-world/menu-options.ts`
22. `src/content/infected-world-v0.1/player-ui-catalog.test.ts`
23. `src/ui/infected-world/setup.test.tsx`
24. `src/ui/infected-world/inventory.test.tsx`
25. `src/ui/infected-world/accessibility.test.tsx`
26. `src/ui/infected-world/parameters.test.tsx`
27. `src/ui/infected-world/medical-maintenance.test.tsx`
28. `src/ui/infected-world/privacy.test.tsx`
29. `src/ui/infected-world/presentation.test.tsx`
30. `src/ui/infected-world/faults.test.tsx`
31. `src/ui/infected-world/combat.test.tsx`
32. `src/ui/infected-world/terminal.test.tsx`
33. `src/ui/infected-world/confirmation-stale.test.tsx`
34. `src/ui/infected-world/longchain.integration.test.tsx`
35. `src/ui/infected-world/route-test-fixtures.ts`
36. `src/ui/infected-world/review-action-information.test.tsx`
37. `src/ui/infected-world/review-public-copy.test.tsx`
38. `src/ui/infected-world/review-context-menu.test.tsx`
39. `src/ui/infected-world/review-persistence-copy.test.tsx`
40. `src/ui/infected-world/review-information-purity.test.tsx`
41. `docs/03-architecture.md`
42. `docs/08-rule-implementation-traceability.md`
43. `docs/09-ui-design-record.md`
44. `docs/design-drafts/world-infected-001/10-decision-queue.md`
45. `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
46. `docs/engineering/world-integration/preplay/low-asset-ui/completion.md`
47. `docs/engineering/world-integration/preplay/low-asset-ui/implementation-notes.md`
48. `docs/engineering/world-integration/preplay/low-asset-ui/contract-and-support.md`
49. `docs/engineering/world-integration/preplay/low-asset-ui/visual-review.md`
50. `docs/engineering/world-integration/preplay/low-asset-ui/owner-playtest-guide.md`
51. `docs/engineering/world-integration/preplay/low-asset-ui/r1/verification-results.json`
52. `docs/engineering/world-integration/preplay/low-asset-ui/r1/browser-results.json`
53. `docs/engineering/world-integration/preplay/low-asset-ui/r1/visual-review.md`
54. `docs/engineering/world-integration/preplay/low-asset-ui/r1/wording-and-test-map.md`
55. `docs/engineering/world-integration/preplay/low-asset-ui/validation/run-browser-checks.mjs`
56. `docs/engineering/world-integration/preplay/low-asset-ui/validation/browser-harness.ts`
57. `docs/engineering/world-integration/preplay/low-asset-ui/validation/README.md`
58. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/ENG-WORLD-LOW-ASSET-UI-001-R1-task-v1.0.md`
59. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/OWNER-authority-and-scope-ENG-WORLD-LOW-ASSET-UI-001-R1-v1.0.md`
60. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/AUD-2e3d13a-ENG-WORLD-LOW-ASSET-UI-001-review-v1.0.md`
61. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/BASELINE-AND-SCOPE.json`
62. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/REPRODUCTION-AND-ACCEPTANCE.md`
63. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/ENG-WORLD-LOW-ASSET-UI-001-UI-REVIEW-ASSETS-v1.0.zip`
64. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/ENG-WORLD-LOW-ASSET-UI-001-review-2e3d13a-v1.0.zip`
65. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/verify-task-package.py`
66. `docs/engineering/world-integration/preplay/low-asset-ui/r1-inputs/SHA256SUMS.txt`
