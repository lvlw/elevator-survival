# G3 + ADDENDUM-01：准确提交源码／headless 恢复实审

> 标识：AUD-60e9c30-ENG-RESIDENCE-SESSION-RESTORE-001 / v1.0
> 日期：2026-10-04
> 结论：**PASS，限定于本次 G3 合同支持的阶段和接口；无必须返修项。**

## 1. 审查基线与结论

- 仓库：`lvlw/elevator-survival`。
- 最终提交：`60e9c30732c5e22cfe9ff58b9b381de64b945180`。
- 唯一父提交：`d7953bbf96dc842d2953e019f950275cd693bf09`。
- 根 tree：`cd5ced1ff8be1ee7def4df2cf2ac43e66f1a93a1`。
- 远端工程分支：`feature/residence-session-core-001`，已指向本次最终提交；读取的 main、两设计分支及各先前工程分支保持先前引用。

本次 PASS 表示：受控冷候选、声明全集与跨字段聚合校验、两个窄稳定态的字符串往返、一个应用域内唯一状态持有者、真实 G2 单边移动消费、同步保存故障与重入处理满足任务合同。并不认可所有未来保存阶段，不改变 G1/G2 的原审查范围，也不是公开发布或 Owner 体验通过。

远端源码与作者完成消息是不同证据。主线没有访问 Owner 的 Windows 磁盘；工作区、暂存区、735份保护文件和本地运行日志的状态来自作者报告，不能说成主线访问本地并复跑所得。

## 2. 权威和读取范围

本次以已上传 G3 原任务包、ADDENDUM-01，以及准确提交的实际源码为审查对象。正式约束来自 DEC-049/050、已批准 `runtime-restore-supplement-v1.0.md` 与 G3 任务第4—9节的支持合同；原件中的历史状态不被本报告倒改。

完整阅读本次涉及的10份生产实现文件：

```text
src/core/mission-lifecycle/controlled.ts
src/state/residence-save/types.ts
src/state/residence-save/validation.ts
src/state/residence-save/codec.ts
src/state/residence-save/index.ts
src/state/residence-session/types.ts
src/state/residence-session/commands.ts
src/state/residence-session/session.ts
src/state/residence-session/controlled.ts
src/state/residence-session/index.ts
```

另完整阅读6份新增测试与 `src/state/residence-session/test-fixtures.ts`；原 `mission-lifecycle.test.ts` 按本次精确补丁核对，原103项语义由保留源码与CI回归共同提供证据。阅读当前合同／支持文档、验证记录的运行与范围部分、提交中状态附记，核对实际 AGENTS.md、package.json、提交元数据、远端引用与 CI #132 的全部任务日志。G1/G2相关接口沿用前次读取与本次调用点对照，未声称重新通读整个历史仓库。

## 3. 核心结论

### 3.1 冷候选与旧恢复分责正确

`parseMissionColdCandidate(input, expectedBinding, scope)` 只包装既有 `readValue` 并返回冻结候选。原四个 controlled 函数保持；普通 index 未导出新冷入口，原 `restoreMissionCandidate(raw, expected, scope)` 没有放宽。

原 K19/K20 导出测试只新增一个 `parseMissionColdCandidate` 字符串项。仍是精确导出集合断言，不是包含性断言；普通 publicApi 名单与关闭保护语义未改。此项是 ADDENDUM-01 明确允许的测试同步，不是测试豁免，原103项不计新增。

### 3.2 聚合与 codec 没有伪造当前历史

新格式固定为 `elevator-survival.residence-headless` / 1。聚合从根角色身份和独立受控声明策略建立 scope，逐项核对声明全集、重复事实、活动数量、执行ID、身份／版本／D/T，以及实际 G1/G2 身体、容器和现场。不会拿 raw.missions 自建内容目录。

fresh-hub 要求真实 first-ready/D1，全部事实未接；active-world 要求首执行 startCycle=1、D=T、生还、非战斗稳定现场。闭合历史、返回桥接、死亡和待战斗不安装，不丢掉字段后转换为“新角色”。冷校验产生的一致性 authority 不是不存在的旧内存历史证明。

来源检查仅验证当前实体与声明输出的明显矛盾：未兑现来源不能已经拥有其稳定输出ID；剩余实例要兼容某一声明输出。它不补发、不刷新、不重新抽奖。此项不是逐次重放历史或对离线档案作真实性证明，也不应被用于宣称完整防作弊。

### 3.3 一次提交、写失败保留内存成立

