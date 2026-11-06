# ENG-WORLD-MISSION-MAP-UX-001-R1

## 目标、依据与基线

只关闭AUD-f75bbb0d的F01：已选连线不得因新增/重排已知路线而静默指向另一条线。主要任务说明与地图画面接受并保留，不重做布局。

Owner原授权为任务说明及两层地图；本包由Owner转交执行后授权窄修。仓库lvlw/elevator-survival，BASE f75bbb0d16378b32b6f13d1e5de8cb0eeedc887c，继续feature/world-mission-map-ux-001。先读实际AGENTS、HEAD/status/diff/worktree；不reset、不覆盖更晚工作。若HEAD并非BASE，先核实差异，只停止有冲突部分。

推荐沿用Sol／high／Standard；实际不可核验记UNCONFIRMED。模型选择不自动更换。

## 实现和验收

W0：保全HTTP实验/其他worktree/Ownerorigin/refs，实际test:run建立本轮固定源码基线。不要用历史5088代替。
W1：先用真实React的保状态rerender或正式玩家链写出失败回归，再修选中路由的语义绑定。公开端点稳定键或结构变更清理均可，禁止只凭数组序号仍存在判断旧选择有效。无需新的持久化、公共API、通用地图引擎或额外依赖。
W2：覆盖至少：前插/重排不串线；删除后序号复用不串线；同建筑新发现；当前/上次观察变化读取最新状态；歧义端点清理；世界层/本地层/跨建筑不残留或复活旧详情。正常节点选择、地图只读、目标定位、原图布局保留。优先补一条原玩家查询产生的同建筑知识扩展用例，合成DTO用例与正式链分账。
W3：相邻地图/任务/隐私/生命周期测试、原npm run check（含原E03）和准确最终SHA原CI。控制并行避免压满A/B，不能修改timeout/CI/依赖或削弱旧断言。最终check只在实际修订完成后运行，不循环刷数。

本轮不要求原生桌面浏览器取证、不重拍四图、不扩分辨率。现有f75原图可继承为未改布局的证据，但不能改写成R1新截图。使用jsdom/独立无界面测试，不抢A原生桌面；若发现真正必须原生取证的新阻塞，说明而不强行接管。

## 白名单

- 可改：src/ui/infected-world/components/knowledge-map.tsx。
- 仅必要时：src/ui/infected-world/map/projection.ts，或新增该目录纯展示selection helper；不得借机重写layout.ts。
- 测试：新增src/ui/infected-world/mission-map-route-selection-r1.test.tsx；必要适配同目录既有mission-map-ux.test.tsx、mission-map-projection.test.ts、ui-v1-map.test.tsx、ui-v1-review-map.test.tsx（先确认实际路径存在，不新增广泛skip/删断言）。
- 文档：docs/engineering/world-integration/mission-map-ux-001/r1/**。
- 不允许：core、state、BrowserOwner、controller、save、public types、内容声明、CSS/素材、依赖、CI、其他任务目录。

## Git与停止点

仅原分支普通commit/push。无merge/强推/main/旧标签/部署/SSH/清档权限。不要修改A/B/C实验仓库或dot内容分支。

交BASE/FINAL/PARENT/TREE、修复前失败与修后结果、基线/新增/相邻/最终/CI分账、实际文件及越界检查。GitHub直接审，无全源码ZIP。完成停止，等待主线；不自动安排试玩或下一批。
