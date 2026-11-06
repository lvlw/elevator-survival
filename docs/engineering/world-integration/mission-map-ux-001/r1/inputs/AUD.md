# AUD-f75bbb0d｜任务说明与两层地图主线实审 v1.0

## 结论

保留全部任务说明、两层地图及8次提交。四张主桌面代表画面满足本批主要展示目标；发现1项连线详情在知识扩展后错绑的问题，整批待窄R1，不作全批PASS。无需revert，不重做地图，不扩大分辨率与美术范围。

本轮不会阻塞实验仓库A/B/C；dot内容EDITORIAL-R1独立继续。正式版停止扩大内容，仅建议旧工程会话修复F01。

## 精确范围与来源

- Repository：lvlw/elevator-survival
- Branch：feature/world-mission-map-ux-001
- BASE：95cab5ad79e31d63aae93d97ab901c716cf75f89
- FINAL：f75bbb0d16378b32b6f13d1e5de8cb0eeedc887c
- PARENT：ffa2fd86b2dcd49b9b1ca97375e0432f6380fec3
- TREE：77307b4980e3590a07b0319f7c68ec0a199c5f8a

本轮读取了GitHub提交/compare、关键变更源码、任务及地图测试、CI run/job与原始日志，读取Owner交付文件并解码四张原图。95→FINAL共8次提交；PARENT→FINAL仅16条本任务文档及证据路径，无运行源码变动。原图由PARENT运行得到，可对应本次FINAL的实现；不冒称是在证据提交后重拍。

实际读取文件包括guidance/model.ts、mission-guide.tsx、knowledge-map.tsx、map/projection.ts、map/layout.ts、game-shell.tsx及相关diff/测试。主线没有在Owner磁盘执行命令，没有修改仓库。

来源入口：
- https://github.com/lvlw/elevator-survival/compare/95cab5ad79e31d63aae93d97ab901c716cf75f89...f75bbb0d16378b32b6f13d1e5de8cb0eeedc887c
- https://github.com/lvlw/elevator-survival/blob/f75bbb0d16378b32b6f13d1e5de8cb0eeedc887c/docs/engineering/world-integration/mission-map-ux-001/REPORT.md
- https://github.com/lvlw/elevator-survival/actions/runs/42138939893
- CI job logs：127634049169

## 已保留的成果

任务：详情解释委托目的、供电与装接关系、样本实物携回和H0交付；摘要与详情共用安全模型；持有样本不伪造交付；已知线索关联只读定位；工单明确命名而非“现场互动”。未发现为了引导而改写玩法或从背包同名物推断指定样本。

地图：默认当前建筑已知房间，世界层仅已知建筑；区域内连接不画成世界自环；路线详情保留方向、通行与当前/旧观察。未知房间和隐藏通道不由全世界catalog补全。真实跨区仍使用原动作；定位/切层不发送移动命令。布局与字体已明显改善。

这些结论不是断言所有交互都已经主线浏览器操作过；动态结论综合源码、已审测试与作者记录，主线本轮只做实际附件像素检查和下述隔离复现。

## F01｜连线详情用数组序号保存选择，新增已知路线后静默改指另一条路线

严重性：P2，当前批次的只读导航状态一致性问题。应修复；不是移动错误、存档损坏、私有信息泄漏或游戏规则错误。

文件：src/ui/infected-world/components/knowledge-map.tsx。

当前代码点击连线后存储 `routes:6,7` 一类字符串。下一次查询只确认这些序号仍出现在resolved集合，再按当前map.routes[6/7]输出详情。数组序号不稳定；同建筑探索揭示了较早排列的新路线时，原连线的数组位置会改变，而anchor仍是同一建筑。

已执行隔离复现：
1. 使用准确提交的组件和公开地图projection（重新计算Git blob均与GitHub一致）。
2. 用合成公开DTO模拟大厅时已知地图；点击真实组件生成的“大厅—后勤控制间”连线事件处理器，选择值为routes:6,7。
3. 保持组件/外部scope，更新为保安室附近新揭示路线的公开DTO，新路线插入相应数组位置。
4. 原连线仍存在，移动到了8/9；旧选择6/7仍被视为合法，详情改成“保安室—值班休息室”。原目标没有失效，却被静默替换。

复现宿主使用简化React hooks/JSX，并替换几何绘制辅助。运行的是准确组件与projection，输入为明确合成数据；没有运行真实React DOM、BrowserOwner或完整地图移动链，也没有重新执行全量游戏测试。此复现证明渲染选择算法缺陷，不冒充已录得Owner实际游玩故障。

建议修复：以稳定的公开端点集合/连线语义绑定；或在相关结构变化时清除旧连线详情。不能仅检查序号仍存在，不能以内部ID或完整地图绕过安全查询。状态更新、增加/删除/重排、同名歧义和跨区切换时，旧选择都不能变成另一条线路。策略由Codex窄实现决定，无需新协议或持久化。

证据：isolated/source-binding.json、isolated/reproduce.cjs、isolated/result.json。

## 四张实际像素

| 文件 | 实际观察 | 结论 |
|---|---|---|
|01-mission.jpg|完整委托、目标关系、样本待交付、当前线索、期限/返回说明均在弹层内|代表画面通过；文字仍偏密，但不再只有状态标题|
|02-hospital.jpg|九个已知医院房间完整显示，当前位置清楚，已知内部连接不混外区房间|代表画面通过；不要求重画或换素材|
|03-hotel.jpg|本地仅入口/安置点，跨区出口按需展开；选中详情可读|代表画面通过；详细路线文字仍可未来精简，非本次R1要求|
|04-world.jpg|五个已知建筑、公开跨区联系、供电所定位和实际当前位置区分|代表画面通过；查看不等于移动|

ZIP 1,137,026 bytes；SHA256 8cc8adb6d93a2ae4cbbef313d9514e09fcf88c2ce9229e17eb925c4942d34611。CRC通过，4条目，无重复/越界。四图均实际JPEG解码1920×1080，各字节数与SHA256对应准确FINAL内manifest。原图没有由主线裁切、缩放、补边。

## 验证分账

- 作者准确基线：固定BASE快照357文件/5,078项。首次与编辑重叠的运行不被用作准确基线；作者另跑不可变归档。
- 作者新增：2文件/10项；两类负控作者运行，主线未重跑。
- 作者本地最终check：359文件/5,088项、架构/类型/构建通过。
- 主线回读准确FINAL CI #189：run、job均成功；原始日志359文件/5,088项，架构53 DEC/347 core、类型/构建成功。
- 主线独立执行：1个缺陷复现，准确两个模块，合成公开DTO+隔离宿主。不得累加成新增正式测试。
- 主线浏览器运行：NOT RUN。Owner体验：未以本轮审图代替。
- 主线本地全量：NOT RUN；直接网络取得仓库受代理解析失败影响，已用GitHub连接器读取，不用此限制请求重复源码包。

准确CI安装日志仍有7项依赖漏洞摘要（2 moderate/5 high）；本批依赖未改。保留既有独立依赖/发布门槛，不据此追加地图返修或自动audit fix。

## 下一步

原Codex工程会话执行 ENG-WORLD-MISSION-MAP-UX-001-R1，只修F01并补真实React回归，原分支普通追加提交。保留原四图，明确是本次f75证据；不要求重拍矩阵。完成定向、最终原check和准确SHA CI后主线复审。

Owner无需暂停A/B/C实验；实验仍以各自原任务固定起点进行，不自动将本次未收口版本作为新工程基线。原5277服务由作者报告为旧origin，不能把它自动称作本次新地图入口。本次不授权启动/替换Owner服务、部署、合并或继续中后段剧情。
