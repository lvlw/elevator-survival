# ENG-RESIDENCE-TERMINAL-001（A）：准确提交源码实审

标识：AUD-bfc6bd9-ENG-RESIDENCE-TERMINAL-001 / v1.0。
日期：2026-10-04。结论：**PASS（A契约限定范围）；无需返修。**

本报告由WebGPT主线产生，不是作者完成报告。PASS覆盖本次纯终局资格、四结果组成、真实G1/G2结果消费、资产与历史完整计划；不覆盖B字符串恢复、C会话安装、真实五图内容、浏览器或体验。

## 1. 准确基线与审查依据

| 项目 | 核对值 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始／父提交 | 6438f7a38939297225538cdd68af24201ed7d34f |
| 本次准确提交 | bfc6bd973eeb306df1e8ee916b2160c30b757cdf |
| 本次tree | 8429346ed7e1e42cf383f68d859c08801c84908e |
| 交付分支 | feature/residence-terminal-core-001 |
| Commit | feat(core): add residence terminal settlement |
| 远端CI | run 37210297627 / CI #137 / job 111459935838；准确SHA相符且成功 |

主线读取了准确提交、变更清单／补丁、所有新增源码／测试、作者合同与实施记录、验证记录相关段、正式A／恢复／批次合同及旧v1接缝。规则来源为DEC-049/050/051、已批准A契约与ADDENDUM-01的步骤消歧，不以设计模型代替生产行为。

Owner本地HEAD、工作区和暂存区干净属于Codex交付报告；主线未访问Owner磁盘。主线独立核对远端A引用为上述提交，main仍为a76e9c1c998051fc1643b6e0c3d53443fa55feed，设计与既有工程参照引用保持其记录值。

## 2. 范围和阅读完整性

实际34路径在原36条白名单内：21份新增源码／测试，9份本任务文档／输入，4份共享文档追加。全部新增生产文件11份、测试9份及测试helper1份已完整阅读。原身份两个测试未改；既有G1/G2生产、G3/G4会话、v1存档、依赖、正式参数及玩家入口未列入变更。这里的范围结论依据实际提交文件集及补丁，不冒充独立复跑作者834个保护对象检查。

架构脚本报告51 DEC／257 core production files；该既有统计口径包含core目录中的test-fixtures，不能将257解释为257个全新生产功能。本次新测试156项；作者及CI的重复运行不能累加为312项。

五份原输入在主线容器按实际字节重新计算大小、SHA-256与Git blob，全部与输入清单及准确提交的GitHub目录元数据一致。没有修改原输入或新增空白豁免。

## 3. 关键结论

### 3.1 资格与真实任务资产

普通index只导出TerminalError、queryTerminalEligibility和queryTerminalRewardCapacity及类型。资格查询是deliver/withdraw/deadline三个布尔值的白名单，不返回隐藏感染精值、种子或现场原对象。

成功检查当前活动执行、独立稳定前态、返回节点、两个目标和真实背包样本。样本核对稳定来源派生实例ID、定义、数量、ItemState和claimed；地面、另交或假物不变成成功凭证。达标不能改选主动失败，错误意图不自动分流。

内容策略由可信composition注入并绑定真实目录与声明。测试中的任务物取得与事实由明确隔离夹具提供；它们不是已实现的五图生产者。createTerminalAuthority的技术索引绑定完整前态，不拥有第二份可变current，也不证明调用方从未丢弃全部历史。

### 3.2 正常空步骤、期限和死亡消费

planResidenceTerminal在请求、完整前态、资格和已知安全算术检查后私下调用一次G1。正常返回保留真实steps=[]、body/cycle不变、正确return-due及一次revision。期限消费真实有序身体步骤，HP0后没有end-cycle或召回，生还才形成deadline-ready。

consumeResidenceLocationDeath首先检查独立稳定边界及原G2计划签发／完整旧态，再校验原值和步骤。移动、随机揭示、A/C休整的合法死亡均有原生组合测试；A消费增量G1/G2/RNG为0，直接承接原revision。到达已经致死时可保留真实combat-required历史，不伪造生还或启动战斗；活人的未结战斗仍拒绝。

verifySteps检查实际BodyStep链及非自有字段，而不是另执行一次伤害公式。正常返回的空步骤与死亡非空、实际日结非空分别有真实正例及明确故障注入组。测试中的替代错误结果标注为负向故障注入，不冒充原生正例。

