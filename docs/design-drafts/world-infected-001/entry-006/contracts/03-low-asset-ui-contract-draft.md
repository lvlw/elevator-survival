# 最近工程候选 3：低资产界面与真实首玩

状态：DRAFT；基础和浏览器owner两批准确SHA实审通过后才由主线发工程。

## 目标／来源／待采纳

按[界面合同](../03-first-play-interface-flow.md)、[错误刷新](../06-integration-ownership-and-error-flow.md)、[验收分层](../07-first-play-evidence-and-acceptance.md)实现首个明确DEV感染世界入口。延续已批Stage-First和分级确认，不重选美术、不加玩法。D1仅按最终采纳状态呈现；D2若未采纳则不能注册发布入口。O3不是该批顺手决定。

复用安全facade、已审controller／browserowner、可替换UI primitives与合法现有资产；不直接复用医院StableRun Store或把hospital IDs塞入genericUI。缺图可占位，实际可见敌／物的安全视觉绑定不足时使用泛化占位，不猜真实ID；不得让贴图创造路线、目标完成或精确敌HP。声音重设计、地图美术和最终角色不是先决条件。

## 可能必要路径（仅候选）

未来独立 `src/ui/` 感染世界Shell／Interaction／Presentation及测试、`src/app/`显式DEV接线、content-side安全展示绑定、必要样式。实际任务再列精确路径；不授权重构旧医院UI、S／R或规则。全局DOM／aria／data/title隐藏信息扫描是验收，不用raw getState解决遗漏。

## 必须完整覆盖

- 真无档工具／专长选择→创建first-hub→明确出发；已有初配恢复无改选／重发。
- 稳定房间、只读已知地图、单边Travel Cluster；任务／来源／真实拾放拆合／快捷／药食／分配维护／休整；显式数量、材料、placement、rotation和目标。
- 实际三敌战斗、相对顺序、快捷物消费、退却再入／立即维护；不能从背包隔空用药或开启战中整理。
- 指定样本实际取得／留置／携带／安装与H0交付；主动失败、截止、真实死亡；无后继静态中枢无自动启动／免费夜。
- 每条明确意图一次dispatch；Hover／草稿／关闭零作用。旧选择／重要风险变化使确认失效；动态死亡保护只用已审正式安全事实，不以unknown当safe。
- ready最终刷新、StrictMode、双击、保存失败最新内存／retry、坏档阻塞；隔离槽五停点真实刷新与多页拒绝。

## 检查与停止

新React集成和原P/R/S保护、隐藏DOM、完整默认npm run check、build、diff／范围；浏览器实走至少一条真实正常玩家链和必要终局／故障、记录平台／console。复跑原路线和九组合时保留真实失败，不宣称所有组合所有seed获胜。

交付准确SHA、增量、1dispatch/write/notice计数、浏览器证据和NOT RUN项，停主线实审。Owner先在公开信息下自由首玩，再定向审阅分段与资源负担。工程通过不能替代Owner体验；不得自行平衡调参、补新资产／委托、正式发布或进入下一任务。

## DOC-WORLD-ENTRY-006：UI 候选的正式后继

同范围后继低资产 UI 合同已定稿，继续消费安全视图与受控对象选择，不接 raw current、真实 ID 或生产者试算。仅 D1 当前粗档获得新增公开权限，隐藏医疗目标 Preview 仍 unknown；原 DRAFT 历史不改，当前 UI 尚未开工。

依据：[DEC-053](../../../../05-design-decisions.md#dec-053)、[同范围后继正式合同](../../../../engineering/world-integration/preplay/low-asset-ui-contract-v1.0.md)。本轮文档与 T01 交付仍待准确 SHA 实审；批准／定稿不等于生产或体验验收。
