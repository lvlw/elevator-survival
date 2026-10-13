# E02-S 准确 SHA 会话／保存故障实审 v1.0

日期：2026-10-14。
结论：**PASS，E02-S本批无需返修。可以进入另行下发的E03-A真实路线验收任务。**

## 1. 准确基线与范围

- 仓库：`lvlw/elevator-survival`。
- 受审提交：`713dd376ddb60d20d9afaedaee4505e695f89d94`。
- 父提交：`29a018a2ad64f8d5cbe56257381568bf3527cd08`。
- Tree：`7839313a3e2475c93ae73c4dda9761a57c81ef3f`。
- 远端受审分支：`feature/residence-combat-session-001`，读取时指向上述SHA。
- 本批41条变更为新增S适配／测试／交付材料及四份共享文档追加，未改变P/R、旧会话与规则接口。
- 原任务ZIP的5份输入逐件Git blob和完整目录指纹已独立重算；目录为`28fd8f1d0176ce44ba830ff29413b73e9dcf5342`，与准确提交一致。
- `src/core`对象在父／最终提交均为`ad56eedab6ae2112b97f5de17c7fe14b1fcc4a88`；`src/content`均为`5dfcfec0dc63998a96eb0a867611fe4a21a8d8e2`。App/app/UI等本轮也保持原对象；S增量在state。没有把用户本地状态冒充主线磁盘观察。

## 2. 实际阅读

完整阅读11份新增生产适配：`src/state/residence-session/combat-{types,commands,composition,initial,proposals,expectation,persistence,queries,session,index,controlled}.ts`。

完整阅读14份新增测试：同目录`combat-{domain,initial,expected,actions,medical,stable,terminal,atomicity,persistence,reentry,session,history,compatibility}.test.ts`及`combat-longchain.integration.test.ts`；另读`combat-test-{fixtures,routes,observers}.ts`三个TEST helper。

对照原E02-S任务书、正式会话／恢复责任及实际P控制入口。读取本批实施记录，核对首绷可变化标志误判及新helper路径／计数修订仍保留，不以改旧断言迁就新代码。

## 3. 关键结论

### 3.1 唯一状态与能力

构造先校验composition，再占用现有共享domain；没有另建不相知的战斗writer。普通入口只有类型和错误，构造及完整诊断留在受控入口。

命令原始对象先经描述符／循环／稀疏数组等检查，再严格分支解析。阶段、revision和当前battleId在对应生产者前核对。真实P计划必须通过原WeakMap能力与完整before绑定；clone/JSON/错依赖不能直接交current。用于提交的expected只在真实计划验真后，由结果与保留的初始材料形成，这不是冷候选自证。

### 3.2 事务与死亡

R完整聚合及预编码先于唯一current替换；随后一次write尝试、一批只读通知。真实P可能已经生成final dead；S没有再次消费死亡或再关闭委托。双方归零与敌仍活死亡保留各自实际归档pending，不发布HP0活动态。

战斗后firstBandageUsed可按真实医疗改变；工具／专长选择继续锁定。立即维修、材料消费、G1及原战斗记录的接续由P负责，S不复制公式。

### 3.3 写失败、冷恢复与重入

写失败保留最新current；后续合法命令从此状态继续。retrySave只验证／编码／写入，current引用和revision不变，不重发玩法通知。冷expected先于候选字节读取且没有候选参数；已知进度、坏档或非字符串结果不会通过retryRead→null降格为新建。

busy覆盖启动材料、独立expected、read、规则生产、验真、聚合、编码、write、notify和重试。异常通过finally释放；订阅异常不取消已提交结果或阻止另一订阅。此为同步headless端口责任，不是异步后台保存或浏览器多标签锁。

### 3.4 原生长链与真实边界

作者新增成功链确实从read-null、真实初配开始，全程S dispatch，经三敌CTB、任务生产／安装、样本交付成功返回。退却／休整／再入及立即维修链也使用真实S/P。两声明组合中，旧历史部分仍明确使用危险已解决TEST材料，后继执行使用真实S战斗；未注册第二玩家内容。

但是成功主链采用注入的合法上端点风险策略（quietDraw），不是普通默认种子群体的通关率证明。它验证命令与保存组合成立，不证明四条路线、九组合平衡或首玩体验。这正是E03-A下一批需要补的原生证据。

## 4. 三层验证，分开记账

| 来源 | 实际结果及边界 |
| --- | --- |
| 作者本地 | 起始215文件／4032项；新增14文件／162项；最终229文件／4194项；组合105／1692；完整check通过。不是主线执行。 |
| 准确提交CI | #155，run38436226133，job115430785601。主线已读完整日志，checkout为受审SHA；52 DEC／329 core、typecheck、229文件／4194项和build全部成功。日志测试时长105.93秒。CI与作者不是新增用例数相加。 |
| 主线源码隔离执行 | 4份Git指纹一致的原样模块：composition/session/proposals/persistence，47项控制流检查全部通过；外部删计划验真和retry玩法重放两种负控各检出1项业务断言失败。外围规则／schema／codec／domain及存储均有明确TEST适配器。不是完整P/v4或npm复跑。 |

47项覆盖真实源码的首次／非首次状态锁、bad/null读取、独立expected调用先后、composition/getter/数组边界、能力拒绝、生产／聚合／编码失败、已完成死亡提交、失败后继续、仅保存重试、通知隔离与10种回调点重入。不能据此宣称验证了适配器代替掉的Zod规则、CTB或来源守恒。

容器获取完整仓库的尝试因DNS无法解析GitHub失败，因此本轮主线未运行原生全量npm。独立源码阅读、作者原生测试、准确提交CI和隔离控制流检查共同构成本次限定PASS；没有把执行范围补写为全仓复跑。

## 5. 保留事项

- W01累计exit2仍仅原两份输入的七处硬换行；增量干净与累计例外分开。主线未完整复跑作者1316保护对象／链接套件，未执行用户本地status检查。
- CI的npm ci日志报告5项依赖审计告警（2 moderate、3 high），本轮没有获取完整依赖公告／可达性信息，不能判定部署可利用性。新任务可只读归类，禁止未授权npm audit fix或升级。
- CI保留>500kB chunk及Actions Node20目标运行时退役提示；不是本次新增生产行为，单独进入发布前维护清单，不据CI全绿称无告警。
- 浏览器真实存储、自举材料持久化、多标签、UI、Owner首玩、O3：NOT RUN／未批准。
- E03四条真实路线、九组合、工具箱材料竞争、玩家安全查询尚未完整收口。E02-S PASS不是完整世界可玩或发布批准。

## 6. 本轮停止点与下一项

本次E02-S通过；新任务按Owner已有任务下发权限独立下发：E03-A真实五图路线／九组合原生验收及玩家安全查询接线合同。一次交付真实逐动作证据、默认RNG的有界样本、查询可见性矩阵与下一查询工程契约，不重新设计世界、不改生产规则／参数，不自动UI或浏览器接入。

已审核心／编解码／会话分别保持各自SHA边界；不合并、不推main或强推。后续任务须重新核对工作区、AGENTS及实际测试基线。
