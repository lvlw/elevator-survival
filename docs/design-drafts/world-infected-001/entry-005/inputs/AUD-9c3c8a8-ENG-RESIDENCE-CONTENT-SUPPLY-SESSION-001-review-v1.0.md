# E01-S 准确 SHA 会话／保存故障源码实审 v1.0

日期：2026-10-05。
结论：**PASS；E01-S限定范围通过。W01原七行归档例外保留。**

## 1. 基线、证据与停止点

| 项目 | 锁定事实 |
| --- | --- |
| 仓库 | `lvlw/elevator-survival` |
| 受审提交 | `9c3c8a8c97c374bd1def6217c691137f3df10096` |
| 父提交／工程起点 | `84eb6dff5e9d3238c3e651525b6ed28412132549` |
| Tree | `1333c0031b67ab47a9a0b832d7d372eaaf781079` |
| src tree | `10501d897195173df2023b1ebd73f9f097228512` |
| 分支 | `feature/residence-content-supply-session-001` |
| 提交标题 | `feat(state): add content supply session` |
| 交付范围 | 34路径；30新增、4共享文档追加；+3123/-0 |
| 远端CI | #146；run 37312459898；job 111770956534；准确SHA completed/success |

远端工程分支、提交父子关系和tree已通过GitHub连接读取。用户本地HEAD、工作区干净及实际push操作属于作者报告；主线没有直接访问用户E盘。本报告不表示main已合并或发布，未授权这些动作。

在已读源码、测试、CI和下述独立检查范围内，未发现阻断E01-S的实现问题。E01-P、E01-R/R1、E01-S构成的“生产者→严格v3候选→受控会话提交”已分别通过限定实审；这不代表完整世界、活战斗、浏览器恢复或玩家体验通过。

下一项可进入E02活战斗／退却恢复的工程准入合同定稿。DEC-052的战斗方向不重开；具体活态保存边界、唯一事实投影、旧战斗模块复用及窄修改路径仍须在生产工程前定清。E01-S的PASS本身不是E02自动开工授权。

## 2. 本次实际阅读

本次完整阅读10份新增生产文件（均位于`src/state/residence-session/`）：

`supply-session.ts`、`supply-composition.ts`、`supply-expectation.ts`、`supply-proposals.ts`、`supply-initial.ts`、`supply-commands.ts`、`supply-persistence.ts`、`supply-types.ts`、`supply-controlled.ts`、`supply-index.ts`。

完整阅读10份新增测试及1份辅助文件：

`supply-session.test.ts`、`supply-faults.test.ts`、`supply-initial.test.ts`、`supply-persistence.test.ts`、`supply-reentry.test.ts`、`supply-expected.test.ts`、`supply-compatibility.test.ts`、`supply-terminal.test.ts`、`supply-operations.test.ts`、`supply-longchain.integration.test.ts`、`supply-test-fixtures.ts`。

还核对本批原任务包、权限和35路径白名单、实际Git变更选段、工程完成／契约记录、当前AGENTS、正式来源恢复合同和DEC-052相关正文。代码全部新增；共享文档只追加实现状态。`supply-context.ts`是未使用的许可路径，不是漏交模块。

为安排下一任务，另定点阅读当前`src/core/combat/index.ts`、`combat-types.ts`、三敌声明`src/content/infected-world-v0.1/enemies.ts`及entry-004战斗／近期工程合同。这些读取不属于对未来E02实现的审查。

## 3. 关键结论

### 3.1 唯一current和域占用

新v3入口复用既有域发行／占用机制，没有新增互不知情的第二注册表。非法composition在claim前拒绝，端口外壳按描述符检查，复制并绑定回调，不修改或冻结调用方外壳。旧v1/v2未被重写；九种同型／交叉占用组合有原生回归。

### 3.2 首次资格与独立expected

只有合法首次启动模式、真实read-null、未观察到既有进度，才能进入初配路径。非空坏档、明确existing启动或已知活动／关闭材料不会降格为首次；读到非空后再变null也不能发初始包。

初配expected先由独立材料建立，再调用真实P初配生产者。冷提供者零入参，不接收待解码文本／对象；其expected来自候选外受控记录。已有current后不能bootstrap、retryRead或createFirst覆盖。已验真的运行时提案可以由受控编排推导下一expected；它不等同于未验证冷候选自证。

当前冷恢复仍依赖外部已持有的身份／进度资料。本批没有解决独立浏览器启动如何取得这些资料，不保存第二份可编辑expected侧档，也不声称跨进程防回滚。

### 3.3 真实P委派与死亡优先

严格命令先检形状和旧revision，再委派真实P动作；P仍拥有成本、目标、物品和来源语义。提案须通过完整前态／依赖绑定及producer类别核验。死亡来自原P计划：先消费一次原死亡计划，最终只安装dead一次，不把HP0活动态先提交再修补，也不再次运行伤害、日结或随机。

活着的pending战斗结果仍整体拒绝为不支持，不清pending或删敌人。真实HP0且同时触发pending时优先形成死亡终局，而不是用“不支持战斗”撤销已经发生的死亡。

### 3.4 事务、保存失败和通知

动作提案验真→R完整聚合→R预编码→一次current替换→一次write尝试→一批只读通知。validate／encode失败发生在安装之前；已调用的生产者仍如实计数，不伪称所有失败均零规则调用。

