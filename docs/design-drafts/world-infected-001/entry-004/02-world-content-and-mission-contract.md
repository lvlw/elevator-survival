<a id="doc-world-entry-004"></a>
## DOC-WORLD-ENTRY-004 采纳附记（2026-10-05）

[Owner实际批准](adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md)、[DEC-052](../../../05-design-decisions.md#dec-052)：仅当前新感染委托的获批子集生效。

获批24节点／29连接及本执行任务件来源以正式数据为准。受控提取、真实搬运、安装和指定样本联合资格仍须生产实现，不能由调用方上传完成事实；来源份额与已处分历史守恒。

样本谨慎／直接两方案均保留；下文“谨慎且外套有效”只属旧有限路线条件，不限制正式玩法。H2只按choices／weights／unit抽一分支，正式配置无grant.H2-random，不能固定多送消毒剂；局部初态与外部战斗轨迹不迁入内容。

当前依据：[唯一103键试用配置](../../../content/infected-world-entry-test-config-v0.1.json)、[限定五图内容](../../../content/infected-world-entry-content-v0.1.json)、[E01-P首契约](../../../engineering/residence-foundation/content-supply-core-contract-v1.0.md)、[来源恢复合同](../../../engineering/residence-foundation/content-supply-restore-contract-v1.0.md)。

---

以下为612ac6673223cc93237184892e6713e789a9dce1时的历史正文，保留原字节；已覆盖子项的旧待采纳／候选表述以上述批准为准，其余不因本附记自动获批。

# D01：真实五图与任务生产者候选

DESIGN DRAFT。数据唯一入口：[content-candidate.json](content-candidate.json)，新增数值唯一入口：[parameter-candidate.json](parameter-candidate.json)。地图源为[原地点设计](../03-location-design.md)，事件源为[事件包](../06-event-pack.md)。H/T/P/L/C及原物品ID承接，不以新run/day/标题刷新来源；两新任务件ID仅Draft映射，不注册rulesVersion或玩家任务。

## 图与知识

24节点、29双向连接。H0正式返回点；H6/T1/L5/C4为A休整，其余表中C仅在危险处理后的稳定边界可用。世界内回访、跨图、原位休整和保存继续不等于重接。当前委托关闭后无可重开的同世界入口。

到达只揭示surfaceEdges和当地可观察来源标签，不公开隐藏边、抽签结果或敌人精确随机游标。C5调查才揭示侧门；调查和解锁分别付`investigate`，然后按`move.side`移动。H3-H4每次须真持卡；H1-H4须已开消防门。C4旁路须调查并解除卡件，不视为击杀C2。敌人存活的受阻节点不能靠休整/返回清pending。

## 受控动作与提交

玩家意图仅含当前绑定、expectedRevision、actionId、选择方法、真实instanceId/quantity、合法目标及明确格位；completed/supported/reward/完整后态均拒绝。身份、知识、数字、材料与格位先验，再制作不可变提案；任何失败零扣能、零扣物、零事实、零随机消费、零current安装。合法动作一旦产生HP0，保留已真实发生结果并交A死亡，不用重算恢复前态。

| 生产者 | 合法前置 | 真输出／处分 | 成本与重放 |
|---|---|---|---|
| P1 power-survey → power | 身在P1、已调查、稳定、E>0 | 只把本执行power变真；不发可携组件 | `survey`、`restore.power`；已真拒绝 |
| L2 verify → fix → component | 清除装卸工、核对；工程/方法仅二选一优惠 | 一件控制组件，提取与明确入包同事务；放不下不先领取 | `verify.*`、`door.manual`/`door.crow`/`fix.method`、`extract.part`；来源一次 |
| C1 match → C3 module | 真到C1核对；循C2危险线或C4真实旁路到C3 | 一件启动模块，非ordinary，受控搬运不改身份 | `verify.*`、`extract.part`；不能由客户上传matched |
| H5 sample | H4危险已解除、真在H5、实际防护与选择 | 指定样本原来源身份；保留执行、ordinal和资源，不能拿同名物顶替 | `extract.sample.*`、`sample.*`；谨慎且外套有效为本轮路线条件 |
| H8 install | power真；携实际组件、模块、金属、电子；E>0 | 消费`install.inputs`，任务件/材料进入installed历史，transfer一次变真；不留下可再次安装的原件 | `install`；欠任一材料整笔拒绝；旧处分不改 |
| H0 deliver / withdraw | 稳定且活着；成功必须power+transfer及本执行指定实带样本 | 沿用A真实处分与唯一终局奖励；失败按已批条款；正常G1 steps=[] | 成功/失败意图不得互换；关闭不可重接 |

任务搬运需要新增受控task-transfer合同，仍真地面/包格/负重校验。拿到样本并非自动交样；任务件地面、错执行、错实例、已移交均不满足成功。不能把G2普通pickup改为任意nonordinary放行。已提取部件可留地面再取；安装后不可逆出原件。永久丢失导致本次无法完整履约，允许合法失败，不补发。

## 来源、工具箱和酒店

固定来源表只引用`grant.*`；世界可搜口粮6、金属4、电子2、布料1、电池3、绷带2和卡1，初始绷带另记。主要搜索产生地面真实输出；拾取可在E0免费，但仍须容量、权限和具体放置。固定与随机输出各有一次来源，不能读档重抽。

H1工具箱首次开门按`door.toolbox`、`wear.tool`并揭示`grant.H1-toolbox`，电子留地面待显式拾取。先用撬或卡打开后不能补领电子。普通替代仍可通行，无额外专业暗锁。H1电子用来维护会和H8安装竞争，路线必须另从L3或C4真取电子。

T1以真实绷带及消毒剂换口粮，`exchange.inputs`、`exchange`、`grant.T1-exchange`一次；先验证交换后格位，再整体扣物和入包。不接受远程仓库或已消费物。H1/H2随机权重沿实际旧医院数据列入本地Draft，未获本轮采纳；有限模型只显式给分支，不验证抽签概率；无消毒剂时酒店换粮路线不成立，可走物流固定粮。H1随机为电池/布/电子，H2随机为消毒/镇痛/急救/抑制，H3没有随机附加；均不作最低保底。

## 四条逐动作见证与真实限制

完整动作、D/T、E/HP/食物、实际格位、耐久、来源、处分、安装进度在[fixtures](validation/fixtures.json)与[results](validation/results.json)按相同route ID对应。每条动作是固定输入，不在检查时动态找路或送资源。

| route ID | 实际差异 | 未证明的部分 |
|---|---|---|
| route-hotel-bypass | H3取卡→H4/H5样本→物流取组件/粮/电子→P1供电→C4旁路取模块→H8装接→H0 | 未访酒店；依赖两场外部战斗结果 |
| route-hotel-benefit | 手电搜索耗真电量；H2条件消毒→T1交换并A休整，多走酒店路径 | 随机分支条件成立才有交换；未证明其概率或总收益优于绕行 |
| route-segmented | H4受伤退却，敌HP与游标留存；包扎/休整后回访击败 | 不重置敌人；外部退却和二次战斗轨迹尚非CTB可达性证明 |
| route-toolbox | H1专业开门/真电子→专业维护消耗金属与电子→物流补足安装材料，之后完整主线 | 维护非必要却用于暴露竞争；电子不足应拒绝安装，不能补发 |

四条条件路线在第五任务日结束，结论仅限固定动作与外部战斗输入；体力不足须先真实休整，食物先吃再日结。没有新建九条赢线。CTB/RNG未支持是下游明确验收缺口，不能称试玩或完整世界可达。

## R1：任务身份与来源联合约束

有限模型保留原单位表示，不创建事件系统：component／module／sample须对应声明的单一原始份额，绑定本次execution；领取事实、声明输出、活单位和已处分份额同时一致。无claimed、有额外ordinal、错执行或错定义均在搬运、消费、安装／终局前拒绝；不能用总数相同掩盖缺来源。安装仍将原件和材料移入installed，样本仍须真实在包；已交付件不重新可用。

校验同样覆盖已安装／已交样份额，且不改写处分。普通历史物资不被强制改成本执行，不重建旧物；有限夹具允许明确的普通初始／历史锚，不代表已实现跨委托全历史恢复。完整任务事实由受控生产者负责，局部准备态的facts不是全局历史真实性证明。原四条条件路线保持；新增定点链调用实际有限提取、drop/pickup、install和return，不把seedItems称为真实生产接线。
