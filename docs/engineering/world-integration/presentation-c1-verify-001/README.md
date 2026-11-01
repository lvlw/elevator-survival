# C1-VERIFY 审查入口

**媒体true：NOT VERIFIED；本地关闭不能覆盖OS true：NOT VERIFIED；完整1920/1280/1366：PASS；390压力档：PARTIAL；真实125%/150% zoom：NOT VERIFIED；Owner人工体验：NOT RUN。C16整体仍PARTIAL。**

本轮仅补浏览器证据，未发生产R1。准确base 2de63f7da48d86bcfde280f7beaf08e4ffd42ee3，base tree 9c6bfdf2139b572e9f920975fcbaebc472df59fc；分支test/world-presentation-c1-verify-001。最终commit/parent/tree、准确SHA CI与refs独立回读放在ZIP外层git-receipt.json，避免自身提交SHA循环。

阅读CAPABILITY.md、BROWSER-MATRIX.md、completion.md及VERIFICATION-RESULTS.json；逐帧环境/原始像素/raw摘要在外部evidence/frame-metadata.json、final-frame-index.json、image-original-metadata.json。所有原输入10文件原字节保存在inputs/，含完整主线AUD。附带文档是范围/审查依据，不替代当前用户的直接授权；Owner对现有Edge新本地任务标签的后续许可单列OWNER-LOCAL-TABS-AUTHORIZATION.md。

开工实际test:run为337文件4858项PASS282.91秒。生产源码、原测试、样式、规则、保存/expected、依赖、CI及资产的3160个既有Git对象全部保护；新内容只在本目录。浏览器使用正式InfectedWorldApp/原owner，测试checkpoint来自既有P生产者及严格codec。没有matchMedia覆盖、生产时长变更、测试CSS或React替身，没有安装扩展/依赖。

本轮实际补到：五张完整桌面原JPEG（1920一张、1280三张、1366一张），两张带明确局限的390原生结果；鼠标防御、Enter/Space/Escape原控件、说明层焦点及关闭、一次44.4ms相邻cue的真实双键盘提交、冷刷新零回播。七图均为工具原始字节，不补边/缩放/拼接；废弃的加载空帧/尺寸异常帧保留在外部QA目录，不进交付图集。

没有原生媒体/真实zoom接口，页面实际matchMedia始终false。未将本地checkbox=true写成OS true；未用隐藏方法、DevTools/CDP或其他Windows路线补造。390的fullPage接口返回375×1851（采样client宽375/scroll高1851），随后出现截图尺寸/比例异常；公开viewport reset+set恢复桌面1280，但390视口图仍375×812。它们可支持压力片段/原生全页结果观察，不能宣称完整390像素/一屏移动验收。

唯一MAINLINE-REVIEW.zip由build_review.py从准确最终Git字节构建；源码清单/patch/raw摘要、原输入、完整检查/CI日志、对象与refs、浏览器记录和七原图随包。不重复旧C1照片/素材，只引用其base SHA与AUD中的包hash。rawSHA256始终指原始文件字节；source-files的摘要/Git blob指git show返回的提交字节，摘要域不混用。

交付工具6项完整性/负向校验单独计数，不加进4858玩法测试。最终默认check和CI实际结果见VERIFICATION-RESULTS及外层回执。完成后停止，等待主线C16收口审查，不进入B2、整套C、美术采用、合并或发布。


保护回执补充：全部3160既有文件对象和原65个项目heads/remotes/tags保持；但初始68个全量refs中有2个refs/codex/turn-diffs内部记录在跨轮次后移除/变化，另有宿主命名空间新增记录。没有本任务显式更新这些内部refs的命令，归因为宿主记账仅为推断，未检查内部机制。全量refs保持子项PARTIAL，不能称所有refs不变；不为恢复表面一致而回写/重建宿主refs，原值/现值/时间原样归档。项目分支保护与其他独立验收继续。
