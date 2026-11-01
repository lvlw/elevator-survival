# C16补验结果矩阵

**媒体true/本地关闭不覆盖OS/媒体切换：NOT VERIFIED；完整桌面视口：PASS；390：PARTIAL；真实zoom：NOT VERIFIED；Owner体验：NOT RUN。C16整体PARTIAL。**

| ID | 实际结果 | 证据及限度 |
| --- | --- | --- |
| V01 | PASS输入/对象；全refs PARTIAL | 原包10文件28395字节；准确base/tree、干净起点、原refs/heads、3160保护索引；开工337/4858通过282.91秒。最终数值由外层准确回执核对。 |
| V02 | PASS 能力预检 | Edge实际schema仅viewport/management，原生媒体/zoom不广告；此前不可用/Windows中止/内部协议拒绝均记录，无绕过。 |
| V03 | NOT VERIFIED | 实际nativeReducedMotion始终false，没有通过原生方法变为true，不能用local=true替代。 |
| V04 | NOT VERIFIED | local=false和true键盘切换都实际跑过，但OS/native一直false，不能据此判断true下关闭本地仍保持减少动态。 |
| V05 | NOT VERIFIED | 无原生媒体切换接口。没有true→false回播结论；44.4ms双提交是独立普通动态测试。 |
| V06 | PASS 声明的桌面档 | 1920×1080、1280×720、1366×768原JPEG固有尺寸与inner/visualViewport/DPR1匹配，完整HUD/舞台/行动/保存/反馈/携带可见，无TEST浮层。 |
| V07 | PASS 代表流程 | 三桌面档doc client/scroll宽相等，整页不水平溢出；24格真实6×4；Enter跳过、Space本地开关、Enter说明、Escape关闭回焦点；说明关闭按钮底655.1875＜720。没有据此宣称所有产品组合/平台。 |
| V08 | PARTIAL | 390×844真实压力档可纵向访问按钮/checkbox与背包；fullPage375×1851；普通视口图375×812不等于390×844。前者参数/原始元数据完整，但截图调用期间布局宽变，不能宣称完整390视口、原布局全页像素一致或移动一屏。 |
| V09 | NOT VERIFIED | 无真实125/150缩放操作/API；visualViewport.scale1、viewport覆盖不是zoom依据。 |
| V10 | PASS原生/检查；全refs PARTIAL；最终CI外置 | 一次鼠标防御checkpoint1/cue1；两次紧邻键盘后3/3；skip/local/说明零新增写入；冷恢复HP8、cue0/write0。默认check、3160旧对象/refs、准确SHA CI及清理在外层回执。 |

## 原始操作与时序

1. 新origin加载合法defend checkpoint，HP12，三敌之一A名称感染护工，native媒体false、local=false、checkpoint/cue均0。
2. 1920档原鼠标防御，HP11、checkpoint1/cue1；原生CSS180ms运动观测后落稳，反馈单条。截图01是落稳的最近动作文字，没有假称抓到位移瞬间。
3. 1280档原键盘Enter跳过、Space本地减少动态；写入/回执仍1/1，local=true、native=false，焦点在原checkbox。截图02明确是本地减少动态。
4. 1366档Space关闭local，仍1/1。一次有界尝试连续两次原防御键盘Enter，成功写入/cue变3/3，HP8。两次安全cue原生DOM添加间隔44.400000005960464ms；第二条出现前第一条仍active，没有settled观测；第二条computed animationName=iw-committed-action、duration0.18s、currentTime0。源日志及firstCue2/3完整采样在native-short-window-evidence.json，未改时长或模拟时钟。该间隔是DOM回执观察间隔，不冒称逐函数核心CPU耗时。
5. 键盘打开原防御说明，在1280完整图04观察原说明与关闭按钮；Escape关闭后焦点回原说明入口，写入/回执仍3/3。没有删除或隐藏真正说明层来制造干净图。
6. 390原生fullPage一次；截图后工具曾出现viewport/client变化和后续截图比例异常。先保留原结果，按公开viewport reset+set单次恢复，完整桌面1280取证成功；390原视口图仍尺寸不符，局限不抹除。
7. 实际reload。最初加载空帧不是PASS；等待真实感染护工heading可见后，DOM是最新保存HP8/流血/原物品，空cue、无新写入。截图07是在公开viewport恢复后取得的完整1280。local选择未持久化，恢复false；不是OS偏好变化。

## 七原图

| 图 | CSS viewport/DPR | 原JPEG像素 | 用途 |
| --- | --- | --- | --- |
| 01-edge-normal-1920 | 1920×1080/1 | 1920×1080 | 正式鼠标动作后的单回执、完整舞台和背包 |
| 02-edge-keyboard-local-reduced-1280 | 1280×720/1 | 1280×720 | 原键盘跳过/本地减少动态及焦点 |
| 03-edge-representative-1366 | 1366×768/1 | 1366×768 | 双提交后最新状态，原控件完整 |
| 04-edge-keyboard-information-1280 | 1280×720/1 | 1280×720 | 真正产品说明层与原关闭按钮 |
| 05-edge-390-native-fullpage | 390×844/1，采样client375 | 375×1851 | native fullPage结果，尺寸/布局局限保留 |
| 06-edge-390-keyboard-viewport | 390×844/1，scrollY629 | 375×812 | 压力滚动片段、local键盘；不是完整390原像素 |
| 07-edge-cold-restore-1280 | 1280×720/1 | 1280×720 | 完成冷恢复后空cue、未新增保存的完整图 |

每帧time/URL/UA、outer/inner/visualViewport、DPR、scroll/client/scroll尺寸、几何、焦点、原始字节长度与rawSHA256见frame-metadata、final-frame-index与image-original-metadata。所有字节直接来自公开screenshot API，没有编辑。加载空白、fullPage后比例异常、第一次390尺寸不符的QA帧已排除，保留外部目录和原始metadata排除原因，不装作产品缺陷，也不计入七张交付图。

没有发现可凭当前证据判为C1新增产品阻断的缺陷；媒体缺口和截图异常属于本轮能力/取证限度，不倒推成源码bug。完整Owner体验、三敌×六动作×五停点、其他平台、依赖风险、资产/发布门槛未在本批关闭。


保护回执补充：全部3160既有文件对象和原65个项目heads/remotes/tags保持；但初始68个全量refs中有2个refs/codex/turn-diffs内部记录在跨轮次后移除/变化，另有宿主命名空间新增记录。没有本任务显式更新这些内部refs的命令，归因为宿主记账仅为推断，未检查内部机制。全量refs保持子项PARTIAL，不能称所有refs不变；不为恢复表面一致而回写/重建宿主refs，原值/现值/时间原样归档。项目分支保护与其他独立验收继续。
