# 最近三项工程契约候选

DESIGN DRAFT / NOT AUTHORIZED。以下不是本轮执行清单，也不是已批准A/B/C合同的覆盖。先准确SHA设计实审→Owner采纳对应局部条款→正式确定载荷/路径白名单→单项执行授权；任一步不能由本批提交自动替代。工程起始SHA须届时重新指定，不能将本设计基线假定为未来最新工程基线。

## E01：真实任务生产与稳定点自救/消费证据

**目标与独立结果**：在隔离但真实受控内容绑定中，角色以真实例完成供电、组件/模块提取搬运、转运安装、样本携回，由现有A结算；药食/维护及部分消费可保存恢复。每个事实来自真实生产者，不靠fixture把completed置真。整五图通关含战斗留给E02/E03，不删敌人伪造第一项已可玩。

前置批准：D01的动作/物件/格位/来源；D03战外药食、维护和有限份额历史；D04首次真实发放与驻留锁定语义。38正式配置不重开。此Goal不引入CTB活态、UI、浏览器、商城、重接、任务SDK或第二钱包；三专长中战外效果接线，战斗首绷由E02完成。

唯一所有权：现有mission-lifecycle管身份/关闭；G2 site管位置/来源/事实；G1管body/周期；carried/ground/warehouse唯一实物；ItemState唯一剩余资源；A管结算/处分；B验整体；C唯一current。新任务/药食模块是受控生产者，不提供通用setFacts或安装外部snapshot。

**候选API（尚不存在）**：`planResidenceTaskAction`、`planResidenceTaskTransfer`、`planResidenceSupplyUse`，接收经严格schema校验的绑定/revision、actionId、instanceId/数量、目标及明确placement；从控制catalog决定前置和结果。返回带真实能力的不可变plan，包含受控来源/消费分配、真实后态和身体步骤。只允许模块内部签发，用户不能上传plan、reward、支持标志或完成事实。

提交顺序：检查原值/阶段/身份/来源/目标/数量/材料/空间→本地私有提案真扣实物、产生效果/事实→验证与可编码→C一次commit→保存。生还提案不得越权变周期、奖励或旧历史。合法HP0只交A消费原动作能力；A需新增窄的来源类别与步骤验证分支，不重算G1、不伪造非空步骤；旧G2死亡和正常H0空steps必须保持。故最小修改A/B/C有必要，不能一面禁止触碰基础模块一面要求新状态通过。

B将现有整输出不变量明确演进为有界份额守恒；不能只删除validateTerminalEntityHistory。codec版本/兼容策略必须在定稿合同单列：旧v1/v2按原reader拒绝未知结构；未来新格式有受控显式版本，没有静默迁移、自动清槽或重新发初始配装。保留旧签发能力隔离，跨版本提案不能混用。

**建议路径（不是本轮或未来自动白名单）**：新增`src/core/residence-task/`、`src/core/residence-supply/`、`src/content/infected-world-v0.1/`为候选目录；已有`src/core/residence-location/{catalog,validation,identity}.ts`、`src/core/residence-terminal/{plans,settlement,dispositions,validation}.ts`、`src/state/residence-save/terminal-{types,history,validation,expected,codec,policy}.ts`、`src/state/residence-session/terminal-{types,commands,context,transitions,session}.ts`为需逐文件评估的现有接缝。邻近测试及正式合同/状态文档需届时精确列路径，不能目录一概授权。不改旧医院生产规则和已批数值。

**原生验收链**：真实初始发放→揭示普通来源→显式拾放→用药/拆合→过合法周期→受控任务提取/移动/安装→携本次样本→A成功→B冷恢复→C关闭不可重接；每一步真实来源及能力。若从隔离稳定危险后状态开始，必须注明只验生产者链，不能声称全世界CTB通过。

**必需拒绝与组合**：错实例/错执行/地面/已交样不成功；材料/容量不足零提交；任务件不ordinary；非法NaN/负值/布尔/超安全整数先拒绝；无目标/HP0/E0付费维护拒绝；真E0免费自救通过；拆合与消费守恒、重复请求/旧plan/伪plan拒绝；安装/消费后不再可用；正常空steps、真实死亡非空原steps；保存写失败后current仅一次，retrySave不重做；坏档不fallback，旧成功处分不倒改。

完成检查：针对修改模块正反例与联合链，架构/typecheck/全部生产测试/build及diff/白名单/正式配置字节一致；记录真实起始/最终测试基线。详细保存兼容与随机游标测试不可省。普通提交/指定分支push后，交准确完整SHA等待主线源码实审；不因E01完成自动执行E02。

## E02：活战斗、分段退却与战斗药物的受控恢复

前置：E01准确SHA实审通过，D02 CTB/E/流血时序及活态兼容方案正式采纳；补齐三敌人及动作风险的确定数据（本批未通过真实CTB）。目标是完整遭遇→玩家/敌动作→真装备/药物扣耗→合法退却→休整→原敌继续→胜利或真实死亡，冷恢复可在每个允许停留边界继续相同意图/游标。

建议改动既有`src/core/combat/`与`enemy-persistent-state.ts`相邻实现、候选新`src/core/residence-combat/`，及G2 pending/知识接口、E01来源消费、A窄死亡消费、B/C活态接缝与邻近测试。路径待独立定稿；不复制旧scene runtime或另造全游戏状态。战斗唯一plan联结G1 body、装备、敌人和游标，C唯一current；UI不能指定伤害/随机结果。

独立支持：CTB真实调度、管基本/蓄力、防御/合法退却、快捷绷带/镇痛、持续敌人；排除新武器词条、新任务、浏览器及旧医院改规则。原生要求：E0触发不能跳过；退却不重置敌HP/风险/日额；存档继续不重抽；主要效果→应有流血→死亡短路；退出E只扣一次，无Scene Time债；错意图/游标/来源/HP/伪steps拒绝且零安装；活态保存失败重试不重放；正常/末日A回归不变。

完整检查同E01，并以真实CTB重做四路线及失败证据，不把本批外部战斗fixture算通过。交准确SHA实审后才允许下一项，不自动接玩家。

## E03：真实五图长链、九组合与玩家安全查询

前置：E01/E02各自准确SHA实审及正式参数落文；旧医院H1/H2随机权重的本地适用须已采纳；不擅批准O3。独立结果：在唯一未注册玩家入口的headless composition中，真实五图/任务/三专长三工具完整连通，并给只读安全查询；浏览器/UI实现另设Gate。

候选增量：E01的`src/content/infected-world-v0.1/`及独立组合入口/查询目录；现有G2 knowledge、C query挂接及三专长锁定校验；测试和对应正式文档精确路径另列。不得把getState映射为玩家视图。源实例不随读档、回访或专长变化刷新。

原生验收：四条真实逐动作路线加资源耗尽/错误选择的失败；九组合至少局部差异和普通替代，不承诺全部必胜；特定样本/本地设施共同资格；七日正常返回与异地截止/死亡；已消费、安装、交付后的冷恢复；知识等价而种子/隐藏感染不同的非干涉比较；标题/执行ID变化不能重接。药食/维护/工具箱与容量联合压力不能仅看总E。

检查同E01，保存边界及安全查询独立正反例，未知数据拒绝不泄露。交准确SHA和玩法支持矩阵，等待主线实审及后续低资产UI/浏览器授权。O3、长期经济、商城、第二世界、素材建设均不在此Goal悄悄启动。
