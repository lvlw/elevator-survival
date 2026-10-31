# C1 合同实现与支持边界

下列编号先对应 C1 合同 C01—C09；后表对应验收矩阵 C01—C18，两种编号不能混计为测试数量。

| 合同 | 实现与证据 |
| --- | --- |
| C01 唯一事实 | BattleStage 直接读取当前 PlayerView.combat.opponent.name；实际三敌 P→BrowserOwner→React 验证名称/文字/aria，保留中性占位与原五阶段。unknown/五阶段是明确标注的 schema/renderer 分支测试，没有声称原生九/十五组合都可达。失去能力保留战斗，不推断死亡。 |
| C02 直接来源 | app 原 execute 与 confirm 各用同一同步 perform 包装，原调用一次；只接它直接返回的 presentation。普通订阅只作失效清理，snapshot、Feed、HP、label、raw trace 不产生反馈。 |
| C03 有界消费 | consumer 仅持 scope 引用、high-water、generation、一个六类 public action cue；无请求/存储/玩法端口。首次允许非零 ordinal，同 scope 严格递增；缺号不补，复制旧 token/换 scope 不复活；battle/selector 不参与生命周期键。先更新消费账，再渲染/排 timer。 |
| C04 同步窗口 | Session 以 owner/controls 引用为代；自己的正常 busy→stable 保留 ticket。提交后真实 suspend/dispose 使直接返回丢弃；返回后仍核对 mounted、当前 controls、ready/stable、最新 view 对象。旧 timer 与已退役订阅回调都先检查当前 Session。 |
| C05 预算 | 仅 cue 文字 180ms 的轻微位移/强调，单 timer，随后静态最近动作文字保留至下次 view/命令。没有逐击、敌方受击/响应扩展、HP 冻结或等待动画判终局。下一合法动作即时走原入口，最新 view 立即显示。 |
| C06 减少动态 | 原生按钮/checkbox、polite atomic status；skip/减少动态仅落稳及取消 timer，不退回 token、不发命令。本地选择 OR OS matchMedia；监听和 timer 清理。真实浏览器键盘 Enter/Space 已验证；OS true/变化是 DOM TEST 媒体端口，真实浏览器 true 未验证。 |
| C07 保存与错误 | save-failed 是已提交的一次动作；retry 原纯保存，不读 presentation；冷恢复五停点无反馈/写入。呈现/调度异常可观察并进入原错误界面，已发生的提交不倒退、不重做。 |
| C08 交互兼容 | 原 preview/confirm、L0—L3、singleFlight、opaque selector、参数/支付/first-fit、Feed/保存不改。唯一旧测试变化是一条 aria 查询的三敌精确局部表。source/owner/controller/B1 协议及所有其他旧断言保护对象不变。 |
| C09 边界 | 未增加图片、资产映射、React owner、事件协议、B2 或完整主题。仅缩减大屏 Feed 的最低显示高度并使装饰占位在实际 grid 行内收缩，修复新 cue 空间下 1366 的真实遮挡；三栏与 6×4 背包保留，Feed 仍完整可滚动。 |

| 验收 | 实际证据 | 结果/限制 |
| --- | --- | --- |
| C01 | input-verify、initial-*、remote-*-before、baseline-test-run | PASS；模型/推理/速度无法独立核验，实际工具模式 Default。 |
| C02 | current-opponent-presentation 4 项、旧 combat 及 query 回归 | PASS 分层；unknown/五阶段非原生可达性声明。 |
| C03 | committed-presentation 10 项、native.integration 12 项 | 六类真实原 controls、单记录、非 combat 入战零伪反馈 PASS。 |
| C04 | consumer 14 项、重复通知/rerender、调度失败消费后不可恢复 | PASS；local epoch 只作 React span key，不向 DOM 泄漏 token ordinal。 |
| C05 | 原生退却再入、复制/缺号/foreign scope、新 owner ordinal0 | PASS；不依 battle/selector 清高水位。 |
| C06 | lifecycle 12 项、实际 post-commit suspend/dispose、正常 busy 序列 | PASS；新增退役订阅测试先红后绿，原始失败保留。 |
| C07 | 原生 save-failed/retry、浏览器 5200 明确故障端口 | PASS 该层；TEST 抛 QuotaExceededError，不是 OS 真配额耗尽。 |
| C08 | native 五冷停点零计数、新 owner 独立 scope | PASS；浏览器代表冷刷新，不声称浏览器五停点全部。 |
| C09 | 拒绝/取消/过期确认、草稿/读/同步及观察计数 | PASS；保留全部旧保护断言。 |
| C10 | 原生产者 strict checkpoint 的胜利/退却/死亡/双方归零、即时 DOM | PASS；实际死亡浏览器也在反馈 active 时已读到终局。 |
| C11 | fake clock、旧 timer、键盘 skip/reduce、原生下一动作 | PASS 自动层；浏览器下一动作间隔超过180ms，未把该次录入称为窗内连击证明。 |
| C12 | StrictMode、pagehide/reacquire、retired callback、真实同源占用/释放 | PASS 覆盖层；浏览器没复现每一种竞争排列。 |
| C13 | 3 对真实 native 前后完整公开图（沿用旧normalize仅规范opaque引用身份）/整 DOM/所有有序属性/aria/cue 相等 | PASS；病程/暴露、seed/角色/物品/战斗实例、同阶段隐藏敌HP真实不同；未删字段或排序放宽。 |
| C14 | 原旧 UI/B1/query/controller/owner/content/保存组合回归 | PASS；唯一旧 aria literal 全字节适配保护。 |
| C15 | 外部正控34；N01—N04独立失败日志/patch/还原证明 | PASS；N02/N04为明确的等价最小语义变异，不伪称正确实现有私有响应入口。 |
| C16 | 正式 DEV React、原生 LocalStorage/WebLocks、六原图/DOM/计数 | PARTIAL；OS true、实际缩放及完整像素/全页限制见 BROWSER-REVIEW。 |
| C17 | 组合169/1781、最终定向7/59、默认check337/4858 | 本地 PASS；准确最终提交 CI 的独立回读在外层回执，不拿 base CI 替代。 |
| C18 | scope_check、原输入14字节、全保护对象、refs、Git源码/patch/manifest | 最终外层回执列实际数值；等待独立主线精确 SHA 审查。 |

已知风险：现有动作列表焦点在消耗快捷物品后会落到同位置的退却按钮，可能显示原说明浮层；未新增 focus 调用，也未改受保护旧动作组件。截图如实保留该行为，未在本白名单外修复。原 Feed 仍会记录既有公开 HP 变化；C1 不以它推测动作。现有依赖/CI/正式设计的历史开放门槛没有因本次工程测试通过而关闭。
