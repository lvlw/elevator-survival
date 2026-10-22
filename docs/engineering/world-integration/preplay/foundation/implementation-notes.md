# ENG-WORLD-PREPLAY-FOUNDATION-001 — 实施记录

起点：`ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`；独立分支 `feature/world-preplay-foundation-001`。本轮默认基线为 252 files／4369 tests PASS（280.41s），Node 24.9.0、npm 11.6.0、Vitest 4.1.10；未设置 worker 覆盖变量。

## 实施前设计与保护边界

1. D1 由 character-cycle 的纯公开 owner 从已绑定配置 `health.infection_damage` 派生，仅返回粗档、标签及安全机制说明；旧 body／配置／存档不增加字段。
2. 完整命令资格继续使用原 `resolvePlayerCommand` 与 `qualifyPlayerCommand`。伴随 metadata 不签发、不调用 resolver／producer。安全三态与资格分离；只证明有公开依据的稳定付费流血检查点、合法免费行动、正常 H0，无充分依据的未来周期与活战斗保留 unknown。
3. 如需共享行动流血标量，只在获准的 `cycle.ts` 将原 `Math.max(0, health - bleed_action)` 窄抽为纯读取函数，原正式分支同源调用；不改变结算顺序、输入或异常边界，不调用计划做 Preview。
4. facade 继续委托既有 S。伴随 preplay 接口只提供安全 metadata 和进程内 opaque 上下文引用，不泄露 revision／身份／canonical，也不新增 current 或 writer。
5. headless controller 缓存稳定安全 snapshot，显式 bootstrap／执行／retry 后消费返回 view；原生 blocked 通知只使缓存失效。单飞先于回调；程序异常保留并显式传播，投影失败屏蔽旧视图，synchronize 不执行玩法或保存。
6. 草稿与确认用原 opaque 请求和上下文身份绑定；复制纯数据不读 getter、不冻结调用者。新的 current 即使公开值相同也失效；单纯 retrySave 保留选择语义。Feed 只保存已公开差异或通用完成消息，不保留快照、原始结果或隐藏暴露。

