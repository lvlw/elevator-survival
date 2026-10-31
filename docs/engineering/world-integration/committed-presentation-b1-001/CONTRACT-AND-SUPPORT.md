# 支持、生命周期、隐私与自查

这是作者实施与测试记录，不是主线PASS或Owner体验批准。正式范围为本包 [B1合同](inputs/B1-TECHNICAL-CONTRACT-v1.0.md)；旧B候选在本B1同范围被局部替代，历史原文不改。

## 生产接口与唯一来源

facade从原严格解析 `CombatSessionCommand.kind='combat'` 的内部枚举映射 basic-attack/signature/temporary-attack/defend/retreat/quick-use。它只在原dispatch、同步与最终query正常完成后增加 `committedAction:{action}`。拒绝/非combat无该属性。没有重复dispatch、CTB、规则或随机调用，S/current/pre-encoding/save/expected均不改。

controller在executeCaptured同步操作窗口从正式纯query取得前态；不把snapshot当事实源。原run/adopt/publish/Feed代码保留。成功返回后才签发payload，显式复制A三字段、原阶段、后态point和持久化，sequence恒一条 `{ordinal:0,actor:{role:'player'},action}`。不读取raw commit、trace、精确敌HP、内部响应数、资源、clinical、来源或历史，也不依靠菜单、label或HP差分类。

额外query捕获失败不能阻止原本明确请求的原动作。保存该故障后仍调用原execute一次；原执行/投影异常照原通道传播，原execute正常完成时再暴露捕获异常并走原run的不确定反馈，不签发token。仅捕获阶段误抛业务类异常时局部转换为带cause的普通Error，防止已提交被包装成业务拒绝。没有吞程序异常或让旧测试改为期待动作未执行。旧保护errors.test.ts实际检出了首版时序偏差，修复仅在controller。

每controller一个独立冻结空scope及局部ordinal；与现有player-context选择scope毫无共用。只有实际附加payload时递增，从0开始。最后安全整数之后私有计数变null，固定省略presentation并保持原committed结果，永不回绕或保存；边界是纯函数证明，不声称实际执行了2^53次。Readonly/freeze覆盖载荷、token/scope、opponent、sequence及内部actor/记录。

## K01—K20验收定位

文件简记：F=`src/state/residence-session/player-committed-presentation.test.ts`；N=`…/player-committed-presentation-native.test.ts`；P=`…/player-committed-presentation-privacy.test.ts`；A=`src/app/infected-preplay/committed-presentation.test.ts`；L=`…/committed-presentation-lifecycle.test.ts`；C=`…/committed-presentation-consumer.test.ts`；B=`src/app/infected-browser/committed-presentation-forwarding.test.ts`。完整路径和实际用例名见 [测试清单](TEST-INVENTORY.json)。

| K | 实际证据、层次与边界 |
| --- | --- |
| K01 | F六枚举/未来枚举与非combat纯映射；N相同翻译label不同opaque选择；A六类实际正式提交。NATIVE_FROM_VALID_TEST_PRESTATE + PURE |
| K02 | A六类每次combat/CTB/plan/current/write/batches各1，draw按真实动作0/1等；L两界面发布及双监听/抛错/重入；原S计数不改。实际记录见JSON与raw targeted日志 |
| K03 | A三敌退却再入及前后A阶段；P同地点A unknown真实组合降级；A纯投影unknown/unavailable；不按地点猜敌 |
| K04 | A六类固定“发起动作”一条；装卸工首防御无到期响应/无实际损血仍一条。已执行敌方响应中的零伤在现有profile不可达，纯配置证明为全部damage>护具减免且防御比例>0；不修改伤害/HP制造。零击中/受击含义不在B1 |
| K05 | A合法TEST武器耗尽边界＋原生8防御＋临时攻击，内部2响应/2队列项、公开1条；原生CTB只调1次 |
| K06 | N真实最后耐久1支付请求3仍全效果、真实最后快捷单位治疗/消费、旧选择零提交；两者保留旧query支付依据 |
| K07 | A真实胜利、敌仍活死亡、敌归零后玩家流血死亡；最后null阶段对应真实stop，不推断获胜；死亡只消费/关闭1次 |
| K08 | L跨revision/只读/同步/失败保存retry不增ordinal，A三敌退却再入同scope；C/B新controller scope不同/首条0；A安全整数边界是PURE，不伪造超长原生 |
| K09 | L真实executeDraft，以及simultaneous原生链的动态保护combat confirm；取消/拷贝/跨controller/stale不提交。没有把metadata伪设true |
| K10 | L保存失败继续两次动作各1token，原disk保留；retry仅保存最新current、无payload、旧persistence仍save-failed；原保存计数expectSaveOnly继承 |
| K11 | L query/preview/describe/getSnapshot/sync/draft/cancel/拒绝零玩法；订阅只有旧snapshot、无presentation，重入拒绝；签发仅direct return |
| K12 | L原合法生产者形成五停点，独立expected在候选读前固定，真实v4冷恢复无写入/stock/RNG/notice/feed/旧token；战斗恢复后的首个真实动作ordinal0 |
| K13 | B实际headless owner同对象透传combat execute/executeDraft，真实非combat confirm也同对象；combat保护confirm由L原生证明，未声称同一browser案例也覆盖该分支。suspend/dispose/模拟平台锁请求拒绝后旧controls失效，reacquire新scope；post-commit通知中dispose可保留direct return但消费者丢弃，不回滚commit |
| K14 | C从真实结果取得token，假时钟/单scope高水位/单pending去重、取消、skip/reduced、scope替换和迟到回调；回调无command/save/玩法端口。只证明TEST协议，不是实际动画体验 |
| K15 | P真实seed/execution/item/battle身份差异、同档隐藏病程/暴露、原生退却/维修/休整/再入后同阶段不同敌HP；先验证完整公开前/后态相等，再比较全载荷和错误，scope引用一对一重命名。公开敌组/阶段改变作正控 |
| K16 | F私有command/label抛错getter；A在combat/opponent/执行对象/后态放额外私有字段和抛错getter，输出只显式闭合复制。既检查所有keys和冻结，也实际证明不读这些getter |
| K17 | 开工准确base在仓库外采集26固定记录；F在同一宿主用准确base的TEST-only facade/controller函数体作为活oracle，剥离仅一个新增属性后全字段、数组顺序、opaque拓扑、current/save字节摘要及所有计数严格对等；不排序或删除差异。独立Win捕获的current/save/RNG摘要仍作额外oracle。非combat移动开战无新增属性；受保护旧errors测试也保留并复跑 |
| K18 | 两处旧观察仅精确键集单次适配；其余原A39/B观察14、query/选择/保存/controller/owner/UI/content/E03均由组合与最终默认check实际回归，数量不重复相加 |
| K19 | 仓库外N01错误retry token/N02响应数扩序列/N03selector scope/N04私有battle ID四独立变异，被相应用例AssertionError检出；正控通过，排除语法/加载/TypeError。生产修复后重新绑定并复跑，初次记录保留 |
| K20 | 精确base/tree、新分支、源blob/输入/受保护对象/两处适配/字面纠正/标准检查、轻包与独立push回读分账。最终对象/CI放包外层准确回执 |

