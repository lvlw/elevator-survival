# DOC-WORLD-ENTRY-003 + ADDENDUM-01：准确提交文档实审

标识：AUD-6438f7a-DOC-WORLD-ENTRY-003 / v1.0。
日期：2026-10-04。结论：**PASS（文档归档与A工程准入）；无需返修。**
本报告不表示终局代码、headless v2、浏览器保存或Owner体验已实现／通过。

## 1. 锁定对象

| 项目 | 准确值 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 最终提交 | 6438f7a38939297225538cdd68af24201ed7d34f |
| 父提交 | c67fd4117065e2e0dbd1117cae4fbfaa83791599 |
| root tree | 2afeb4504960b23585f5eb9b718473e2b3e4d161 |
| 分支 | feature/design-world-entry-003 |
| src tree | 4d28340ad020950e90bbbed1dc0b902a7f6880db |
| main远端 | a76e9c1c998051fc1643b6e0c3d53443fa55feed |

主线通过GitHub连接器读取准确提交、root tree和远端分支引用。设计分支指向最终提交，其余八个参考分支与上轮记录一致。用户本地HEAD/status/diff仅有作者报告，主线没有访问E盘或用户工作区。

## 2. 原件与正式目标的独立字节证据

主线读取本会话实际可访问的原归档ZIP及ADDENDUM ZIP，在自身容器内解包、重新计算SHA-256、Git blob及递归Git tree，和准确提交的GitHub对象比较；不是采用作者给出的摘要作为计算结果。

| 核对对象 | 主线实测结果 |
| --- | --- |
| 原包11件（含旧载荷／清单） | 完整目录Git tree = 4f751d30b4b6a41d6e27f8f286510b57dd6c3ba3，与仓库adoption/inputs一致 |
| 补充包6件 | 包含step-semantics-01的amendments目录tree = b3bc4312158e888b66dfce0d085548d59c79aae5，与仓库一致 |
| 两包15条SHA256SUMS记录 | 逐项实算一致；两个清单本身由上述完整目录tree覆盖 |
| A正式契约全文 | blob c52c08df1cd99b6d376e3d43174e72e0866758bf，等于补充载荷 |
| 正式终局恢复合同全文 | blob cf308a1b16d932ba8d99da07bb0dcdce7201f0e1，等于补充载荷 |
| 正式批次计划全文 | blob f9e97aafdba863dad17a2fc51a624bb236a7dc07，等于原包载荷 |
| 正式四值配置全文 | blob fa999e7f456414daf6279fd8fbff3cd117394135，等于原包载荷 |

### DEC全文保全的复核方法

从本会话可访问的先前审查附件提取DEC-050完成后的完整文本，**先核对其Git blob确为本轮父版本的f13e8c5718583d08aec3ce09edd311df60ee61b0**，不凭文件名假定版本。再按任务规定计算：

```text
verified_parent_DEC_bytes + b"\n\n" + amended_DEC_051_payload_bytes
```

得到261442字节、Git blob `c739151493cd8b5e46e03d25008ea0fb128c3e14`，与本次准确提交的完整DEC文件一致。因此001—050原正文保全，051使用的是修订载荷而非旧的通用非空版本。这项核对不表示其他Project Sources已自动同步。

三份修订载荷SHA-256分别为：

```text
DEC-051: f844779da9a650a2744e8d07e1198015966a1e50435a59101664b708e3fa934b
A契约: 5f35b35cfe580aad5b1f8990954285dae88fb0451645ce43088ced9099fbcd50
恢复合同: e6126982afc09c0174279418a6d8563b5b88645c2c080a38d698a53410c14fd5
```

## 3. 语义核对与阻塞关闭

原BLOCKED的实质是把死亡提案非空要求错误泛化到正常返回。当前DEC-051 C09、A契约§3及T04/T05、终局恢复合同§3已一致分开：