write失败保留最新内存和真实来源消费。retrySave重新验证并编码最新current，只写入，不重跑动作、抽取、用药、维护、安装、终局或通知。它也不把验证产生的新对象重新安装为current。

busy覆盖读取、初始材料、生产、校验、编码、写入、通知和显式重试；finally释放，监听异常不回滚已提交结果。端口是同步合同，非void写结果不被报告为saved。

### 3.5 内容和历史证据

存在真实read-null→初配→出发→安全移动／来源→返回的会话链，不能称所有用例都从手拼活动档开始。复杂安装成功／失败链则明确使用危险已解决TEST冷前态，保留三敌人对象；任务成果由真实P生产，不手设供电／安装／样本完成。

六药、四维护、机械总池、来源拆合、快捷迁移、原任务件留置跨日、首绷和日额都有具体会话证据。两声明仍是TEST，未开放后继玩家任务。复杂链不是CTB通关或全九组合平衡验证。

## 4. 验证分层

| 证据主体 | 实际范围 | 不代表什么 |
| --- | --- | --- |
| 作者本地 | 起始169文件／3494项；新增10文件／127项；最终179文件／3621项；全量check PASS | 不是主线独立执行 |
| GitHub CI #146 | 主线读取准确SHA的run、job与完整日志；架构52 DEC／289 core、类型、179文件／3621项、构建全部成功 | 不是新增另一批127项测试 |
| 主线源码／测试阅读 | 上述10生产＋10测试＋1辅助；范围、原任务合同、冷expected、完整提交与故障控制流 | 不是浏览器或CTB验收 |
| 主线输入原件 | 对本地原始ZIP五份文件重新计算Git blob、字节数及SHA-256，与准确远端五份blob和四项清单逐项匹配 | 不声称Project Sources同步或访问用户磁盘 |
| 主线隔离执行 | 四份Git指纹一致的原样TS代码；62项控制流检查，62通过、0失败 | 不是完整原生P/R、codec或全量npm复跑 |

隔离执行直接组合原样session、proposals、composition、persistence函数，仅擦除类型／替换import。底层P/G1/G2/A、R验证与codec、初配、expected解析、命令解析和domain工具使用明确桩依赖。它验证委派、提交顺序、异常和重入；底层游戏规则是否正确仍由实际源码阅读和原生作者／CI证据支持，不能由桩证明。

主线曾尝试在独立容器获取仓库，git fetch因DNS无法解析github.com退出128；GitHub连接读取成功。因此本轮主线原生npm全量、真实浏览器、真实Storage、多标签和Owner试玩均NOT RUN。没有把工具网络问题说成仓库测试失败。

可复现附件保留四份原样源码、Git指纹、隔离脚本、62项结果、stderr及五份输入校验表。脚本运行方式：`node evidence/isolate-session.cjs`，在附件根目录执行；脚本从自身相对路径寻找source。

## 5. W01、保护边界与维护提示

本批新增任务原件五份无新增行尾硬换行。既有W01仍仅限：

- `docs/engineering/residence-foundation/content-supply-restore/inputs/ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-task-v1.0.md`第7—9行。
- 同目录`AUD-8c19ca0-E01-P-review-v1.0.md`第3—6行。

作者本批增量diff-check exit0；累计对照P起点exit2，仅七行。主线没有在完整clone中重跑该累计命令；本次提交清单未修改这些原件，不扩大原先已审的例外。结论为源码PASS、归档沿用`WITH_APPROVED_W01_ARCHIVE_EXCEPTION`，不是“全历史检查干净”。

CI还保留既有大chunk提示、依赖审计4项提示和旧Actions运行时提示。本轮未开展漏洞可利用性分析，不据此宣布生产安全，也不授权自动audit fix、升级依赖或改阈值。

## 6. 精确来源入口

- [准确提交](https://github.com/lvlw/elevator-survival/commit/9c3c8a8c97c374bd1def6217c691137f3df10096)。
- [会话唯一入口](https://github.com/lvlw/elevator-survival/blob/9c3c8a8c97c374bd1def6217c691137f3df10096/src/state/residence-session/supply-session.ts)。
- [原计划及死亡消费编排](https://github.com/lvlw/elevator-survival/blob/9c3c8a8c97c374bd1def6217c691137f3df10096/src/state/residence-session/supply-proposals.ts)。
- [独立expected](https://github.com/lvlw/elevator-survival/blob/9c3c8a8c97c374bd1def6217c691137f3df10096/src/state/residence-session/supply-expectation.ts)。
- [原生故障回归](https://github.com/lvlw/elevator-survival/blob/9c3c8a8c97c374bd1def6217c691137f3df10096/src/state/residence-session/supply-persistence.test.ts)。
- [真实长链及TEST边界](https://github.com/lvlw/elevator-survival/blob/9c3c8a8c97c374bd1def6217c691137f3df10096/src/state/residence-session/supply-longchain.integration.test.ts)。
- [正式来源／恢复合同](https://github.com/lvlw/elevator-survival/blob/9c3c8a8c97c374bd1def6217c691137f3df10096/docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md)。
- [CI #146](https://github.com/lvlw/elevator-survival/actions/runs/37312459898)。

**主线结论：E01-S限定PASS；不返修，不直接启动活战斗或玩家接线。**
