# ENG-WORLD-PRESENTATION-C1-VERIFY-001 — 一次完成W0—W4

## 目标

在生产运行代码保持2de63f7da48d86bcfde280f7beaf08e4ffd42ee3不变的前提下，补足C16真实浏览器媒体偏好生效、完整代表视口和必要键盘操作证据。已有保存失败/重试/冷刷新/死亡代表流程不从零全部重做，但新截图场景必须真实且可追溯。不是把旧原图放大，不让Owner逐项切系统配置。

## W0 基线与能力预检

实读AGENTS、当前任务原件、所附主线AUD、原C1 BROWSER-REVIEW/CONTRACT-AND-SUPPORT，以及UIR有效约定。核对精确base/tree；记录原remote heads，建立新分支和原对象保护索引。实际运行npm run test:run，参考337文件/4858项；参考数字不是固定验收脚本，任何差异必须查清。

先检查当前工具真实提供哪些能力：实际React页面、视口、原尺寸截图、浏览器原生media emulation或受控测试profile偏好、真实浏览器zoom。记录schema/官方能力说明及一次最小read-only能力验证。IAB若仍没有media接口，直接记不支持；不得反复尝试同一无效设置，不能把不可操作Chrome进程当验证成功。可以使用另一个**已经可用且获准**的浏览器接口；不得安装扩展、绕过策略或让Owner手工改系统。

## W1 实际媒体偏好

在新测试profile/任务origin运行原DEV入口和正式InfectedWorldApp/owner。使用浏览器原生媒体仿真让reduce=true（报告明确“媒体仿真”，不写真实OS设置），或在合法可控profile设置并核验。禁止覆盖window.matchMedia、加测试CSS、修改生产时长/React状态来冒充。

先记录native matchMedia true，本地复选框关闭。通过原按钮真实提交一次；既有安全回执仍出现，动态类/实际计算样式/动画观察支持无位移播放，且正常规则/写入计数只一次。随后核对本地开关不能覆盖OS true。

可用native切换时补false→true→false：正在呈现的cue落稳，取消timer不再执行命令；切回不重播。不得放慢生产180ms或伪造时间来凑实际浏览器时序；捕获不到短窗如实保留自动测试层证据，先完成稳定true用例。

## W2 完整图像与布局

补完整1920×1080和1280×720代表视口；1366×768已有一张完整原图可引用，但建议同一运行补一张无TEST遮挡的代表图用于对照。390×844是压力档，已有滚动片段有效；支持原生fullPage时补全页，否则保留明确局限，不升级成“移动端完整一屏”。

每帧写真实CSS innerWidth/Height、DPR、visualViewport、scroll位置、文档scroll/client尺寸、浏览器版本/工具、输出图像固有尺寸及raw SHA256。全viewport截图须覆盖完整视口，尺寸差异必须解释且有工具参数证据，不填充/缩放/拼接。既有1366可承接，但尺寸不匹配的1920/1280不能以文件名宣布完成。

实查舞台、行动条、保存banner、反馈、skip、local reduce、原6×4背包是否可达；键盘聚焦、菜单/说明层不应裁去必要控件。当前工具自然带的浮标原样保留并声明；优先独立干净测试profile。TEST诊断浮层允许在新驱动中预先默认收起/不渲染，计数另存JSON；不得修图或隐藏真正产品UI来制造干净结果。

## W3 能力允许的补充与回归

真实125%/150%浏览器zoom能通过实际UI或原生浏览器能力操作则验证并记录实际zoom依据；不要用CSS zoom/transform或视口override冒充。无法做时写NOT VERIFIED，不将这一可选项单独判为源码FAIL。

能力允许时补180ms未完的下一合法动作，仍一次原提交且不锁定；浏览器短窗未测不抹去既有确定性React测试，也不假称浏览器已测。已有真实保存/冷恢复/终局证据可承接，选择1条代表流程确认新媒体/视口设置没有改变规则即可，不重新穷举三敌×六动作×五停点。

完成默认npm run check；新驱动若有自动测试写实际命令与结果，不虚增游戏测试。生产/旧测试/配置/依赖等所有旧Git对象必须与base相同；浏览器结束后再核对保护、原refs与实际进程清理。只停止自己的服务/profile，不清Owner资料。

## W4 归档交付

在docs/engineering/world-integration/presentation-c1-verify-001/写README、CAPABILITY、BROWSER-MATRIX、来源与限制、逐帧metadata及completion，原输入原字节归档到inputs/。可以自行合理拆辅助文件，但全在该前缀且没有运行期导入。

只交一个MAINLINE-REVIEW.zip。含报告、准确base/final/parent/tree、提交清单、当前最终CI、保护对象及原heads校验、patch/源文件清单和摘要、原始媒体/操作记录、约4—7张必要原图（原生全页较大可合理增加）。旧C1素材/原图不重复塞包，只引用原SHA及hash。截图不能靠改产品时长或截取静态拼装页生成。

报告开头明确C16媒体、完整视口、窄屏及zoom各自PASS/PARTIAL/NOT VERIFIED，未做的Owner体验写NOT RUN。缺能力时完成独立项，给具体失败接口及下一步需要的能力，不索取Owner逐项技术操作。不得继续无界重复试验。

分支普通commit/push一次收口；准确最终SHA回读CI，不凭本地PASS推断远端。完成后停，不直接开C2/B2/美术或merge。
