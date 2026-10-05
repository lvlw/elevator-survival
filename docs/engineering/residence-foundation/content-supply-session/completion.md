# ENG-RESIDENCE-CONTENT-SUPPLY-SESSION-001 作者完成报告

## 身份、基线与交付

- 起始/本提交父 SHA：84eb6dff5e9d3238c3e651525b6ed28412132549。
- 起始的父 SHA：346902461c3fd1f01ec88132d4d2e7c3ef1d50bd。
- 起始 tree：327e3474a3f6b90d156f6e34dbbcc0288f7efe87。
- 起点工作区与暂存区干净；新分支 feature/residence-content-supply-session-001。
- 本轮真实基线：npm run test:run，169 files / 3494 tests，exit 0，19:24:55 开始，93.43s。
- 最终 SHA/tree、正常 push 结果、远端精确核对及 GitHub CI 实际状态在提交后最终消息提供；本文件不自引用其产生的 commit。
- 作者验证与准确 SHA 主线实审、Owner 体验分开；后两者尚未执行。

## 完成内容

显式 v3 唯一会话复用原 domain，与 v1/v2 互斥。真实 read-null 才允许受控首配；独立 expected 先于 P 初配，九种工具/专长组合实际建立并锁定。已有 current 不再读旧档；坏档、非字符串返回与已知非首次事实不转成首次资格。

所有命令经真实 P 生产者与签发计划验真。原死亡计划只消费一次，R 完整后态验证/预编码后只提交最终 dead 一次，不提交 HP0 active 或增加第二 revision。任务、来源、真实地面迁移、拆合、快捷栏、六药、四维护和四终局都由既有规则持有，不复制公式。

统一提交 current→write→通知。保存失败保持最新内存；retrySave 仅编码/写当前值，0规则重放、0再次通知。十种同步回调边界与独立 cold provider 的重入拒绝；监听异常隔离。完整支持和 S01—S12 原生测试映射见 [contract-and-support](contract-and-support.md)。

## 测试增量与自查修订

新增 10 个测试文件、127 项；替换 0、删除 0、净增 127。旧测试全部原样保留。

| 新文件（src/state/residence-session/） | 项数 |
| --- | ---: |
| supply-session.test.ts | 10 |
| supply-initial.test.ts | 15 |
| supply-operations.test.ts | 15 |
| supply-terminal.test.ts | 11 |
| supply-persistence.test.ts | 6 |
| supply-reentry.test.ts | 14 |
| supply-compatibility.test.ts | 21 |
| supply-longchain.integration.test.ts | 5 |
| supply-faults.test.ts | 10 |
| supply-expected.test.ts | 20 |

自查增加了两类粘性首次保护：非字符串存储结果不能在下一次 null 后变为无档；合法 active/closed/非首次时钟材料不能改回 first 后重发。既有 P 已拒绝改锁定专长的伪计划，测试保留真实 INVALID_INPUT 拒绝点，未弱化 P 来制造假反例。

开发定向测试曾因测试夹具/断言不合法失败：食物堆叠与快捷资格、H4 前置门、金属 definition ID，以及新的非字符串粘性保护与旧测试预期冲突。均修正本批测试以使用真实合法生产路径，未更改旧规则。早期测试日志使用 node:fs/process 导致缺 Node 类型，改为 Vitest reporter 输出，不新增依赖。保留已落盘的 126通过/1失败定向日志及修后127通过日志，不冒充首跑全绿。

两项语义负控使用新测试内真实注入，无生产测试后门：完整 R 对被改余额的值返回 INVALID_STATE，已有纯调用计数如实保留但0 current/write/通知；把全部 producer/draw/provider 设为调用即抛错，retrySave 仍成功且只增加 encode/write。

## 四组故障链独立计数

下表是每条支线完成必要前置后独立计数，**不含最后显式 retrySave 和新 cold owner**。首建/出发链特意包含初配；来源/消费链在真实 read-null→初配→出发后清零。复杂安装链使用标记为危险已解决的 TEST 冷前态，保留敌人对象，全部任务成果随后由真实 P 产生，不证明 CTB 通关。

