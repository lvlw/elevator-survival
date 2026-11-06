# ENG-WORLD-MISSION-MAP-UX-001-R1

仅修主线 AUD F01：已选地图连线随路线数组前插、重排或序号复用而错绑。任务说明、两层地图和 BASE 以前全部提交保留，不 revert、不重做 UI。

## 身份、授权与保护

- 仓库：`lvlw/elevator-survival`；继续 `feature/world-mission-map-ux-001`。
- BASE：`f75bbb0d16378b32b6f13d1e5de8cb0eeedc887c`。开工实际 HEAD 与远端同名 ref 均为 BASE，任务 worktree 干净。
- 任务 worktree：`E:/projects/elevator-survival-worktrees/world-mission-map-ux-001`。主目录仍在旧 UI 分支；其中十个 HTTP 实验文件与其他 worktree 不触碰。
- 任务包在仓库外解压，SHA256 `ad7a99acb7927b51eb47271b3f11f826dab94a2120118f3a4868cafb70d78cee`；9 个 manifest 条目的实际长度与 SHA256 全部匹配。包内无 verify-package.py。已读 TASK/AUD/README、隔离复现及 source-binding；原输入位于本目录 `inputs/`。
- 已读实际 AGENTS、设计背景、Vertical Slice、架构、DEC、场景与当前 UIR；本项仅修改只读展示选择，不新增规则、知识来源或 UIR。附件中的简化 hook 宿主是审查旁证，本轮没有把它冒充真实 React 结果。
- 推荐配置沿用 Sol/high/Standard；实际模型、推理与服务档位均为 **UNCONFIRMED**，未自行切换模型。
- 本轮只追加普通 commit/push。准确 FINAL/PARENT/TREE 由提交后 Git 回执和最终回复给出；报告随该最终提交，避免自引用 SHA。

## 修复

原实现把 `routes:6,7` 等数组序号保存为选择。新查询中的同一序号可能已经属于不同路线，原验证只检查序号存在，因而静默改指其他端点。

现在选择键仅由当前显示层、本地建筑和排序后的公开端点对构成。局部层使用完整公开房间名，世界层使用已有合并连线的建筑对；JSON 数组编码消除分隔符碰撞。仅用于临时展示，不写入存档或协议，不引入内部 ID。每次 render 从最新、唯一端点可解析的可见 channel 重取行序号与详情；数组序号不再跨查询保存。方向、通行和当前/上次观察仍读取原最新 DTO，不缓存旧状态。

所选 channel 不存在、端点缺失或歧义时，本帧不输出旧详情并清除选择；目标随后重新出现也不会自动复活。世界/本地、查看其他建筑、回当前位置及实际跨建筑继续使用原清理语义。正常节点选择与目标定位不变。SVG channel 的 React key 同步采用语义键；枚举顺序、坐标、绘线、尺寸、标签、CSS 与所有既有地图输出仍沿原实现。

运行文件仅 `src/ui/infected-world/components/knowledge-map.tsx`，8 行增加/7 行删除；未改 projection/layout/helper、CSS、素材、core、state、controller、BrowserOwner、public types、内容声明、save、依赖或 CI。新测试仅 `src/ui/infected-world/mission-map-route-selection-r1.test.tsx`。其余新增均在本任务 `r1/` 文档前缀。

## 修复前失败与修复后回归

先完成固定 BASE 的实际全量基线，再只新增测试、运行旧组件；最后才修组件。测试文件修复前后字节相同，没有为了通过而改断言。

新文件共 11 项，使用真实 React/createRoot/act 和保状态 rerender：

- 10 项合成公开 DTO 边界用例：小图自有状态与展开图受控 MapScope 各 5 项，覆盖前插/重排、最新双向通行及观察、删除后序号复用和重现、端点歧义/缺失、切层/查看建筑/真实 anchor 变化及不复活、世界层建筑对重排；同时保留节点选择、键盘 Enter/Space 与任务目标标记。
- 1 项正式生产链：原 DEV React/BrowserOwner/正式生产者建立角色并出发，从大厅进入保安室；由正式玩家查询产生同建筑知识扩展，没有注入或手改游戏状态。进入保安室后公开路线数组确实增长，原大厅—后勤控制间的行位置改变。旧实现实际显示保安室—值班休息室，新实现继续显示原端点。只读点击/切层零 dispatch/current/notices/draw、零保存和环境熵；真实移动只提交一次、更新一次、保存一次。

修复前 7 failed / 4 passed，失败均为业务 AssertionError，包括上述正式玩家链。`logs/before-fix.log` 保留完整期望/实际详情，非工具报错或仅简化宿主。修复后同一测试文件 11/11 PASS。

## 检查分账

| 项目 | 实际结果 | 原始证据 |
|---|---|---|
| 首次受限 test:run | EPERM：任务 worktree 的 Vite 临时缓存不在默认写权限内；未进入测试，不计为基线 | logs/baseline-sandbox.log |
| W0 固定 BASE 原 test:run | 359 文件 / 5,088 项 PASS，640.54s，exit0；运行结束前源码与测试未编辑 | logs/baseline.log |
| W1 旧实现 + 新回归 | 1 文件 / 11 项，7 FAIL / 4 PASS，5.43s，exit1 | logs/before-fix.log |
| W2 修复后同一回归 | 1 文件 / 11 项 PASS，5.02s，exit0 | logs/after-fix.log |
| W3 相邻组合（包含新增 11 项，不重复累计） | 9 文件 / 61 项 PASS，22.94s，exit0 | logs/adjacent.log |
| W3 原默认 npm run check | 360 文件 / 5,099 项 PASS，测试阶段 663.90s，exit0；53 DEC / 347 core 架构、类型与构建 PASS（288ms） | logs/check.log |
| 准确最终 SHA 原 CI | 提交/普通 push 后核对实际 run、job 与原始日志；链接及结论见最终交付回执，不沿用 BASE 的 #189 | 提交后 ci-receipt.json / ci-job.log |

相邻组合包括新回归、mission-map-ux、projection、ui-v1-map、ui-v1-review-map、原 privacy、ui-v1-review-lifecycle、confirmation-stale 和 committed-presentation-lifecycle。旧测试未修改、删除、skip 或放宽。完整默认 check 包含原 E03，不另叠一轮全量。只用 `VITEST_MAX_WORKERS=2` 控制本机资源，未改脚本/timeout/CI/依赖。

## 越界、自查与停止点

`protection.json` 和 Git 回执记录：十个 HTTP 实验文件字节保全，78 个其他既有 refs 未移动；其他两个 worktree HEAD 保持原值。本轮最终相对 BASE 的跟踪变更严格限定为一个组件、一个新测试和 `r1/` 文档。四张原图及其 manifest/metadata、既有 CSS/layout 和所有其他受保护对象与 BASE 一致。

未进行原生浏览器、截图、分辨率或 Owner 体验验证：本任务不要求且明确不占 A 的原生桌面。本轮未启动/替换 Owner 服务、未接管日常 profile、未读写 Owner 实际存档、未 SSH/部署。四图仅继承 f75 已审证据，实际拍摄源为其 PARENT `ffa2fd86b2dcd49b9b1ca97375e0432f6380fec3`，不是 R1 新截图；没有重打图包或源码 ZIP。

工程修复及本轮检查通过后，仅余主线准确 SHA 复审。完成即停止，不自动试玩、部署、合并或推进其他剧情/UI。
