# 同组件 A/B 验证

从本任务 worktree 运行原 `npm run dev -- --host 127.0.0.1 --port 55681 --strictPort`，打开 `/experiments/owner-polish-20261108/ui-preview/ASSET-AB.html`。页面只操作临时示例计数。离线审查请使用同目录 `REVIEW.html`。

1. A 用正式默认 `ActionButton` 和 `NpcSlotPicture`。B 只把 `source` 和 `林岑` 两个槽位映射为 `action-search-b.svg` 与 `npc-lin-candidate.png`。两次渲染共用按钮、插图组件及候选公开动作。
2. 独立 Edge 157.0.4341.42、1440×900、DPR 1 实测图标 16×16、人物框 320×420，A/B 尺寸与位置完全相同；命令文案与 12 精力示例相同，点击计数依次累加。
3. 旧 A 图像卸载后触发迟到错误，B 图保持。损坏图退到无图／文字，未知人物不映射身份，未知物品使用原占位；返回 B 可以加载。动图模式用真正 GIF，原生 `prefers-reduced-motion: reduce` 切换静态。
4. 正式 UI 默认映射、命令和 Core 无候选导入。实际游戏的行动与保存另由原 DEV React 路线验证。

原始对照见 [A 正式默认](screenshots/05-assets-a.jpg) 与 [B 候选](screenshots/06-assets-b.jpg)。最终编码上的实测收据在 [浏览器 JSON](evidence/final-assets.json)。