正式依据：[DEC-053](../../../../05-design-decisions.md#dec-053)、[基础合同](../foundation-contract-v1.0.md)、[公开病程合同](../public-condition-contract-v1.0.md)。后续浏览器 owner、UI、入口与 O3 不在本轮。

## 实施与自查修订

- 当前病程唯一 owner 为 `queryPublicInfectionCondition`，按已签发配置 infection_damage 行读取当前粗档。没有复制增长表／阈值或持久化派生档；最低档不承诺安全，最高档不改变 HP0。完整 24 字段保留，D1 以外字段沿用旧事实。
- `cycle.ts` 唯一正式差异是抽出 `queryActionBleedingHealth` 标量，并将原处一次 Math.max 调用改为同源函数；审计去除该函数及还原该调用后与起点逐字相同。所有原 G1/P/R/S 测试、参数和协议保持。
- 实际战斗能力比最初保守设计更完整：复用正式 player/enemy primary、护甲／防御／伤害和行动流血 checkpoint。当前公开意图一次响应及退却完成分支可证明；不读敌人 HP 取消响应，不计算隐藏未来意图。条件退却两个真实执行分支（一活一死）保持同一 not-guaranteed metadata。
- 完整命令动态保护寻找真正合法的非必死替代；unknown 不充当替代。自查新增“药物无临床目标、但快捷物可免费移回空背包”反例，正式资格已接受转移，原保护遗漏。实际修前 AssertionError；修后补齐有限几何候选且交正式 qualifier，返回存在性布尔而不自动摆放；该原生回归通过，所有查询计数不变。
- controller 只包装唯一旧 S，缓存安全 view，不新增 current/writer。执行期间 blocked 通知不成为最终界面，返回后发布完整 ready。单飞涵盖通知回调。新 current 更换 opaque scope 并废旧草稿／确认，同 current 保存重试不更换 scope。
- 初期新测试仅有 Node assert 类型问题、TEST bridge 对故意拒绝的错误期待、条件 draw 注入被 TEST cold helper 替换的问题；均在新测试组织内修正，未改变正式断言目标／旧 helper／玩法。修前失败日志保留，不冒充语义检出。两条完整新链仅各获局部 30_000ms，未改其他预算或 worker。

## 两份获准旧测试的准确差异

`player-privacy.test.ts`：原参数化测试 `hidden infection %i does not change actions, length, warnings or generic qualification` 的 0/9/120 三个跨档等值实例，替换为 `same public burden %i/%i does not change actions, length, warnings or generic qualification` 的 [0,9]、[60,89]、[120,180] 三个同档实例；kind unknown 改 known。新增 `DEC-053 permits only the approved current-band difference at %i/%i` 的 59/60、89/90、119/120 三个正控。替换 3、新增 3、删除测试 0、净增 3；其他原隐私测试逐字保留。

`player-fields.test.ts`：字段合同导入 v1.0→v1.1；D1 kind 改 known 并加 below-loss band 精确断言。原 3 项测试数量不变，ordinary facade 精确导出数组和 domain 保护断言不变。D1 批准依据为 DEC-053 与本轮任务第 6 节，不把旧跨档断言伪装成当前批准隐私边界。

## 实际验证与停止边界

基线默认 test:run：252／4369 PASS，280.41s。第一轮默认完整 check：267／4443 PASS，325.83s。新增自查反例及修复后重新完整默认 check：267／4444 PASS，330.43s；最终被测源码的 884 项 SHA-256 指纹保存于仓库外核验记录，提交前再次比对。

本轮三类仓库外原生负控：隐藏精确病程公开、陈旧确认隐式刷新、blocked 回调冒充最终状态，均 AssertionError 检出，逐个还原后通过；最后源码版本上全部再验。语法／类型／夹具失败不计语义检出，历史负控 NOT RE-RUN，不累加。

只读 npm audit 实跑一次，镜像 API 404 NOT_IMPLEMENTED、exit 1；最新漏洞及可达性 UNCONFIRMED，无 audit fix 或依赖变更。浏览器、DOM、跨标签、Owner 试玩 NOT RUN；未启动后续工程，等待准确 SHA 源码／安全／应用更新实审。

## 暂存后发现的实际输入冲突（提交停止）

原字节复制的任务书 `inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-task-v1.0.md` 在第 249 行含 EOF 空白。暂存前普通 diff 不检查 untracked，外部行尾正则也漏掉 EOF 空行；暂存 55 项后，cached diff 和相对起点 diff 实际 exit 2。累计检查除历史七处外多出这一处，不属于获准 W01。原件／包／清单 SHA-256 一致：`c8b7fba85afd741b871b4022d9824744938e1f38cfee16bce36bf06dd26f5325`。

未改原件、未扩 W01、未调 Git whitespace 配置。外部审计补齐非行尾空白告警核验；记录功能 check PASS 与提交 BLOCKED 的区别。已暂存任务文件保留，5 份作者记录更新为本阻塞实况但不再次 stage；未 commit／push，等待主线修正版输入或精确例外授权。

## RESUME-01：W02 授权续办与当前交付状态

2026-10-22。此前 BLOCKED、失败与 exit 2 段落保留为真实历史；本节是后续限定处置，不覆盖历史，不表示主线源码实审 PASS。依据 [续办任务书](resume-01-inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-RESUME-01-v1.0.md) 和 [精确范围](resume-01-inputs/RESUME-01-SCOPE.json)。

- 沿用原 HEAD `ff2b79f332c5ea2bec493eb5e166dcee6ba667eb` 及原工程分支，不重建、不回退。初始 55 项暂存与 5 份未暂存记录得到本机重新核实；未发现仍运行的原任务命令。
- 本次只编辑五份作者记录、原字节归档四份补充文件；不修改实现／测试。累计 59 文件（13 modified／46 new），最大许可 71 路径，不是开放整个目录。原七件输入及历史 W01 两件均保持原字节／blob。
- 本次默认完整 `npm run check`：exit 0，267 files／4444 tests，246.07s；53 DEC／345 core production files，architecture／typecheck／build PASS。未改 worker、预算或配置，保留原大 chunk 告警。
- 原始基线 252／4369、原实现最终 267／4444 各保留；原工程净增 75 项不重复累计，本次续办新增／替换／删除／净增生产测试均为 0。此前负控本次 NOT RE-RUN，完整 suite 中的旧回归仍实际执行。
- 884 项已测试源码／配置的工作树 SHA-256 一致；本工程新增／修改源码及测试的索引原字节一致，未改动的旧文件索引 blob 保持基线。首次外部审计误把旧 CRLF 工作树等同于 LF Git blob，定位后按既有 attributes 与原基线分别核对，未修改任何文件／Git 配置来通过。

### 完整原始空白检查

| 命令 | 原始 exit | 告警数 | 判定 |
| --- | ---: | ---: | --- |
| `git diff --check` | 0 | 0 | 精确匹配 |
| `git diff --cached --check` | 2 | 1 | 精确匹配 |
| `git diff ff2b79f332c5ea2bec493eb5e166dcee6ba667eb --check` | 2 | 1 | 精确匹配 |
| `git diff --cached ff2b79f332c5ea2bec493eb5e166dcee6ba667eb --check` | 2 | 1 | 精确匹配 |
| `git diff 8c19ca0d28058cf743b41c8547cc2629c8eac767 --check` | 2 | 8 | 精确匹配 |
| `git diff --cached 8c19ca0d28058cf743b41c8547cc2629c8eac767 --check` | 2 | 8 | 精确匹配 |

W01 仍仅原两输入七处 trailing whitespace；本次 W02 仅原任务书第 249 行 `new blank line at EOF.`。该原件保持 24083 bytes、SHA-256 `c8b7fba85afd741b871b4022d9824744938e1f38cfee16bce36bf06dd26f5325`、blob `85a39b34c414952cfc30005b4f76b483bb019a42`。核准例外判定为 **PASS_WITH_APPROVED_W01_W02_ARCHIVE_EXCEPTIONS**，不是把原始 Git exit 2 改称 0，也不是主线工程验收。没有整目录排除、改 whitespace 配置或新增其他例外。完整 stdout／stderr／退出码见 verification 的新增 resume_01 对象及仓库外原始记录。

### 提交边界与停止点

五份记录和四份补充文件按精确路径重新暂存；记录生成后再次暂存并重做全量范围、原件、字节及六条空白审计。只普通 commit／push 至 `origin feature/world-preplay-foundation-001`；具体最终 SHA／父 SHA／tree／远端／CI 由提交后回复及仓库外 receipt 提供，不为自身 SHA amend。此处记录的是已完成的提交前核验，不预称推送或 CI 已成功。

保存原有安全 unknown、浏览器／DOM／跨标签／Owner NOT RUN 和 O3 未决定。npm audit 的镜像 404 仍为 UNCONFIRMED，本次未重跑审计或升级依赖。后继浏览器 owner、UI 等不开始，停止等待准确 SHA 的源码／安全／应用更新实审。
