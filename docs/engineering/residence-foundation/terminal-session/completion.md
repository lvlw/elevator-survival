# C 作者完成报告

## 状态与起点

ENG-RESIDENCE-TERMINAL-SESSION-001 的 W1—W4 已完成作者实现与本地验证；等待当前 WebGPT 主线准确 SHA 源码／headless 恢复实审，不代表主线 PASS、Owner 体验通过或完整世界已可玩。

- 起始 SHA：`b9b1e0fee0e779669ca40e088ac9a867016bff82`。
- 父：`bfc6bd973eeb306df1e8ee916b2160c30b757cdf`；tree：`e8939c6d65075e630e3960b619daa50de0eb9b53`；src tree：`05ed81d551d318a58b1a9005b493c4566936ef87`。
- 起始工作区与暂存区为空，原 B 分支只读核对后新建 `feature/residence-terminal-session-001`。
- origin：`https://github.com/lvlw/elevator-survival.git`；开工读取远端 11 个参照全部符合原清单。
- 本文不自填自己的归档提交 SHA；最终完整 SHA、parent、tree、push 回执与远端核验由提交后的完成消息提供，不追加自引用提交／amend。

## W1—W4

W1：完整读取五份任务输入、AGENTS、正式规则／合同及相关真实源码；先执行实际基线，记录唯一 current、共享 domain、依赖／阶段／错误和测试设计。

W2：新增显式 v2 owner、九类严格命令、实际首次创建／launch 与容量预检、G2 活动接入、A 三终局意图和 G2 原死亡计划消费。只 B 校验和预编码后的完整结果可提交。正常返回 steps=[]、死亡真实步骤、单 revision 保持。

W3：四态冷恢复、read-error／blocked 显式重试；完整首次长链、A/B 受控成功与两声明历史、三类独立保存故障、十个重入点、通知隔离和安全查询。保存失败保内存，retrySave 不重放／重读。

W4：相邻边界自查补充同型 domain、可变 factory 原件和首次待战斗拒绝；所有原接口／测试只读。四份共享文档只追加当前状态；输入按原字节归档。最终范围、摘要、链接、配置与提交源码核验记录见 [verification-results.json](verification-results.json)。

## 文件与旧接口

实际使用 33 条白名单中的 32 条，不创建可选 terminal-owner.ts。

- 旧源文件仅 `src/state/residence-session/session.ts`：移出 domain WeakSet／issuer，改为共用 assert／claim；其余业务正文不动。
- 新生产文件九份：domain、terminal-types、terminal-commands、terminal-context、terminal-launch、terminal-transitions、terminal-session、terminal-controlled、terminal-index。
- 新测试：八份 terminal-* 测试及一个 test-only fixture；原 A/B/G1/G2/身份/v1 测试不改。
- 四份共享文档末尾附记：docs/03、docs/08、world-infected-001/01、world-infected-001/10。
- 本目录四份工作报告与 inputs 五份原件。详尽路径见 verification-results 的 changed_paths。

旧 v1 同型／交叉 domain 占用共享，但 codec、原死亡拒绝、G4 默认消费者保持旧合同；不把旧测试换成 v2。新 v2 接受完整死亡，不继承旧开发期 HP0 拒绝。旧 v1 和 B 兼容回归全部实跑。

## 测试与证据

| 检查 | 本轮实际结果 |
| --- | --- |
| 开工 npm run test:run | 139 files / 3135 tests，退出0 |
| 最终要求的定向组合 | 41 files / 1099 tests，退出0 |
| 最终 npm run check | PASS，退出0 |
| architecture（check 内） | 51 DEC / 257 core production files，PASS |
| typecheck（check 内） | PASS |
| test:run（check 内） | 147 files / 3274 tests，PASS |
| build（check 内） | PASS；已有大于500kB chunk 提示仍在，不修改阈值 |
| diff／范围／摘要／链接 | tracked/cached/base diff-check PASS；27新增文件空白检查PASS；32允许路径、19实测源码指纹、5输入blob和11远端参照核对PASS |

新增测试文件8；新增139、替换0、删除0、净增139。新测试分布：session28、actions23、endings26、persistence8、reentry13、history14、compatibility25、integration2。

C01—C12 的实际 API／文件／用例和错误阶段见 [支持合同](contract-and-support.md)。原生正例都用真实生产者，不 mock 正例后态。成功任务内容与第二声明历史来自 A/B 完整受控测试夹具；首次长链确实从 read-null 开始；容量差1分层测试不伪造合法高余额 fresh。

四态恢复各 read1／冷安装1；factory、provider、规则、随机、write、通知均0。完整首次跨图／来源／拾取／留置／休整／回访／失败返回链实际12次 current 提交、12次 write、12批通知；每个正式后继只多一次 revision。

### 三类独立保存故障链

以下计数均包含显式 retrySave，夹具生产与后续独立冷启动分开。完整各函数细分在 verification-results。

| 支线 | G1 cycle/action | G2 establish/move/reveal/transfer/rest | A plan/consume/terminate | draw | factory/provider | read/write | current提交/通知批次/两个listener各 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ①正常成功或失败，分别执行 | 1/0 | 0/0/0/0/0 | 1/0/1 | 0 | 0/0 | 1/2 | 1/1/1 |
| ②reveal→pickup→rest→失败返回（真实首次起点） | 3/2 | 1/0/1/1/1 | 1/0/1 | 1 | 1/1 | 1/7 | 6/6/6 |
| ②相同故障链→成功（A/B达标冷起点） | 2/2 | 0/0/1/1/1 | 1/0/1 | 1 | 0/0 | 1/5 | 4/4/4 |
| ③move死亡 | 0/1 | 0/1/0/0/0 | 0/1/1 | 0 | 0/0 | 1/2 | 1/1/1 |
| ③reveal死亡 | 0/1 | 0/0/1/0/0 | 0/1/1 | 1 | 0/0 | 1/2 | 1/1/1 |
| ③rest死亡 | 1/0 | 0/0/0/0/1 | 0/1/1 | 0 | 0/0 | 1/2 | 1/1/1 |

保存失败后的重复终局拒绝；后续动作基于最新内存；实例、来源cursor、奖罚及周期不随重试重复。独立新域冷读最终字符串保持完整结果且零规则重演。

## 冲突、限制与停止

规则／批准参数冲突：未发现。发现并修正的测试夹具／类型／导出问题逐项保留在 [实现记录](implementation-notes.md)，不改 A/B 或修改 expected 掩盖规则错误。

生产五图内容、第二玩家委托、出发日结死亡协调、完整 CTB／医疗／专长／工具箱／商店、UI、浏览器存储和多标签仍不支持。O3 未决定；浏览器、刷新、Owner 分段突破与恢复负担体验 **NOT RUN**。依赖安全审计 **NOT RUN**，本轮未安装／更新依赖或运行 audit fix。远端 CI 不等同本地 check，实际查询与状态在提交后消息报告。

没有改首身份、A/B、G1/G2、批准34+4参数、保存格式、依赖、AGENTS、UI或旧测试；没有真实任务注册、current安装后门、任意结果命令、异步结算或第二钱包。没有合并／强推／main推送、关机／重启／定时。

停止点：本分支普通提交／正常推送后，等待当前 WebGPT 主线准确 SHA 实审，不自动进入下一工程。
