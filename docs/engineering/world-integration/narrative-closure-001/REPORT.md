# ENG-WORLD-NARRATIVE-CLOSURE-001

本批在原正式 DEV React 中接入有限医院叙事，不是实验版本或完整医院体验验收。M1 周衡主动会面、M2 真正安装后的回应与样本提示、M3 四种正式终局的短收束已实现。等待准确 SHA 的主线代码与视觉复审；不安排 Owner 试玩，不部署。

BASE：`e7372119672561618f7c2dc1664001104e708bd1`。分支：`feature/world-narrative-closure-001`。准确 FINAL/PARENT/TREE、远端回执及该 SHA 的 CI 在交付回执与最终回复中给出，避免把包含自身 SHA 的报告循环写入提交。模型、推理与服务档位实际均 UNCONFIRMED，不把建议 Sol/high/Standard 写成已核验配置。M1/M2/M3：`72ff89aaebcb4ddd8136721cef03f9a3ba66b6f2` / `8f6cd817d101a8eac2cef54c6d94b7999097afbf` / `97d53b1ba52e9cbcf65873ce4a8c9b9090789a77`。随后证据提交不改 src。

## 来源与权限

任务包 manifest 的八个条目全部按原始字节核验。inputs 保留原输入。实际 AGENTS、设计/切片/架构/已确认决策、相关内容与 UI 约定已读取。文案只读来源 `lvlw/elevator-survival-lab@cbfbbe53c1be0a9748630ba6bcc39f1028966f53` 的七份指定医院材料；未合并、挑取或执行实验代码。采用/省略及事实映射见 adoption-map.md。

从准确 BASE 新建独立 worktree；原 UI 工作区的十个 HTTP 实验文件、旧项目 refs、其他三个 worktree 与 Owner 存档均保全。无核心、游戏存档 schema、成本数值、地图、任务说明、素材、依赖或 CI 修改。没有清档、checkpoint 注入、服务器操作或日常 Edge profile 控制。

## 实现与责任

- M1：可信查询只公开有限地点/事实/实物见证。真实 L5 稳定可控时可主动会面；有署名、未调查、已恢复、携带组件分别选文。谈话不调用 method；原技术按钮仍经原参数、成本、保护和提交链。读毕、略过、关闭分开；侧车阅读键有限扩展，仍由原 BrowserOwner 的单锁保护。
- M2：facade 从原命令和同一次 committed current 产生窄回执，controller 用独立临时引用 scope 和单调序号直接返回。只接受当前有效返回；query、订阅、retry、冷恢复不发 token。真正 install 后存活稳定 H8 才有 HC19；已恢复静态灯态可保留，首次回应不重播。未知缺项仍由原参数展示；样本提示直接采用正式样本分类，不自动交付。
- M3：原收据 success/voluntary-failure/deadline-failure/death 决定短收束；终局优先于安装回应。原首段 dead/living-hub 撤除保护保留。HC24 只伴随原返回确认；HC30 明确当前内容停止。奖罚、死亡、截止顺序与七日规则不变。

投影故障在真实提交以后只给安全诊断，保留 committed 与保存状态，绝不重做行动。消费者限一个当前选择，不设队列或 timer；下一动作、离场、失权、迟到返回使旧内容和旧 ACK 失效。原 A/B1/C1/C2 链路保留。

阅读沿用旧格式、存储键与 storyVersion（hospital-entry-v0.2.1），只增有限 scene key 与上界；旧记录、缺失记录继续可用。已知/可回看不等于读过；不会因访问地点或恢复存档自动记 read。不新增长期“周衡亲历”标记，无凭据时始终选择中性变体。旧版本客户端不认识新增键时仍按其旧校验保守处理，不迁移游戏存档。

## 实际检查

日志保留初次失败和修正，不用后来的 PASS 覆盖先前证据。部分终端日志的 Git 副本只整理尾随空白和末尾空行，原始输出保留在仓库外。开工准确冻结 BASE 的原 `npm run test:run`：360 文件 / 5,099 项通过，691.10 秒。按原 lock 离线 npm ci；无依赖更新。

