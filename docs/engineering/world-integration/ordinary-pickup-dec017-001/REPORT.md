# ENG-WORLD-ORDINARY-PICKUP-DEC017-001

本轮将 DEC-017 接到新感染世界正式普通拾取链：先补兼容背包堆叠，再对剩余数量验证放置；格位或负重不足时只拾取可容纳数量，余量留在原节点。公开 Preview、原 React 和原保存链均已接入。

## 版本与授权

- Repository: lvlw/elevator-survival
- BASE: a84adc827e56c4d8d01d4f8b541a90c9f35a6523
- BASE TREE: 382ec90c28f8a816a901c2d0e0d10faa1d4789e8
- BRANCH: feature/world-ordinary-pickup-dec017-001
- 工作目录：E:/projects/elevator-survival-worktrees/world-ordinary-pickup-dec017-001
- 本文件随唯一任务提交绑定；准确 FINAL/PARENT/TREE 和最终 CI 回执由最终交付消息及仓库外 FINAL-RECEIPT 提供，避免文档自引用提交 SHA。
- 模型推荐为 GPT-6 Astra Pro / Extra High。实际模型产品档、推理档及 Standard 服务档未取得可核验宿主回执，记 UNCONFIRMED，不把建议当作已证配置。

完整读取实际 AGENTS、原任务五文件、DEC-017、DEC-052 D03/D08、UIR-015 当前有效约定及相关当前源码。已沿用本轮开工的实际基线，没有因增量授权重新跑基线。原设计/切片/架构/决策文档与上一已读准确版本内容相同；本轮复核了当前相关规则和架构链。

任务 ZIP SHA-256 为 `057c72e82233bc9e00b1bd32adbc794420d9c3b8b3cb14abb58f2579221472af`，8,553 字节，五文件 CRC 和解压字节核对通过。包中没有 manifest、verify-package.py、单独 SCOPE 或 UX-CONTRACT；未伪造或改写包。原始输入副本在 inputs，验证清单在 evidence/package-verification.json。

两次 Owner 白名单增量及六个实际接口改动见 AUTHORIZATION.md。其余生产文件均在原白名单内。无 DEC/UIR 新规则，无 source config、保存/expected、BrowserOwner、依赖、CI、美术修改。

## 实现与边界

Core：`ordinaryPickupCapacity` 统一计算真实来源数量、兼容性、背包负重上限、目标堆叠余量和正式 geometry Preview。核心只在提供合法新格位时新建堆叠；纯并堆不要求虚假格位。planSharedInventory 调用相同计算后转移准确来源范围，经原 read/issue 一次提交。数量仍由 positiveSchema/原始 safe integer 校验，超来源数量拒绝，不 truncate 非法值。

Player：只增加安全数量/位置摘要。保留 opaque 对象、当前身份和 revision 绑定；没有公开实例 ID、来源、内部计划、隐藏状态。查询与预览不提交、不写盘、不消耗随机。战斗目录只增加类型，没有改战斗规则。

React：多数量保留明确输入；数量 1 可沿原便利拾取。界面只按原 row-major、未旋转候选调用正式 Preview；不算容量、不移动旧物品。纯并堆直接提交无格位；产生新堆叠时提交正式 Preview 认可的格位。多数量预览显示实际量、合并量、新建量/位置、留地面量及容量原因。纯并堆收起不需要的选位控件；已有手动格位时保持控件可编辑，允许从无效格位改选到正式合法位置。

非堆叠普通物品保留完整实例放置；task-transfer、任务件资格及其他 inventory/医疗/维护/战斗结构不变。保存失败已提交仍生效，retry/cold 不重做拾取。

源码及测试完整清单见 evidence/changed-files.txt。旧测试只补显式数量输入或用正式拆分建立原先的双堆前提；原断言未删除/skip。特别是旧存档历史测试原文件不改，共享 TEST arranger 恢复原双堆前提后继续验证来源调包、重叠、丢失的拒绝。

## 证据

