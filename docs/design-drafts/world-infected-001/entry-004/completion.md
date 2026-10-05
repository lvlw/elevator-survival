# WORLD-ENTRY-004-R1 完成报告

状态：作者限定返修完成，等待当前WebGPT主线准确SHA专项实审；不是主线PASS或生产验收。D01—D04未采纳，E01—E03未执行。本文件记录提交前冻结成果；完整最终SHA、parent/tree、push及远端／工作区回执由交付消息给出，避免自引用提交。

## 基线、范围与原件

- 起始 `0362460b259cba6ea160e79ad04a6cb14181cef0`；父 `0921df3f219f368479d1bf3401d8fecddc0d5f71`；tree `a69fbf20abac1b7ed4b041298f4fc3746a7828a7`。
- 沿用 `feature/design-world-entry-004`，没有另开分支／worktree。src保护树 `98c840dd0b6b1a6cc014df4ac9165bc94bf2c794`。
- 在38条精确白名单中修改；[R1原包十四件](reviews/r1-inputs/SHA256SUMS.txt)逐字归档，旧inputs五件、四份共享文档的原完整字节前缀、两份正式38值、参数候选和内容数据保持。
- 会话要求GPT-6 Astra／XHigh；工具未独立暴露实际运行模型／强度，未切换模型或升级配置。单会话自行审查，没有子Agent或独立外审。

## F01／F02与相邻自查

F01联合验证任务件本执行、原始来源份额、claimed领取事实、活单位与已处分单位。错误执行和缺来源在拾放／安装／交样前语义拒绝；原安装、消费、拆合及历史处分不改写。普通合法历史物资不被强制绑定当前执行。真实模型任务提取、搬运、安装和成功仍有正例。

F02逐op检查允许／必需字段，先验quantity、revision、具体选择器与伤口原始标志；缺op、未知source/task、非法目标都明确Reject。固定单单位用药仅省略quantity或整数1；不批量用药，不将combat字段借给medical。补phase／outcome／HP0、D/T、pending、额度、位置和条件战斗的原值边界。未建完整生产codec、全历史认证或CTB引擎。

合法E0自救、真实安装／样本成功、正常空步骤、实际日结／死亡短路、首次生存绷带只一次、正E最后超余额和原四条条件路线均保留。战斗仍使用外部条件，不能宣称真实胜率／路线战斗可达或试玩通过。

## 实际检查与修订记录

| 证据 | 实际结果 | 限定 |
|---|---|---|
| 原31项完整数据修前复现 | 17符合／14不符，11误接受＋3 KeyError，exit1 | 原probe、模型blob与审查身份均核对 |
| 同一原probe修后 | 31符合／0不符／0异常，exit0 | 修后blob不同是身份变化 |
| 原有限98项 | ID／分类／expected全保留，删除0、skip0、替换0 | 8个ID准备态适配详列fixtures.r1Identity |
| 新增96项 | 7正例、89预期拒绝 | 与原98分列，不算生产测试 |
| 当前合计194项 | positive55／expected-rejection127／fault-injection7／unsupported5／mismatch0 | 5未支持不计实现通过 |
| 六语义负控 | 分别exit1，命中2／1／1／1／4／12个不符，程序异常0 | [逐项变异及失败ID](validation/negative-controls.json) |
| 冻结双跑 | 55输入冻结，两个独立进程exit0，输出字节一致，输入未变 | SHA-256 `5619fbfc942d753a76f6ecb32335984d066ca822a1247bf9b95f999d53402654` |
| 当前源码原生24项 | 12正例／5拒绝／2故障／5未支持／0不符，exit0 | 独立重跑，脚本及确定输出与原批次相同 |
| 架构检查 | exit0，51 DEC／257 core production files | 不代替生产测试 |

开发期原套件首次出现7处适配差异；补真实样本claimed／已消耗id，四路线删除固定来源无效照明标签后原expected全部符合。新增安装摘要曾有KeyError，修正测试读取；数量与任务ordinal反例分开，仍明确语义拒绝。修前／中间失败及实际命令stderr、退出码保留于[checks](checks.json)。没有catch-all转PASS或删除旧反例。

[完整验证边界与复跑](validation/README.md)、[冻结清单](validation/freeze-manifest.json)、[事实分层及自查](05-source-and-adoption-map.md)。生产测试起始／最终均NOT RUN，新增生产测试0；build／浏览器／Owner试玩NOT RUN。原175／213／269及0362460旧验证仅属于各自提交，不重跑或改写历史。

## 未完成与授权停止点

本次设计模型返修没有剩余已知阻塞；生产真实任务／部分消费／活战斗恢复、完整CTB与随机路线可达、Owner体验仍未实现／未验收。普通历史锚、准备态facts和简化quick域不证明全局恢复正确。D01—D04、保存兼容、O3仍须相应审定；38值和已批准合同不改，没有发现需要自行改变玩法才能修复本批问题的冲突。

检查通过后按原授权只暂存本任务文件，普通commit／push本分支；推送和准确SHA由最终回执确认。随后停止等待准确SHA专项实审，不自动采纳、正式归档、生产开发或关机。

提交前范围检查：实际31条变更全部落在38条白名单内；14份新归档工作树／暂存blob与附件一致，5份旧输入及4个原字节前缀一致，55条Markdown链接／锚点通过。916个白名单外受保护跟踪对象未变；普通、暂存、基线完整diff检查均exit0。详细原始输出见checks。
