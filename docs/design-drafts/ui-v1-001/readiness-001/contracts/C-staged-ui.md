# C / 分阶段呈现接入 — 工程契约候选

DESIGN DRAFT；A/B准确SHA通过、所需美术槽逐项获批、正式工程任务另发后才可开工。当前18背景2×和透明清稿仍OPEN，本批不得直接成为全面换皮任务。

实际现状：React低资产入口在`src/ui/infected-world/`，独立DEV选择沿现有入口；`use-browser-owner.ts`订阅BrowserOwner；`components/game-shell.tsx`、`battle-stage.tsx`、`inventory-panel.tsx`、`action-form.tsx`、`action-information.tsx`、`confirmation-layer.tsx`分别负责壳/战斗/携带/参数/只读说明/保护。安全行为仍委托`controls.preview/describeAction/execute/confirm`；不导入本原型flow-context或SCREENS定值。

建议首段交付：在获批槽内接入主题目录的静态解析和壳组件，保留中性占位作为未通过美术槽的明确回退。接口A供当前敌组，B仅消费已提交演出。先接玩家文案、物品菜单与背包/快捷/装备真实对象；再在同一契约明列允许的舞台与FX。未获批槽不伪装成已完成高清，不复制生产状态。

拟写范围：上述UI组件、主题呈现目录与对应UI交互测试；实际精确文件白名单须未来任务给定。禁止core规则、参数、save/expected、依赖、CI、旧医院默认入口、浏览器持久化策略和O3。asset/theme键只属于Presentation；安全组键不作为玩法command或物品身份。

验收：同一当前状态换主题/放大/查看/减少动态零dispatch与writer；opaque对象跨菜单、参数、确认保持原引用，stale失败不替换第一项；L0只读/L1完整一次/L2补参/L3既有保护；样本谨慎/直接与四护具条件完整支付、无隐藏概率；死亡/异常/已关闭查看不跳成健康示例；save-failed/冷恢复/失锁信息真实。五桌面档及390压力视口真实6×4、foot/hit与包络；真实缩放须未来重新测试，不能借R2历史截图。

停点：每个授权切口完成代码、实际测试与范围审计后提交准确SHA，等待主线及Owner体验。浏览器快照/静态图/主题schema通过不等于玩法、存档或最终美术验收；不自动展开下一段。
