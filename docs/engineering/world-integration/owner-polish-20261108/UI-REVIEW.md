# UI 与动态图审查

离线候选入口为 [REVIEW.html](../../../../experiments/owner-polish-20261108/ui-preview/REVIEW.html)。页面覆盖探索与流血、战斗、成年林岑会面、死亡后新尝试四态。参照 Owner 图中的冷暗医院与旧金控件；原参考图保留为输入证据。离线按钮只改变候选样本，不调用游戏或保存端口。

实际游戏验证使用干净 Edge 临时上下文。1440×900、DPR 1 原 DEV React 从首次设置出发，经大厅和隔离走廊进入真实战斗。第 6 次循环观察到流血，正式快捷用药后不再流血；第 9 次循环死亡。取消新尝试后旧 checkpoint 字节完全相同。确认另一工具、专长后保存新 generation，重载恢复新中枢。1366×740 实测战斗按钮区域完整，页面无横向溢出。战斗按钮实测高 36 CSS px。屏幕中流血徽标使用安全当前状态；没有可安全消费的新伤势回执时只保留持续警示。

稳定流血与非战斗医疗另以 [TEST-only 夹具](native-bleeding-fixture.html) 固定 5 HP 和流血，在真实 React 走身体入口、物品选择、正式 0E 预览及提交。生命 5→6，流血结束，revision 1→2，刷新不重发用药。该边界与上述从新档开始的真实路线分别记录。

| 实际证据 | 内容 |
| --- | --- |
| [战斗](screenshots/01-battle.jpg) | 已知敌人阶段与紧凑操作 |
| [持续流血](screenshots/02-bleeding.jpg) | TEST-only 身体边界在实际 React 的稳定警示 |
| [死亡](screenshots/03-death.jpg) | 正式死亡、新尝试和原行动记录 |
| [新中枢](screenshots/04-new-hub.jpg) | 受控替换后角色 |
| [A](screenshots/05-assets-a.jpg) / [B](screenshots/06-assets-b.jpg) | 实际 React 资源槽位对照 |

视觉候选在独立 Edge 1440×900 和 1280×720 实播。两个 image_gen RGBA 原帧转码为 512×640、2870ms＋130ms 的 2 帧 GIF，保留透明与静态备用。设备 SVG 实播 3.6 秒循环；受击为一次 460ms CSS 界面反馈。两帧纹理略有漂移，适合节奏审看。素材记录与播放证据见候选目录的 VISUAL-NOTES.md 与 candidate-browser.json。
