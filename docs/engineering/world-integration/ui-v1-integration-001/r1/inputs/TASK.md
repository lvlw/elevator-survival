# ENG-WORLD-UI-V1-INTEGRATION-001-R1

## 目标、来源与授权

基于主线准确SHA审查，保留新版整体UI，仅修复R1-01终局操作层残留与R1-02地图歧义端点。范围依据原M1—M3授权、地图补充、后发视口收窄及随包AUD；不是重新设计，不重开素材/准备任务。

仓库：lvlw/elevator-survival
起点：ba865ea05cedac84d661969992683349cca7a519
起点tree：7d34277c26ce2d3990fcd9568a6d48693378041a
分支：feature/world-ui-v1-integration-001（原分支追加，不建替代历史）
推荐：GPT-6.1 Sol / high / Standard；实际配置如实记录。

## W0：起点与定向复现

读实际AGENTS、其要求的正式规则和相关UIR，重读两处运行组件、对应新旧测试及AUD。查HEAD/status/diff并保护他人工作和Owner试玩数据，不宣称主线已查本地。
实际运行npm run test:run建立R1基线（历史参考348文件/5024，不替代本次执行）。可继续用环境变量VITEST_MAX_WORKERS=2，不改脚本/选择集。
直接做复现和修订，不再交准备报告等Owner确认。主线proof只是准确模块的隔离复现，不是原生游戏验收；你必须补真实React/正式producer/controls回归。

## R1-01：终局清除不再有效的药食/维护层

- game-shell.tsx目前入口检查utility.length，内容层只检查utilitiesOpen。修复为当前渲染立即不展示已失效操作层，不能仅靠后续effect让终局闪过旧空层。
- point/phase及动作是否存在，来自现有安全view；不要在UI重算死亡、治疗或消费，不添加状态机/事件总线。
- 清理旧本地打开状态和失效焦点；不能为清层重建BrowserOwner/Session，不执行额外命令或保存。
- 同一存活上下文合法操作后，正常菜单/必要参数可按原语义继续；不要对任何view对象变化一律清空draft、选择、保护确认或C1消费状态。
- 补从“药食与维护”实际入口进入正式参数/必要L3确认的React回归。复用既有维护死亡生产者/strict codec测试边界，不能改核心参数或直接伪造死亡DOM。
- 至少验证：实际维护后死亡立即显示终局且旧层不存在；一命令/一提交/一写入；保存失败仍已生效，retry不重复；普通存活维护和取消仍正常；失权卸载不复活旧层。
- living-hub/没有动作的渲染边界可单测，但不冒称它们均由药食按钮原生抵达。

## R1-02：地图名字不能唯一绑定时保守降级

- 仅从当前map安全输入统计完整公开名(place + ' / ' + name)是否唯一；缺端点或重复全名，不能连到第一/最后一项，不创造节点、不取私有ID。
- 原路线文字和原观察/通行状态必须保留；可作简短只读提示。详情选择同样不能静默换成同名另一节点。
- 不同区域的同短名仍是不同、可唯一定位节点，不要误删合法线。唯一端点的现有布局、反向边、环、unknown及last-observed不改变。
- 增加两种尺寸组件参数compact true/false的逻辑测试即可，这不是重新跑两档浏览器分辨率。
- 覆盖重复完整名、仅短名重复、缺端点、正常唯一、节点详情选择和零dispatch/零保存。合成投影明确标测试，不声称当前五图有同名错误。

## 验证与限额

允许改动只见SCOPE。保持M1—M3所有已完成UI和资源，不改CSS、不调整布局或多分辨率，不改协议/核心/保存/依赖/CI。
定向测试：新增R1回归＋ui-v1-shell/items/map及原terminal、confirmation、medical-maintenance、faults、browser-binding、只保存重试/冷恢复的受影响用例。
至少让两个回归在原实现上失败、修复后通过，记录具体业务断言；不为此改真实Owner存档。
最终实际npm run check及准确SHA CI。默认check已含E03时不再另开一轮重复全量/E03矩阵；不得删skip断言或用更小默认测试选择集过关。

## 视觉交付：用已有原图，不再重拍矩阵

固定现有1920×1080 CSS主视口；无需让Owner设置浏览器。原媒体true/zoom/DPR2/390延期不恢复。
请在完成报告旁提供当前已有四张原JPG（可仅压成VISUAL-ONLY.zip，不包含源码或素材）：
- evidence/30-final-pharmacy-revealed-1920.jpg
- evidence/31-final-pharmacy-empty-reopened-1920.jpg
- evidence/22-actual-2x2-detail-1920.jpg
- evidence/17-natural-battle-1920.jpg

它们来自ba865ea原提交，保留原字节与来源，不假称R1重拍。正常布局未改，不要求重复截图。提供可由Owner直接转交的实际文件位置，不只把E盘图片写成WebGPT可见。
修复本身须有真实React回归；现有获准浏览器可用时可补一张同主视口的终局清层截图，无能力就写NOT RUN，不另开浏览器基建、不新增扩展、不接管日常profile、不触碰Owner5233 origin。

## 交付、Git与停止

可在原分支普通commit/push；不得amend已发布历史、reset、merge、force、推main或移动固定baseline/旧项目refs。只在本任务r1/文档前缀写报告/新证据；旧报告留历史，不篡改成原已通过。
报告：完整base/final/parent/tree、修改文件、原实现失败与修复后通过、真实基线/最终check/CI、未完成项、范围和停止点。无需全patch/源码ZIP/全仓对象清单。
完成即停等主线准确SHA与核心原图复审；Owner暂不试玩，不进入B2/新美术/发布。