### 3.3 钱包、处分和旧历史

唯一运行时终局配置由content模块产生，四键值为120／0／2147483647／20，原生测试对照正式JSON。容量函数是纯守卫；真实launch接线仍归C。收据保留before/reward/penalty/forfeited，不另保存派生after余额。

生还普通物和旧仓保持真实实例／数量／资源；样本、专件和权限各自处分；地面只进入不可访问archive。死亡只把当时仍可用物与余额清退，既成installed/delivered/consumed/destroyed历史保全。所有可用与历史域的实例／ItemState联合校验，不建立第二份可用库存。

两声明历史测试确实从第一次A成功／失败输出，经真实G1出发、正式激活、G2现场建立和移动死亡，再消费A计划。旧任务、收据、archive、处分及旧扣罚不被改写。这是两个明确测试声明复用本期政策的消费者验收，不注册第二个玩家任务，也不证明所有未来任务与交易历史组合已经支持。

## 4. 证据分层及独立执行

| 证据 | 本轮情况 |
| --- | --- |
| 作者开工基线 | 124文件／2791项，exit0；已读取提交中的验证记录，未在主线重新运行该旧基线 |
| 作者最终定向 | 27文件／772项，exit0；包括新增与既有回归，不等于772新增 |
| 作者最终check | 133文件／2947项；新增156、替换0、删除0；architecture/typecheck/test/build通过 |
| 主线读远端CI | 已读取准确SHA对应CI #137元数据与完整job日志；133／2947、51 DEC／257、typecheck/build成功 |
| 主线独立原件核对 | 五份本地输入字节的大小／SHA256／Git blob对照准确提交元数据，全部匹配 |
| 主线独立隔离探针 | 20项，20符合预期；原样queries.ts和dispositions.ts先校验Git blob，再转译执行 |
| 主线未执行 | 原生A公开API、全量npm/check、完整834对象／18链接复跑、浏览器、真实保存与Owner试玩 |

隔离20项包括资格分流、目标和样本异常、远程Day7／非Day7、pending／HP0／关闭拒绝、四结果实物处置、已产生地面结果承接及不分类物品拒绝。替换依赖为same、sampleFor固定夹具、carriedItems、ensure、deepFreeze；没有Zod、完整聚合、G1/G2、authority、settlement、codec。因此这20项只能支持相应函数控制流／值迁移核对，不能说主线运行了20项原生A验收。

主线探针首次因自写夹具少一处右大括号出现SyntaxError，修正的是外部复核脚本，不是仓库源；当次没有用例运行。最终原样源码Git指纹仍相符，20项exit0。此经历保留在复核说明，不冒称作者代码缺陷。

## 5. 保留的后续责任

B仍须新增真正的四态严格字符串编解码和独立expected候选验证。A的内部readTerminalSnapshot不是冷启动安装许可，也不自动等于完整新存档。B须结合旧v1来源实体校验、实际A输出与正式恢复合同补齐自身联合验证，尤其是来源claimed与实体关系、历史收据／周期一致性，以及合法死亡archive与活人pending的区别。

C才持有current和执行完整预编码／提交／写入／通知；保存故障与重入在C重新用真实链验证。A纯重复计算得到相等计划不等于获得重复提交权。无内容静态中枢、旧医院入口／旧槽O3、真实五图、战斗医疗、三专长、工具箱及体验责任不取消。

CI仍报告旧依赖审计告警（2 moderate、2 high）、旧大chunk及runner/action警告。本批未改依赖和构建策略，本报告不将CI通过称为发布安全审计通过，不在A/B范围内自动audit fix或调整阈值。

## 6. 下一步

A在本准确SHA限定PASS，无需返修。按已批准A→B→C顺序，下发独立ENG-RESIDENCE-TERMINAL-RESTORE-001（B）：完整四态聚合、并列v2纯codec、独立expected与原生正反例／历史组合，完成后立即准确SHA实审。

B采用新terminal-index.ts与terminal-controlled.ts分离入口，不修改旧v1 index、validator、codec或G4默认消费者。详细设计、实现、组合测试、自查、文档和普通提交推送作为一个完整Goal；不自动C、不合并main、不强推，不修改Project Sources或项目配置。

本报告附件是有限复核材料，不是完整仓库副本或全npm复现包。原样两源码和全部探针、输入核对、范围／CI摘要及执行限制各自注明身份。
