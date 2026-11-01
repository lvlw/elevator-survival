# 实际能力、政策与边界

**媒体true NOT VERIFIED；桌面完整视口PASS；390 PARTIAL；真实zoom NOT VERIFIED；Owner体验NOT RUN。**

## 能力过程

1. 最初命名Edge连接器返回Browser is not available。已安装Edge路径版本读取为156.0.4314.50，不能据此证明后续连接实例完整build。
2. 依据Owner自行打开Edge的明确指令，启动全新外部任务profile。Windows原生API只做窗口选择/状态读取，因不能可靠识别about:blank的当前URL被工具强制中止；当轮即停止，没有继续Windows输入。此失败不能算浏览器成功取证。
3. 后续可用浏览器清单出现Edge extension实例。请求edge://version被URL政策拒绝（只允许http/https），未通过文件、原生命令或其他表面绕过读取该信息。
4. Owner直接授权现有Edge仅新建本地测试标签，不读其他标签或改profile设置；该许可解决原任务日常profile限制。实际任务只开http://127.0.0.1:5211/?dev-infected-world=1，新标签1512062116。未访问其他标签、历史或账号；没有登录动作。
5. 初步schema读取的是Edge实例3；创建本地任务标签时工具明确绑定实例4，后续仅使用实例4和该任务标签。连接状态变化作为外部状态记录，不推定谁安装或配置了扩展；本代理没有执行安装。

## 实际广告的API

| 能力 | 观察 |
| --- | --- |
| 正式React/DOM/可信输入 | 实际运行，原按钮鼠标及原控件Enter/Space/Escape生效；独立TEST checkpoint，原BrowserOwner/LocalStorage/WebLocks。 |
| viewport | 公开set({width,height})/reset；已实际1920/1280/1366/390。完成后reset。不是浏览器zoom。 |
| screenshot | 公开screenshot({fullPage:false/true})返回原JPEG；原字节保存，逐帧解析固有尺寸。 |
| browser capabilities | 实际仅viewport、management；management未调用。 |
| 原生媒体仿真/切换 | 未广告接口，不调用猜测的隐藏方法；实际原生matchMedia为false。V03—V05没有真实true，保持NOT VERIFIED。 |
| 真实zoom | 没有广告接口，且当前授权不改profile设置；未以按键、CSS zoom/transform或viewport冒充125/150。 |
| fullPage | 实际调用一次返回375×1851；有截图期间client/layout变化和后续比例异常，保留限制，不给完整390验收。 |
| browser version | 每帧native userAgent含Edg/156.0.0.0（UA reduced）；完整连接实例build NOT INDEPENDENTLY VERIFIED。未重试内部页。 |

工具/文档依据是当轮正式browser.documentation、capabilities.list、viewport.documentation与screenshots/local-web-development/browser-troubleshooting文档。没有采用未公开API、原始CDP、外部Playwright/Selenium，未再用Windows输入。API记录和Owner授权在evidence/edge-capability-and-authority.json。

## TEST-only观测边界

browser-test-server.mjs使用原Vite配置和原main.tsx/DEV入口，仅在这个新origin两key均null时播种合法reservation/checkpoint；生成调用由browser-records.probe.ts复用已审P生产者、独立初始材料和严格codec。播种发生在正式App启动前，是TEST夹具写入，不计成动作保存；不是read-null自然首玩。刷新不重播种、不覆盖已有pair、不reset坏档。

观测脚本只读native matchMedia、computedStyle、getAnimations、几何/焦点；原Storage.setItem对checkpoint逐次转发且保留异常。没有故障注入、调用controls、React状态替换、CSS改动、timer替换或生产时长修改。只增加不可见application/json观测节点，不隐藏产品UI；原始日志由同origin回环POST写到外部evidence，未向公网传送。

计数层只证明所观测checkpoint写入/安全cue及实际操作，不冒称新执行了私有core调用spy。原一次提交与消费者协议的工程结论承接准确base主线AUD，本轮再跑既有全量回归/默认check与准确SHA CI。

缺口下一步需要工具明确提供、获准且可核验的原生媒体仿真接口，或后续单独授权并已具备的受控测试profile偏好环境；本轮不让Owner逐项改系统设置、不安装扩展补路。现有缺口不是C1产品源码FAIL，也不授权R1。