| 实际执行 | 结果 |
|---|---|
| 开工 npm run test:run | 369 文件 / 5,123 项 PASS，829.51s，2 workers |
| 准确 BASE 失败探针 | 3 项按预期失败，保留原红日志 |
| 新增与定向组合（自查前） | 10 文件 / 21 项 PASS |
| 旧存档历史/库存/来源夹具复验 | 3 文件 / 60 项 PASS，旧存档测试原断言保持 |
| 首次默认检查 | 377 文件，5,139 PASS / 1 FAIL；旧双堆夹具前提问题，已修 |
| 夹具修复后的默认检查 | 377 文件 / 5,140 PASS，架构/类型/构建 PASS，650.93s |
| 手动格位自查回归 | 修复前 1 FAIL / 2 PASS；修复后 3 PASS |
| 最终 npm run check | 377 文件 / 5,141 项 PASS；53 DEC / 347 core 架构检查、类型检查与构建 PASS，4 workers |
| 真实 Edge | 两条原 DEV React 库存边界操作、四张 1440×900 原图、冷恢复与来源核对 PASS |
| 最终 SHA CI | 提交后绑定准确 SHA 查询；最终交付回执附 run URL、结论与原日志。不会以 BASE 的 #192 冒充。 |

完整原日志位于 evidence/check-delivery.txt；该默认检查包含既有 E03。worker 数只通过本次进程环境设置，没有修改 npm scripts、依赖或 CI。

开工失败探针三项真实失败：已占用兼容堆叠被旧路径 OVERLAP 拒绝；核心显式 quantity 被旧结构拒绝；正式 PlayerSession quantity 被旧接口拒绝。原日志 evidence/scope-probe-red.txt 保留，修复后同三项通过。

新增 8 个测试文件、18 项，分别覆盖：三个原失败探针、满格并堆/部分/零容量、合并加新放置、四类任务件隔离、重量/稳定 split、严格 codec、来源排序与 ItemState 兼容 seam、Player/React 纯预览和保存失败/retry/cold、两个严格构造器、手动格位纠正。用途与局限见 CONSERVATION.md。无新增 skip/only。

原生 Edge 157.0.4341.42、1440×900 CSS、DPR 1、secure context/Web Locks 均实际可用。两次全新专用 profile，loopback 原 DEV React；无日常 profile 控制、matchMedia 替换、页面伪装或截图加工。browser/native-evidence.json 记录 DOM、真实 checkpoint、浏览器版本和运行错误（均为空）；CONSERVATION.md 与 evidence/conservation.json 核对所有份额、实例、资源与冷恢复。

原图：

- browser/screenshots/full-merge-preview.png：24/24 满格，请求 1，实际合并 1，无选位要求。
- browser/screenshots/full-merge-after.png：背包口粮 2、原地面堆 1、重量增加 1。
- browser/screenshots/partial-preview.png：请求 2，正式预览可取 1、留 1，格位限制。
- browser/screenshots/partial-after.png：实际余量仍在地面、格位仍 24/24。

两张 after 相同像素是两条请求得到相同实际结果，不是拼图或复用原图。所有图均 1440×900 原始 PNG，hash/大小见 evidence/conservation.json。

## 保护、自查与未完成项

对照前任务已有保护快照，四个既有工作树 HEAD/分支/status 和十个 HTTP 实验文件 SHA-256 均不变；Owner playtest 工作树 HEAD 仍为 BASE。现存 refs 与远端 refs 记录在 evidence；仅本任务分支允许新增/更新，宿主内部 refs 只记录。

已查完整端到端调用链，未改唯一 writer、保存模型、生命周期、任务受控搬运或游戏数值。重复来源、非法输入、过期/伪造选择、容量零的拒绝和保存次数有回归。

限制：不兼容 ItemState 在现有生产 stackable 目录没有真实异构资源，使用显式合成 seam 加严格伪造拒绝；浏览器为真实 React 的合法 TEST 库存边界，未冒称原生全通关路线；原生浏览器写盘故障注入 NOT RUN，隔离 React/Player 故障测试已执行。本任务未扩视口/布局，不部署、不安排 Owner 试玩。

完成普通新分支 commit/push、准确 SHA CI 核对后停止，等待主线实审；不合并、不强推，不改其他分支、main、baseline 或旧档。