`session.ts` 用私有 current，普通返回面没有 replace/setState/installCandidate。bootstrap 只有真正 read-null 才开放显式首次创建；已有 current 后不能再bootstrap/create。会话域句柄在已认领后不能建立第二writer；这是单应用组合责任，不是跨浏览器标签锁。

move 的顺序为：严格请求／新鲜度 → 真实 G2 提案 → 签发与前态检查 → 受支持结果／身份和revision+1检查 → 完整聚合校验和预编码 → 一次 current 替换 → 同步 write → 只读通知。到达事件、待战斗及致死结果不会被当作稳定后态提交。G3未接产品入口，不能把这种开发能力拒绝用于以后玩家规避真实死亡。

写入抛错后 current 已是最新完整状态，返回 committed + save-failed；显式 retrySave 只序列化最新 current，不重跑规则、不读旧档、不增加玩法revision或通知。通知逐个隔离异常并仅返回代码，不泄露原错误对象。read/factory/write/notify中的重入写操作受busy保护。

## 4. 原生证据与主线独立检查分开

| 来源 | 已核对内容 | 不应扩大成 |
| --- | --- | --- |
| 作者本轮原生执行 | 基线115文件/2540项；定向17文件/528项；新增6文件/141项；最终121文件/2681项，完整check通过 | 主线本机复跑或新增141+528项 |
| 远端CI #132 | run 37176428346 / job 111359876425，准确SHA；50 DEC/246 core统计、typecheck、121文件/2681项和build成功 | 主线独立执行，或浏览器真实IO已通过 |
| 主线源码与补丁审查 | 10份涉及生产的文件、6份新测试、夹具、旧测试受限增量、合同分责及归档指纹 | 对所有组合穷举验证 |
| 主线隔离执行 | 原样 `session.ts` 8203字节，Git blob `b68a3556f08ecc9330782321a147d2809b755212`；26个状态机控制流案例全部匹配 | 原生G1/G2/聚合/codec完整执行 |

隔离脚本明确替代外部core、codec、policy和错误端口，只检查实际session源文件中的提交顺序、一次bootstrap、无档创建、保存故障、重入与未支持提案拒绝。运行环境为Node22.16.0、预装TypeScript5.8.3仅转译；不是项目TypeScript7的类型检查。脚本最初有一个括号笔误，尚未执行任何测试，修正后26/26匹配；初始诊断保留，不当成生产失败。

主线尝试拉取公开仓库以建立本地原生运行环境，但容器DNS无法解析github.com，git clone退出128；没有关闭SSL或改变网络配置。GitHub连接器读取正常。本轮主线未原生重跑npm或真实G3 API；原生动态证据来自作者与远端CI。隔离检查不是这个限制的替代性伪证明。

## 5. 范围、原件与状态记录

实际交付与原30条加ADDENDUM单一测试路径相符；生产变动集中于新state模块与cold包装，原测试受限新增一项。四份共享文档为末尾附记。作者报告31文件、6修改/25新增、+2346/-0；本报告不冒称逐字节独立复验735份保护文件或全部本地源指纹。

主线将原任务包五件输入的字节数和Git blob逐项与准确提交的GitHub目录元数据比较，5/5一致；原四项SHA-256清单也全部匹配。`archive-checks.json`保留实际值。原件 SHA清单本身没有被改成自引用。

CI还报告原有4项依赖审计告警（2 moderate/2 high）、大chunk提示和action运行时提示。它们继续作为维护事项，不据此宣称安全审计通过，也不在本Goal擅自audit fix、升级依赖或修改阈值。

## 6. 保留责任与下一步

以下仍为OPEN或NOT RUN：关闭历史安装、完整正常返回／期限／死亡事务、经济与任务件处置、CTB及稳定战斗保存、真实五图内容、三专长、工具箱完整路线、玩家入口、浏览器IO／刷新／多标签、O3发布安排和Owner试玩。不能把错误拒绝算成这些业务已实现。

下一项采用单个完整工程 `ENG-RESIDENCE-ACTIONS-001（G4）`：在相同headless支持状态上增加受控首次出发，以及真实G2来源揭示／整实例拾取与留置／G1休整的统一会话事务，连同保存故障、恢复和原生回归一次交付。它只接既有批准规则，不注册玩家内容，不加入终局或战斗，不把完整采纳世界设计自动变成实现授权。

G4从本次准确SHA新建独立分支，完成后立即实审首次激活与日推进的状态接缝，不自动继续后续Goal。普通commit/push范围以G4任务明确为准；本次PASS不授权合并main、公开发布、修改Project Sources或项目配置。