| 链 | G1 action/cycle | P move/rest/task/reveal | P inventory/medical/maintenance | origin / plan | activate/terminate/consume | encode / write / current /通知 | draw |
| --- | --- | --- | --- | --- | --- | --- | ---: |
| 首建/出发 | 0 / 1 | 0/0/0/0 | 0/0/0 | 4 / 1 | 1/0/0 | 2/2/2/2 | 0 |
| 来源/消费 | 14 / 1 | 4/1/1/3 | 6/2/0 | 4 / 15 | 0/0/0 | 15/15/15/15 | 1 |
| 安装→成功 | 54 / 5 | 33/4/13/2 | 4/1/1 | 8 / 59 | 0/1/0 | 59/59/59/59 | 1 |
| 安装→主动失败 | 49 / 5 | 29/4/12/2 | 4/1/1 | 7 / 54 | 0/1/0 | 54/54/54/54 | 1 |
| 移动死亡 | 1 / 0 | 1/0/0/0 | 0/0/0 | 0 / 2 | 0/1/1 | 1/1/1/1 | 0 |
| 来源死亡 | 1 / 0 | 0/0/0/1 | 0/0/0 | 2 / 2 | 0/1/1 | 1/1/1/1 | 1 |
| 任务死亡 | 1 / 0 | 0/0/1/0 | 0/0/0 | 1 / 2 | 0/1/1 | 1/1/1/1 | 0 |
| 维护死亡 | 1 / 0 | 0/0/0/0 | 0/0/1 | 0 / 2 | 0/1/1 | 1/1/1/1 | 0 |
| 休整死亡 | 0 / 1 | 0/1/0/0 | 0/0/0 | 0 / 2 | 0/1/1 | 1/1/1/1 | 0 |

P producer 次数包含实际到达 producer 的拒绝调用，不能全等于提交数；真实 G2、所有 provider、read、encode/decode 和各子项完整计数在 [verification-results](verification-results.json) 中。

首建链：initial=1、depart=1、materials=1、read=1、G2 initial=1。来源链 G2 move/rest/transfer=4/1/2；成功链33/4/4，失败链29/4/4，taskTransfer均2。死亡移动 G2 move=1、死亡休整 G2 rest=1，其他死亡 G2=0。每个死亡有行动计划与终局计划两次签发，但只有一次 current。

每条 retrySave 独立增量：encode+1、write+1，其余计数全部0，无重复通知。每个新 cold owner：read1、externalExpected1、decode1、安装1；规则、origin、write、通知0。

H0 Day1/Day7 正常返回均 terminal1、G1 cycle1（steps=[]）、terminate1、plan1、current/write/通知各1，无 action/consume/draw；异地 Day7 截止生还/死亡均保留真实有序周期，terminal1/cycle1/terminate1，无动作重跑。

## 恢复与 F01

first-hub、active-world、living-hub、dead 均通过真实字符串端口与独立启动 expected 恢复。expected 在将字符串交给新 owner 前从受控真实生产/提交记录独立固定，provider无候选参数，不从磁盘 initial origins 反推。owner私有初始锚跨后续命令保持。

坏版本/seed/phase/revision/缺失expected均 blocked；四种 F01 坏历史通过会话真实 decode 拒绝。合法Day6休整死亡、Day7行动死亡/截止死亡和HP截零继续有效。两声明 TEST 历史保全旧成功/主动失败；living-hub不能由普通dispatch再次出发。

保存失败后当前 owner 不rollback/reload；另一个模拟进程只能看到最后成功保存的字节及其匹配expected，不把未落盘内存当成持久成功。

## 文件与保护边界

使用 35 条许可中的 34 条：21 个新 TS 文件、9 个新文档/输入文件、4 个共享文档只追加。未使用 supply-context.ts。精确清单与摘要核对在 verification-results.json。

既有 P/R/G1/G2/A/B/C/domain、v1/v2/v3、首身份、旧测试、配置/内容、依赖、CI、AGENTS、UI和素材均不改。未修改 DEC 或批准参数。五份本包原件逐字节保存。

W01：仅继承旧 R 两个输入原件的七处硬换行。本批增量必须 exit0；累计8c19ca0对照保留实际exit2及七项，不称累计干净，不改配置或attributes消警告。

## 验证与未完成边界

本轮最终实跑：npm run check exit0，52 DEC / 289 core production files；
typecheck PASS；179 files / 3621 tests PASS；build PASS（既有大 chunk 提示）。
定向127项、组合1043项以及原P91/R129/B-C327均PASS。
范围/原件/相对链接/4份追加前缀核对PASS；本批增量diff-check exit0，
累计diff-check exit2且恰为原W01七项。暂存核对34文件（30新增/4修改），五份输入index blob与原始字节一致；最终commit blob在提交后再核对。

最终完整检查与保护审计以 verification-results.json 的实际记录为准；早期/失败命令亦保留。作者本地通过不替代主线实审。浏览器/真实存储/多标签/Owner试玩均 NOT RUN（本批范围外），E02/E03未执行，O3未决定。

不存在已知规则冲突；不新增第二真实委托。等待本批准确 SHA 会话与保存故障复审，不自动进入下一工程。
