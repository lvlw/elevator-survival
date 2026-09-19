# AUD-ee2720c：DOC-WORLD-001／001A GitHub 指定提交归档核验 v0.1

- 日期：2026-09-20。
- 审查仓库：`lvlw/elevator-survival`。
- 审查提交：`ee2720c9c3d7dc2f4213cb215e8c38efafb3ccde`。
- 唯一父提交：`11cc705a9a923b367919cc9139de5097c006beb7`。
- 提交信息：`docs: archive full-world design decisions and legacy proposals`。
- 审查类型：已审交付物与实际 GitHub 提交的一致性、变更范围、归档和 CI 核验；不是完整游戏的新一轮源码全审或 Owner 试玩。

## 1. 结论

**PASS — DOC-WORLD-001 与 DOC-WORLD-001A 的已审文档已进入指定远端提交，未发现提交漂移或越界变更。**

本次核对的是固定 SHA，不用会移动的 main 代替它。此结论可作为这次正式文档更新的 Project Sources 同步依据；不证明当前用户电脑没有其他工作区变化。

## 2. 已执行核验

| 项目 | 结果与证据 |
|---|---|
| 提交及父提交 | GitHub Git Commit 接口返回上述完整 SHA，只有 `11cc705…` 一个父提交。 |
| 变更范围 | GitHub compare 返回仅 1 个新提交、13 modified + 22 added，共35个文件；没有其他变更。 |
| 13份正式文档 | 从已审交付原始字节计算 Git blob ID，与该 SHA 的 root/docs tree 逐项相等；SHA-256 清单保持。 |
| 22份 small-world 文件 | 合并原交付与001A增量副本后，按 Git tree 算法计算整棵子树，得到 `1c483d0a7b6bfafb8a3e368d0bf7e8da2184796a`，与 GitHub 指定提交相同。该相等同时验证内容、路径与文件模式，不只对比文件数量。 |
| 原始归档与证据 | 8份原始Markdown与4个ZIP同原始附件逐字节匹配；4个ZIP本轮做读取/CRC验证，没有运行其中程序。其远端内容由相同的Git blob/tree身份核对。 |
| DEC完整性 | 001—045保留原前缀；046—048与给定落文稿相同；001—048连续且唯一。 |
| 旧Proposal处置 | 两份原文及独立来源清单位于 `legacy/goal-7d-prep-001/`；远端没有旧的两条根路径。当前本机untracked情况不由远端树证明。 |
| 阅读入口与状态 | 远端small-world入口与已审副本一致；修订后的历史说明与未决项保留已确认/候选/实现/体验差别。分段突破继续OPEN / NOT RUN。 |
| 非文档内容 | 对比父提交与目标提交的root tree，除README/docs外所有条目相同；`src`子树均为 `190820c6c9e78efc5db592055a50f6bc682d3c7d`，scripts、CI、AGENTS、package/lock和构建配置未变化。 |
| 远端CI | CI #113，run `35458115713`，push事件，head SHA为本审查SHA，completed / success；check job `105936917429`亦completed / success。 |

上述文件核验由审查者本轮实际计算，不是直接抄写Codex的PASS。API返回的CI成功只证明该远端检查的结果；本轮没有重新运行npm，也没有从CI原始日志重新提取测试数。104 files / 2153 tests来自此前Codex完成报告，不冒充本轮本地实测。

## 3. 审查链及结论边界

`DOC-WORLD-001-actual-review-v0.1.md` 记录首轮实文件审阅与R1—R3；`DOC-WORLD-001A-final-review-v0.1.md` 记录增量修订与旧稿归档通过；本报告才确认这些已审内容进入了上述GitHub提交。三份报告不能互相替代，也不能把第一轮有待修订的结果追写成当时全通过。

这些报告是审计证据，不是DEC、玩法实现授权、完整世界Design Freeze或第二套协作制度。旧报告中“Owner提交/push”是当时的执行安排；Owner后续已明确要求由Codex按具体授权任务代执行commit/push，不改变审查门槛或允许未经授权提交。

新敌人数值、完整主线与安装条件、专长、未成功的Day 7流程、Success/Save/UI及跨日实现契约仍待各自收口。分段突破当前允许、Owner试玩未运行。文档的“未实现”状态未因本次CI成功而关闭。

## 4. Project Sources同步

可用该SHA下已核验的13份正式文件替换Project Sources中对应同名旧文件。不要把small-world历史Proposal、核算ZIP或本审计链另立为并行正式规则。同期源码版本没有变化，此次差异是已确认文档待同步，而不是选择旧Project文档否定新的Owner确认。

本报告不声称已经执行Project Sources替换。可用附带的独立同步包；每个文件都已通过Git blob身份与目标提交核对。

## 5. 可复核来源

- GitHub commit：`https://api.github.com/repos/lvlw/elevator-survival/git/commits/ee2720c9c3d7dc2f4213cb215e8c38efafb3ccde`
- GitHub compare：`https://api.github.com/repos/lvlw/elevator-survival/compare/11cc705a9a923b367919cc9139de5097c006beb7...ee2720c9c3d7dc2f4213cb215e8c38efafb3ccde`
- 目标root tree：`b0368debe355f21c310154ce0e42768a6b8fae79`。
- 目标docs tree：`e1b012a6336b1686f0b323c6c584b15ea80591d0`。
- 目标small-world tree：`1c483d0a7b6bfafb8a3e368d0bf7e8da2184796a`。
- CI：`https://github.com/lvlw/elevator-survival/actions/runs/35458115713`
- 35份已核对文件的大小、SHA-256和Git blob见同目录 `ee2720c-verification.json`。其中远端对象ID从本轮GitHub连接器读取，非由本地文件反向假定。

远端二进制ZIP未另行通过连接器下载；本轮使用已审本地原始字节、GitHub提供的对象身份及整树身份完成一致性核验，不声称逐个远端二进制下载。没有运行新的游戏策略、浏览器或生产存档测试。

## 6. 归档提交本身

本报告只能审查 `ee2720c…`，不会包含将来保存本报告的提交自身SHA。后续纯报告归档提交采用新commit，在完成报告中记录新SHA及校验；不要为了把审查报告写回同一个受审SHA而amend、force-push，也无需无限产生“审查归档的审查归档”。