## 生命周期与不可达/未执行项

| 情形 | 实际结果 |
| --- | --- |
| 正常六类combat提交 | 每次直接结果1个冻结payload，token同scope严格递增；非通知事件 |
| save-failed后继续／retry | 前者新真实动作新token；后者只写最新完整current、无token，旧payload不改 |
| query、查看、同步、取消、业务拒绝 | 无payload/无ordinal消耗；原作用域失效照旧 |
| 前态捕获或原执行/投影异常 | 错误可见、不重演、不补token；已提交的动作不回滚或伪报可重试 |
| 冷恢复五停点 | 显示保存状态，不重建动作；新controller独立scope，首次正常combat从0 |
| loss/suspend/dispose/视图取消 | 只失去本地消费权，不改已经发生的current/disk；晚回调被TEST消费者拒绝 |
| living-hub/first-hub/blocked后态schema | 由纯安全投影覆盖；真实combat命令直接回living-hub/first-hub不可达，不伪造原生路线 |
| 动画/真实减少动态/真实浏览器多平台 | NOT_RUN；本批只headless BrowserOwner与TEST消费者，不宣布React/素材/Owner体验PASS |

## 自查与继承门槛

重新从反例检查了scope混用、通知发token、保存失败误拒绝、null阶段误胜利、raw对象多字段透出、消费者回调二次提交；四语义负控实际检出。新纯辅助仅type import，不导入TEST/核心生产者。原run/adopt/Feed、S/current/save/expected、BrowserOwner、core、React/主题/素材、依赖/CI都保全。自查属于AUTHOR_EVIDENCE，不称独立主线审查。

初次测试的菜单顺序、零伤假设、模拟锁释放，以及新测试的浏览器HP字段/Node类型适配均已修正，原始失败保留。组合首次发现的真正生产兼容偏差单列在验证记录；未改旧测试应对。

三份历史最终专项原件缺口、19逻辑资产摘要风险、18背景原生2×、alpha/Owner观感/首玩/分段九组合体验、依赖完整公告/可达性/修复版本、仓库保护、O3、商城/身体服务/未来委托继续开放。CI177的7项安装摘要与本机audit404并存，不升级或倒改旧时点UNKNOWN。B1不修素材清单，不公开逐击命中/敌响应，不自动开始B2/C或合main。

## CI178后的TEST-only可移植性修订

首次提交f1ce08e5的CI178有24个新增对照断言失败，原因是原受保护查询使用默认localeCompare：Win采集公开菜单顺序与Linux不同。原运行源码和旧测试均不改。本目录新增BASELINE-ORACLE-PROVENANCE，准确base两函数体仅改导出名放入获准TEST fixture；baseline通过protected coldRecord和旧wrapper独立bootstrap，完全不调用新facade。共享query/core/S及辅助依赖由对象保全证明不变。原Windows26记录原字节保留，新增en/zh-CN强制排序正控证明真实顺序确实不同，各同环境新旧结果仍严格等序、全字段、全计数/字节相等。没有把新实现当作oracle，也没有规范排序掩盖偏差。新增测试最终74项，原73项结果保留为其时点。

历史探针case ID `move-enters-battle` 实际是H0→H1普通移动，名称偏宽，原捕获不改写；真实非combat移动开战由A测试中三敌退却后正式再入场直接证明，并断言无presentation。
