# C1 真实浏览器记录

实际使用已连接 ChatGPT 应用内浏览器（IAB），浏览器工具仅提供 visibility/viewport，未提供 media 仿真。生产 React 页面来自仓库原 main.tsx、原 Vite 配置、独立 DEV 入口 `?dev-infected-world=1`、原 BrowserOwner/controls/LocalStorage/WebLocks。不是静态示意、假 DOM、canvas 或设计原型。

原生自然 read-null 流程在任务专用 127.0.0.1:5186 走过 crow/engineer 初选到 first-hub。战斗/死亡采用明确 TEST producer：browser-records.probe.ts 调用既有 P 生产者及严格 codec，browser-test-server.mjs 仅在任务专用空 origin 两 key 都缺失时放入合法 checkpoint；不覆盖既有 pair，不自动 reset。服务只绑定回环，未碰 Owner 日常 profile。故障端口只包原 LocalStorage.setItem 的 checkpoint 写入，转发正常写入，受控抛 QuotaExceededError；诊断浮层只观察 DOM/写计数，不替换 production UI、请求、owner 或规则。

最终证据：5200/defend 先键盘防御，HP12→11，checkpoint1/cue1；skip Enter、local reduction Space 不增计数；改回正常动态后鼠标快捷物品实际提交，HP11→12，TEST失败写一次，checkpointAttempts2/success1/failure1/cue2，显示操作已生效尚未保存。关闭TEST故障后原重试按钮使attempt3/success2，cue仍2，无回播；实际reload恢复HP12和已耗快捷物品，所有会话计数及cue为0，未再次播种。原page离开至about:blank后，同源占用页明确重新取得独占，读同一checkpoint且零cue/写入。

5197/death 真实 strict checkpoint HP1：原防御按钮先出现 L3 保护确认，尚无写入/回执；通过原确认执行后，实际 HP0、终局摘要和战斗按钮消失。采样时反馈 trace 仍 active，终局已经切换；随后落稳。1366 同源第二页面真实 WebLocks occupied，无旧战斗控件、无cue/写入。自动原生链覆盖六动作/五停点/三敌；这些浏览器代表流程不等于全矩阵人工体验。

六张截图都是 screenshot 原始 JPEG 字节直接保存，未裁剪、缩放、重绘或遮挡浮标。最终 runtime 的19个路径/filtered Git blob保存在 browser-runtime-source-bindings.json，出包时逐项与 final Git对象比较。截图拍摄当时HEAD仍为base、工作区为C1；不伪称已经提交。包外层准确final绑定相同runtime字节，测试/报告后改不改变该绑定。

| 原图 | CSS视口 / DPR | 提供器实际像素 | 内容 |
| --- | --- | --- | --- |
| 01-normal-feedback-1920.jpg | 1920×1080 /1 | 1632×1072 | 实际防御单反馈；提供器返回画面不足整个视口，不能当完整1920像素证据。 |
| 02-save-failed-1366.jpg | 1366×768 /1 | 1366×768 | 原保存失败banner、一次快捷回执、TEST故障浮层；保留旧动作说明与环境浮标。 |
| 03-keyboard-reduced-1280.jpg | 1280×720 /1 | 1265×712 | 真键盘skip/reduce及焦点；提供器尺寸与CSS视口不同，原字节未补齐。 |
| 04-actual-death-1280.jpg | 1280×720 /1 | 1265×712 | 真实确认后的死亡终局和一次防御回执。 |
| 05-narrow-390-scrolled.jpg | 390×844 /1 | 390×844 | 真实键盘滚动到反馈、减少动态及原控件；整页约1834高，需纵向滚动，未声称一屏容纳。 |
| 06-native-occupied-1366.jpg | 1366×768 /1 | 1351×760 | 原单writer占用界面；提供器原始尺寸差异保留。 |

browser-final-screenshots.json / browser-original-image-metadata.json 给出逐帧时间、URL、前后动作计数、长度及SHA256；browser-steps-candidate.json 保留原始 DOM 与实际进展；before-guard/首次未生效点击等旧帧已明确排除，不进入图片目录。原始运行中的屏幕截图API返回尺寸差异原因未核实。它们可证明所显示片段，不能用来宣布完整像素档通过。

布局自查先真实发现1366装饰占位最低160px超出117px行，遮挡行动区域；仅在允许 styles.css 内令既有actors按grid行收缩、敌信息滚动、Feed可见高度适度收缩，保留布局与数据。修后1920/1366/1280/390读取DOM几何，装饰均不再越过行动区，未增加整页横向溢出。390 clientWidth/scrollWidth375一致，24个真实背包格位保留；新增reduced提示后scrollHeight1834。旧前后数据在layout/viewports证据，不把布局DOM尺寸替代原图像素尺寸。

未验证及异常如实分账：

- 实际浏览器 `prefers-reduced-motion=true` 未验证。曾以任务独立profile和force-prefers-reduced-motion启动官方现有Chrome，未暴露可操作窗口；核对唯一profile命令行后停止本次PID9064，PID已消失。第一次非提权CIM核对被系统拒绝，随后已更正并完成，未改OS设置/日常profile。DOM TEST matchMedia true/变化/清理4项通过，不能冒充浏览器媒体仿真或系统设置验证。
- 真实125%/150%浏览器缩放 NOT VERIFIED；CSS viewport override不是浏览器缩放。
- 390 fullPage截图API报Unable to capture screenshot，NOT VERIFIED。交付实际滚动帧，没有拼接；完整1920原像素也未验证。
- 初期1920一次mouse+Escape无提交（计数0）；读取状态后明确键盘提交成功，后续实际鼠标提交成功。resize后一次mouse uncheck未改变状态，读取后用Space成功；未盲目重发游戏命令。原因未核实，不计为成功输入。
- 浏览器两次动作录入间隔1015ms，超过180ms；不称其证明动画窗内连击。确定性真实React/原controls测试在timer未到期时验证下一动作不锁定。
- 旧动作列表在快捷物品消耗后焦点映射到退却按钮并可出现其原说明浮层；C1无自动focus，旧组件未改。作为既有交互观察留待后续独立范围判断；没有自动执行退却。
- 原环境1688浮标/插件节点原样保留；实际采集的tab错误日志为0（详见原日志及精确tab范围），未宣称所有环境/平台无错误。

本项关闭声明覆盖的C1原生代表流程；C16为PARTIAL，Owner人工体验、实际OS减少动态/缩放、完整像素、全平台与正式美术/发布门槛保持开放。
