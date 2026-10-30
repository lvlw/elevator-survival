# A：当前遭遇公开呈现查询技术合同 v1.0

状态：本工程限定批准执行。来源与授权见 AUTHORIZATION-AND-STATUS.md。
本合同不创建玩法、场次、敌人或存档版本。

## 1. 目标与新增公开值
现有 PlayerReadyView.combat 已提供 intent、enemyStage、relativeTimeline、energySettlement 和安全 actions。
本批只增加 `combat.opponent`，用于当前敌人名称与未来视觉组选择。

对实际已识别的三种当前敌人，新增字段为只读值：
```ts
type PlayerOpponentPresentation =
  | Readonly<{ kind: 'known'; visualKey: 'infected-orderly'; name: '感染护工' }>
  | Readonly<{ kind: 'known'; visualKey: 'infected-porter'; name: '感染装卸工' }>
  | Readonly<{ kind: 'known'; visualKey: 'infected-technician'; name: '感染技术员' }>
  | Readonly<{ kind: 'unknown'; visualKey: null; name: '当前对手' }>
```
这些是本包指定的公开分类，不是 instanceId/definitionId 的透传、编码、哈希或动态拼接。
名称来自当前已采用的三敌设计表达；不允许增加第四敌人/背景故事/能力描述。
生产查询在 combat 非空时必须明确产出 known 或 unknown；不得悄悄省略字段。
无当前战斗时沿用 `combat: null`，不新建 opponent 的全局缓存或历史字段。

TypeScript内部组织可用等价闭合类型；输出字段、含义和不泄漏边界不得变。
兼容性如需要，可以让旧构造输入接受缺省映射，但真实查询输出仍必须明确。
不能为了满足新必填类型跨白名单批量改旧fixture。

## 2. 当前来源与分层
- 从现有已校验 CombatValue 的“当前活跃场次”识别敌人；不能根据地点、地图、上次战斗、当前贴图或某个样例序号猜测。
- 当前工程已声明内部 definition 为 infected-world-orderly / infected-world-porter / infected-world-technician。它们只能在可信内容映射/查询边界内部使用，不进入安全DTO。
- 首选实现：内容侧唯一闭合表/纯映射，经现有 PlayerLabels 的兼容可选受控接缝供 state 查询使用；新增 state helper完成当前场次门禁与显式投影。
- 内容表不得 import state/app/ui；core不得 import content；保持现有依赖方向。结构兼容可由TS推断实现，不为此引入通用依赖注册系统。
- 可选标签接缝缺失时输出固定 unknown，旧三个 action/source/place 调用者不必全量修改。
- 查询只构造新的公开值，不把整个敌对象、映射对象或callback返回对象用展开运算直接复制到DTO。
- 预先错误的 CombatValue/恢复/身份绑定仍走原严格拒绝路径。unknown仅代表“有效当前战斗无法匹配受审呈现组”，不是吞掉坏状态的通行证。
- 本批不引入新的公开诊断字段、回调通知或console输出。开发排查信息放测试/交付记录，不输出私有标识。

## 3. 旧公开值与阶段含义必须保持
保留原 intent、enemyStage、relativeTimeline、actions、resourceCost、配额和选择器的行为。
五阶段继续复用 selectEnemyHealthPhase 的正式返回值：
healthy / wounded / severely-wounded / critical / incapacitated。

特别注意：现有选择器对“正HP但低于某比例”的情况也可能返回 incapacitated。
所以 visual stage 不等于 actual death；不得将其强行解释为HP0、胜利、终局或不可再行动。
不得复制/调整阶段阈值，不能在UI/映射表重算HP百分比。
真实HP0终局之后是否仍有当前战斗，遵循既有current；本批不能为补第五阶段而伪造活战斗HP0。
3敌×5阶段的资产组规格可以完整列出；原生可达状态按实际实现验证。
不能通过提高敌HP、修改配置或造不合法history来凑覆盖。

## 4. 只读、生命周期与隐私
- 重复query、preview、describeAction、展示组解析应零规则生产、零RNG、零签发、零IO、零current替换、零revision变化。
- 复用原opaque selector与句柄生命周期；不因视觉信息重建PlayerContext，或按名字寻找第一件对象。
- 退却/胜利/死亡/静态中枢/未出发/阻塞态不得留下前一敌人呈现信息。
- 再入与冷恢复只读当前有效场次；恢复不补演出、不额外写入。
- 保留原知情支付、隐藏医疗unknown及不泄漏当前秘密的约定。
- 同一已公开敌类别、同一已公开阶段和其他公开事实相等时，改变种子、执行ID、实例ID、隐藏暴露和阶段内精确HP，完整公开输出和错误不得不同。
- 对未进入战斗的不同隐藏远端敌人，仍然 combat=null，不新增节点标签/图片预载提示等可见差异。
- 这是公开“当前对手类别”的有界新增；不同已公开类别输出不同名称/组是正向控制，不要求把三类敌人强行投影成同一值。
- 查询结果冻结且不能反向修改current；不得将 visualKey/name写入save、expected、mission身份或命令。

## 5. 向下兼容与范围
旧24字段合同仍是历史/既有字段权威，本批只追加受控字段，不重写旧JSON、不称25字段已全量重新采纳。
不添加普通PlayerSession运行时方法，不改其精确七个导出方法集合。
旧低资产UI本批不读取新增字段，因此界面外观不变；后续另审接入。
内容标签接缝只用于可信composition，不提供任意主题输入、远程加载或脚本执行权限。
未知呈现的中性文字是异常安全降级，不构成正式UI占位图美术验收通过。

## 6. 本批交付与冻结
实际实现、完整测试、禁止字段对照、真实3敌接入证据、完整旧输出等价性证明。
完成后停于本工程准确SHA实审。A通过不自动开工B/C。