- 正常H0成功／主动失败返回：真实G1 `steps=[]`，alive，deathCause与requiresDeadlineClosure为null；body/cycle不变、revision只承接一次、正确return-due。空身体步骤不免除任务关闭、实物与奖罚。
- 期限生还：保留真实有序日结步骤及deadline-ready；不借生还身份接受空日结。
- 动作／休整／期限死亡：保留真实非空合法BodyStep、来源与HP0短路；不补假步骤、不重算、不伪造G1死亡CycleClosure。

这与实际G1 cycle.ts和原normal-return测试、实际G2 LocationPlan职责一致。非空的有限Python字符串模板不能成为生产BodyStep规则。当前恢复合同把原G1配置身份与独立终局配置身份分别绑定，没有用后者覆盖身体身份。

四值为success_reward=120、initial_balance=0、balance_max=2147483647、failure_penalty=20；前三值是首批试用，20只属于当前委托。商品／治疗／医疗／专长／地图和战斗参数没有一起批准。新格式家族elevator-survival.residence-headless的formatVersion=2只属于B/C技术合同，不是本次已实施的保存格式，也不是旧医院O3发布决定。

A只产完整纯计划；B并列严格编解码；C唯一内存提交／保存。A不承担实际保存和会话安装，B通过前不移除现有G4的开发支持门禁。旧expected及冷候选无安装权继续有效。

## 4. 范围、状态和证据分层

实际读取包括：准确提交及可见差异、正式DEC-051、正式配置、三份完整契约／批次载荷、合并完成记录与checks中的历史/当前状态指针、关键架构与阶段附记、root tree、归档目录对象，以及下一工程需要的实际受控接口。主线没有重新逐包阅读旧世界历史。

root tree显示src、scripts、.github、package/lock、AGENTS、TypeScript/Vite配置与父版本记录一致，未把文档任务变成生产修改。作者报告43路径／19入口同步、191处链接及保护检查通过；主线核实关键对象与当前入口，不把作者的全体检查当作已独立重跑。**19份来源文档全部前缀／后缀及191链接套件，本轮没有在主线完整复跑。**

合并完成记录保留原BLOCKED正文，后续附记明确已解除；checks.json通过currentResult/addendum01区分旧状态。提交内“待提交”是写报告当时状态，实际Git提交／push以准确Git对象及提交后回执为准，不要求为了自引用再生成回执提交。

| 证据类别 | 本轮状态 |
| --- | --- |
| 主线独立执行 | 原输入包摘要、完整输入tree、四正式文件blob、完整DEC拼接blob与关键语义核对 |
| 作者本地执行 | 43路径、15摘要、载荷／参数／原文／191链接／保护对象、架构51 DEC／246 core、diff；保留失败及修订记录 |
| 主线架构、npm测试、build | NOT RUN |
| 175项有限模型／历史API探针 | NOT RUN，不为新DEC归档更新历史保护指纹 |
| 浏览器／多标签／Owner试玩 | NOT RUN |
| 本提交新增生产代码／测试 | 0（源码tree保持） |

主线尝试获取独立仓库副本时网络不可用，未因此声称运行了本地完整Git／npm检查；本次实际仓库证据来自GitHub连接器。随报告附带的复核ZIP是选定证据，不是完整仓库归档或作者电脑副本。

## 5. 下一项准入与停止

文档前置通过，可以由主线按Owner既有后续分批授权下发 **ENG-RESIDENCE-TERMINAL-001（A）**，从6438f7a准确提交新建feature/residence-terminal-core-001。本报告不单独授权写代码；执行范围、文件清单和普通commit/push由同批正式工程任务明确。

A必须把正常空步骤、真实死亡非空步骤及有序日结分开验收；真实G1/G2计划的revision只承接一次。任务详细设计、实现、资格/金额/实物与历史测试、自查、检查、文档和提交作为一次完整Goal，不按文件来回请求Owner协调。

A完成后立即准确SHA源码实审，不自动进入B/C，不合并或推送main、不强推。Project Sources和项目配置本轮不修改；未批准内容和旧医院发布O3继续保留。
