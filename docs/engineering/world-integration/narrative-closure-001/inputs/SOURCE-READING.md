# 精确来源与阅读导航

## 正式仓库（权威与起点）

repo：lvlw/elevator-survival @ e7372119672561618f7c2dc1664001104e708bd1。本次已重新读取远端feature/world-mission-map-ux-001，仍指向此SHA。Owner本地HEAD/服务/服务器不是本次已核验事项。

开工按实际AGENTS完整阅读必要资料，尤其：
- AGENTS.md以及修改目录上适用的任何子AGENTS。
- docs/05-design-decisions.md：当前已确认DEC优先；本轮需核对当前新世界及终局条款（前任务引用DEC-052/053，仍以实际文件为准）。
- docs/02-vertical-slice.md、docs/01-game-design-v0.1.md、docs/03-architecture.md及相关docs/content/。
- docs/09-ui-design-record.md 当前有效约定、UIR-015及后续本批范围相关附记。
- docs/engineering/world-integration/narrative-entry-001/ 原任务/合同与R1；docs/engineering/world-integration/mission-map-ux-001/ 及r1。

本次主线实际读到的接缝：
1. src/state/residence-session/narrative-entry/types.ts：原StoryKey为P01—P06/H01—H07；ExplorationReceipt为六类，不含install/terminal。
2. 同目录projection.ts：原有限知识投影，不采信阅读标记创造玩法事实。
3. src/app/infected-browser/narrative-entry/reading.ts：现有有界附属书签、绑定、revision与持久化边界。
4. src/ui/infected-world/narrative-entry/use-entry-story.ts：当前仅active-world接首段；dead/living-hub撤除是应保留的正确边界。
5. src/content/infected-world-v0.1/content.ts：L5真实地点为周衡休息室；不能从Godot实验搬成医院后勤。
6. package.json：test:run为vitest run；check串架构、typecheck、test:run和build。

旧5099项及CI190是已审基线的历史证据，不替代本轮开工与完成检查。没有重新要求制作整仓审计包。

## 候选文本（只有本包所列段落获有限采用）

repo：lvlw/elevator-survival-lab @ cbfbbe53c1be0a9748630ba6bcc39f1028966f53。只读：
- hospital/production-cut.md
- hospital/player-reading-paths.md
- hospital/hospital-screenplay.md
- hospital/hospital-script.json
- hospital/hospital-storyboards-assets.md（SB02、SB06、SB07）
- hospital/hospital-contract-and-routes.md
- reviews/content-production-001/editorial-r1/REPORT.md

固定文本参考95cab5ad，正式实现起点e737；先比较当前接缝而不倒退已修地图/任务。原场段条件可能不是正式API，须做采用映射；不能将全文或候选数字变成生产规则。

不拉取/合并Godot A、交互B、分析C或新世界数据。三者都不构成本包正式授权来源。仅有原主线方向、已生效规则、本包Owner下发与精确有限文案采用。