新增 4 个测试文件 / 14 项：真实 facade/controller/BrowserOwner/React 交互、无工单/署名、跳过、真正 method、安装存档失败与 retry、样本先取、绕周衡真实成功、主动止损、截止生还、死亡、安装同时死亡、post-commit 失权、身份/绑定/revision 故障。边界截止/死亡使用显式 TEST-only 合法 bootstrap/严格记录夹具，并非原生玩家恰好遇到。样本留置/不可用的分支复制测试是明确合成公开 DTO；不冒充原生丢弃路线。

相邻组合：17 文件 / 102 项通过（与其他组重叠，不累加），包括首段/R1、探索回执、任务地图窄 R1、权限/生命周期/保存及展示隐私。两项隔离负控：query 伪造 HC19、谈话错误执行 method，均被断言检出（exit 1）；副本字节均已还原。负控不是玩家真实损坏，初次沙箱缓存 EPERM 不计作语义负控。

旧测试仅适配新字段：player-committed-presentation.test.ts 两处原结果去除 closure/closureDiagnostic；player-opponent-compatibility.test.ts 两处查询去除 closure；player-motion-probe-fixtures.ts 的原键集比较去除两个可选新字段。该 helper 当前确被本批执行的 player-motion-source-probe.test.ts 直接引用，SCOPE 明确允许的必要既有 helper 窄适配；原观察键、提交/保存/RNG/死亡断言全部保留，不删、skip 或降低断言。第一次默认 check 为 362 文件 / 5,107 项通过、6 项失败；失败全部是上述两组新字段未被旧精确比较排除。窄适配后 2 文件 / 16 项回归通过。最终原 npm run check（VITEST_MAX_WORKERS=2，原命令不变）退出 0：架构、类型、364 文件 / 5,113 项（含 E03）、构建均通过。准确 FINAL 的 CI 单独查验，见交付回执。

## 原生画面与操作

见 browser-review.md、screenshots/manifest.json 与 checks/native-actions.jsonl。八条验收与实际边界见 acceptance-results.md。原 npm run dev 只监听 127.0.0.1:5311；真实原页面 `?dev-infected-world=1`。使用现有 Edge 156.0.4314.58 的独立 headless profile、1920×1080 CSS、DPR 1；不是静态页面、假 DOM 或注入状态。四张原 JPEG 未裁剪、缩放、补边或拼图。

原生从 setup 出发完成一条真实成功：调查工单→周衡→原 method→物流组件→通讯材料→真实供电→真实安装→取得样本→原保护确认交付；另一个隔离角色完成真实主动止损。补验无工单不同开场、略过后原 method、冷恢复不重播。成功原生路线使用原勘察/手动开启的通讯绕路，未与技工战斗；不将其冒称原生打败三个敌人（完整三敌由正式 React 回归覆盖）。原生曾尝试快速核验，被原规则正常拒绝，保留操作记录后按合法完整核验继续。

原生浏览器没有执行保存故障注入或失权故障；这两项由正式链 React 测试覆盖，不能将静态图或普通浏览器操作等同此动态故障验证。IAB 连接两次超时，改用可用的隔离 headless Edge；中断探索不计作完成路径。未使用 Owner 日常 profile、未接管桌面。

## 未做及边界

没有新人物美术、配音或音乐：NOT PRODUCED；实际音频验证 NOT RUN。只有字幕声音身份和静态灯态/有限图层，不声称完整演出。无持续动画，减少动态同样保留全部静态信息。C16 媒体/zoom/390/Owner体验状态不变，未追加分辨率或 OS 设置验证。样本留置/不可用未作为独立原生路线执行；已用明确合成安全 DTO 覆盖选文。未做完整 43 场、林岑支线、中后段、新玩法、B2、移动端或发布验收。

本次测试服务交付前关闭，其他服务未停止。完整游戏体验和本批画面是否通过，以主线准确 SHA 审查为准。
