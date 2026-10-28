# B / 已提交公开演出序列 — 工程契约候选

DESIGN DRAFT，待准确SHA审查和另行授权。可以与A作为小准备批合审范围，但不可借此实现正式UI。

实际接缝：`PlayerExecution`现在只有kind/view/preview；`PreplayResult`有committed/rejected/updated/confirmation-required及snapshot；`PreplaySnapshot.feed`只有ordinal/kind/text。`BrowserOwner.controls`封装现有execute/confirm/executeDraft/retrySave。当前UI不能从feed文案或前后HP差猜命中、伤害次数、场次、掉落或死亡顺序，不能以setTimeout推进CTB。

目标交付：由现有执行/会话受控提交点产生最小公开呈现记录；只在commit之后发布。拟公开字段限会话内不含私有身份的去重token、受审actor显示引用、已发生行动类别、已允许公开阶段前后、有限演出顺序、当前决策停点。token不是新canonical revision，生命周期不落盘；具体字段须与实际提交宿主一起实审，不能先造通用事件总线。

拟写范围：`src/state/residence-session/`中本批另行列明的facade/类型、`src/app/infected-preplay/`controller受控结果投影和对应纯测试；A映射作为前置。只读适配不得影响原S原子提交、prepared编码、expected、writer、通知或RNG。若现有结果不足以准确产生序列，停止该子项列出字段缺口，不在动画侧补第二套CTB。

非干涉：不公开raw CTB、连续敌HP/百分比、内部定义/实例ID、随机游标、隐藏伤口/暴露、未发生结果、来源余量或未来回合。相同公开事实须有相同记录形态与错误信息，不能靠事件数量或缺字段泄露隐藏分支。临床信息仍服从DEC-053粗档。

消费约定：同token最多演出一次；重复订阅、同步、retrySave不得重播。拒绝/取消/旧selector/保存重试不给新行动序列；commit后save-failed可播放已提交结果并单独提示未保存。冷恢复直接展示最新已结状态，不补历史演出；切页/失去使用权/终局/组件卸载取消本地动画。跳过与减少动态只快进呈现，绝不dispatch/扣血/领奖/写档；演出结束不决定死亡或决策资格。

必测：一次commit多次通知、save-failed→retry、rejected、stale、confirm取消、冷恢复五停点、三敌再入、attack/defend/retreat与HP0短路、快速切场/取消/跳过/减少动态、同公开隐值非干涉。用确定性时钟只测展示消费；正式结果仍由既有核心测试负责。完成后停止准确SHA实审，不自动进入C。
