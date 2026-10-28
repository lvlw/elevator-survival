# A / 当前遭遇的安全呈现键 — 工程契约候选

DESIGN DRAFT，待主线准确SHA审查与另行工程授权。不是本批执行项。

问题与现状：`src/core/residence-combat/player-query.ts::playerCombatFacts`目前投影公开意图、五阶段、nextRelation、resourceCost及actions，未提供敌人呈现组。`src/state/residence-session/player-types.ts::PlayerReadyView.combat`承接该结构；`src/ui/infected-world/components/battle-stage.tsx`因此使用“当前对手”中性占位。不能按当前地点猜敌人，也不能让主题读取完整CombatValue。

交付目标：在当前已进入遭遇的受控查询内增加一个受审、闭合的显示组键与公开中文名，绑定三个既有敌人及各五阶段。非战斗返回null；未知映射保留中性占位并产生不含私有信息的开发诊断。不是新增敌人、数值或未来地点揭示。

拟写范围：上述query与player-types、安全映射的内容侧窄表、对应纯查询/隐私测试及同目录工程记录。需要调整额外宿主时先更新契约评审；禁止UI读取definitionId、instanceId、精确敌HP、raw CTB、风险游标、全图、存档、seed或future intent。资源路径、themeId与素材版本不进入save/expected/core identity。

唯一所有权：现有S/current执行事实，query仅只读公开投影；内容层定义显示组，Presentation把受审key映射到主题目录。普通opaque selector仍由原facade绑定；查询与换皮不新建或替换句柄。缺图不代替动作或更换敌人。

验收矩阵：三敌×五阶段正向映射；空战斗/已终局不透露旧现场；错误组安全降级；同公开状态不同隐藏HP/暴露/种子的整DTO、按钮、标签与诊断非干涉；query多次零revision/RNG/writer；初入/再入/合法恢复保持当前场次；stale selector拒绝且不按名字回退。生产基线须在未来授权SHA实际重跑，不能引用本批设计30项作为生产通过。

不修改规则、38/103配置、战斗生产者、格式v4、浏览器owner、旧医院入口或O3。完成后普通commit/push指定工程分支并停止准确SHA源码实审，A通过不自动执行B/C。
