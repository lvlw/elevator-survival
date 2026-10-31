# 《电梯求生》主线分支治理与接手报告 v1.0

日期：2026-10-31。本次范围：远端分支事实核验、非破坏性基线固定、进度与门槛归并。不是新一轮完整源码实审或发布验收。

## 一、结论

**当前不是 28 个互相分叉、等待合并的功能包。** 原远端 29 个分支中，除当前 `feature/world-presentation-prep-001` 外，27 个旧 feature tip 和 main 的 tip 均在 `a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0` 的祖先历史中。对每项执行 base=a7、head=该分支的 compare，均得到 ahead_by=0、merge_base=对应 tip。不存在这些已列远端 tip 中尚未包含到 a7 的独有提交。这个结论不覆盖用户本地未推送分支或未提交文件。

main 比该接续点少 62 个提交，这是默认分支尚未接纳新世界累计工作，不是工作丢失，也不是可以自动把 62 个提交整体发布。不要逐条 merge 27 条旧分支，更不要用 squash／rebase 破坏既有审查 SHA。

## 二、本轮实际写入与复核

已通过 GitHub 连接创建：

```text
refs/heads/baseline/world-pre-b1-20261031
→ a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0
```

创建后独立读取 ref，再重新列全部分支：**30 个，原 29 个分支 tip 均未变化**。没有创建新 commit/tree，没有合并、删除、改名、移动旧分支、推 main、强推、修改代码、规则、依赖、CI、GitHub 保护设置或服务器。

这是一个约定保持不动的检查点分支，不是服务端不可变对象，也不是里程碑验收／发布分支。将来新任务新建工作分支，不在该 baseline 追加提交。

## 三、治理分类与下一步取用

| 分类 | 处理 |
| --- | --- |
| main | 保留旧医院默认状态；公开发布与旧槽 O3 未批准前不推进 |
| 固定 baseline | 本轮新增；后续取用仍核对完整 a7 SHA，不只信分支名 |
| presentation-prep | 保留已审任务停点；A 无需返修，不把治理文档塞回原批次 |
| 27 个旧 feature | 逻辑登记为历史检查点，保留原引用；不再作为最新工作入口，无须补合并 |
| 未来工作分支 | 从固定准确基线或其已审纯文档后继新建；每批单独白名单与 commit/push 权限 |

本轮没有物理删枝。删除、改名、迁移到标签、回收 worktree 或保护规则落地，不由本次分类自动获准。先由 Codex 实查本地工作树和未推送差异；无需 Owner 自行逐目录核对。

## 四、完整远端分支登记

“相差提交”指该 tip 距 a7 的 behind 数，不是待合并任务数；所有行在 a7 之外独有提交均为 0。

| 分支 | 完整 SHA | 相差提交 | 当前治理类别 |
| --- | --- | ---: | --- |
| `main` | `a76e9c1c998051fc1643b6e0c3d53443fa55feed` | 62 | 旧默认保留 |
| `feature/design-world-infected-world-001` | `6b48b3de6521d9a9c296754a4d8135c7f7c7ca35` | 52 | 历史检查点保留 |
| `feature/mission-lifecycle-core-001` | `d1d3b7927c6733cff709a4bfd617fb1e85e7485a` | 51 | 历史检查点保留 |
| `feature/design-world-entry-002` | `9dfe21ef7f423c1e5d9801d26e4425b28444cf63` | 48 | 历史检查点保留 |
| `feature/residence-energy-cycle-core-001` | `942b2d93916c649f4c2ec6cd399035151269d2ca` | 46 | 历史检查点保留 |
| `feature/residence-location-core-001` | `d7953bbf96dc842d2953e019f950275cd693bf09` | 45 | 历史检查点保留 |
| `feature/residence-session-core-001` | `60e9c30732c5e22cfe9ff58b9b381de64b945180` | 44 | 历史检查点保留 |
| `feature/residence-actions-core-001` | `7ca547ab8ab4f411d1102a79baf8c0796f4b082c` | 43 | 历史检查点保留 |
| `feature/design-world-entry-003` | `6438f7a38939297225538cdd68af24201ed7d34f` | 40 | 历史检查点保留 |
| `feature/residence-terminal-core-001` | `bfc6bd973eeb306df1e8ee916b2160c30b757cdf` | 39 | 历史检查点保留 |
| `feature/residence-terminal-restore-001` | `b9b1e0fee0e779669ca40e088ac9a867016bff82` | 38 | 历史检查点保留 |
| `feature/residence-terminal-session-001` | `0921df3f219f368479d1bf3401d8fecddc0d5f71` | 37 | 历史检查点保留 |
| `feature/design-world-entry-004` | `ad56a7d9dfc08e38f966f20cf7e07c71c08c09dc` | 34 | 历史检查点保留 |
| `feature/residence-content-supply-core-001` | `8c19ca0d28058cf743b41c8547cc2629c8eac767` | 33 | 历史检查点保留 |
| `feature/residence-content-supply-restore-001` | `84eb6dff5e9d3238c3e651525b6ed28412132549` | 31 | 历史检查点保留 |
| `feature/residence-content-supply-session-001` | `9c3c8a8c97c374bd1def6217c691137f3df10096` | 30 | 历史检查点保留 |
| `feature/design-world-entry-005` | `4166fb25ab2898ca602043fbddacbb88d3444fdf` | 27 | 历史检查点保留 |
| `feature/residence-combat-core-001` | `9ada1bd76c768b7bcff676b263e4533854064909` | 24 | 历史检查点保留 |
| `feature/residence-combat-restore-001` | `29a018a2ad64f8d5cbe56257381568bf3527cd08` | 22 | 历史检查点保留 |
| `feature/residence-combat-session-001` | `713dd376ddb60d20d9afaedaee4505e695f89d94` | 21 | 历史检查点保留 |
| `feature/world-route-acceptance-001` | `8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3` | 17 | 历史检查点保留 |
| `feature/world-player-query-001` | `394f59d3c5df2a65ce87186e8988982d76784a71` | 16 | 历史检查点保留 |
| `feature/design-world-entry-006` | `ff2b79f332c5ea2bec493eb5e166dcee6ba667eb` | 14 | 历史检查点保留 |
| `feature/world-preplay-foundation-001` | `bc60f24cc16625a25ad56b0b917da63b16f29f56` | 12 | 历史检查点保留 |
| `feature/world-browser-owner-001` | `0ac23bc3654d69c3d0a6289d5d9e97ce30c69164` | 11 | 历史检查点保留 |
| `feature/world-low-asset-ui-001` | `6bb43c8861b7c3dd21499211fdb0e646e48bba20` | 9 | 历史检查点保留 |
| `feature/design-ui-v1-001` | `956da8065030ccea15256e49bd927a4e6a71942f` | 6 | 历史检查点保留 |
| `feature/design-ui-readiness-001` | `723d547665298463ecd8a8d04c7ed508a1658dc1` | 1 | 历史检查点保留 |
| `feature/world-presentation-prep-001` | `a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0` | 0 | 已审批次停止点 |
| `baseline/world-pre-b1-20261031` | `a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0` | 0 | 固定检查点（新增） |

## 五、其他实时核验

- 开放 PR 列表为空。
- 分支列表返回所有项 protected=false；本次可读 rulesets 列表为空。这只是可见配置事实，不构成全权限／安全审计。尚未修改保护策略，不把“冻结”措辞当成服务端强制。
- a7 Git commit 对象：parent `723d547665298463ecd8a8d04c7ed508a1658dc1`；tree `1f75162b22bcf486796b6c02bc57b3ec38e6616a`。
- CI #175（run 41099921845）：实际读取 head_sha=a7、completed/success、push 触发。本轮没有读取该 job 全量日志或运行本地测试；4,725 等数字承接上一主线审查原件。
- 标签集合查询被连接器白名单拒绝，标签状态 NOT VERIFIED；不推断仓库无标签。

## 六、当前进度已归并，不能倒退也不能超报

详见 `CURRENT-STATE.md`。正式规则已推进至 DEC-053；成功 120 与本期三专长效果等已列明试用批准，不能继续沿用项目说明 2026-10-03 的“全部待批”。新世界核心、真实来源／任务、活战斗与 v4 恢复、查询、浏览器 owner、低资产 DEV UI 均有后继实现记录；不是还在首身份核心之前。

另一方面，新设计 v1.2／readiness 的图稿、原型与候选素材尚未变成正式运行 UI。实际 battle-stage 仍使用“当前对手”和中性人物占位。A 安全对手查询本批已审 PASS；B1 仍是候选；C、素材采用、完整动态演出、Owner 体验与 O3 不因 A 或 CI 通过而关闭。

18 背景真实 2×及最终透明清稿仍 OPEN。原 CI 的 7 项依赖告警只登记为待分析风险，不由本批升级或自动修复。远程审阅通道继续保持此前暂停状态，不操作 Wiki／隧道／云主机。

## 七、证据边界与交付

`SOURCE-INDEX.json` 记录本轮已读文件、精确 blob、读取范围及限制；`evidence/REMOTE-EVIDENCE-SUMMARY.json` 是主线从工具结果归纳的结构化摘要，**不是原始 API 响应字节归档**。`inputs/` 只包含 Owner 上传的上一主线审查 MD 原字节，不含其未上传的证据 ZIP。

当前报告没有同步 Project Sources、修改项目说明或宣称读取 Owner 本地磁盘。已有源文件的全文、审查记录和资产须在 Codex 治理收口时继续按实际可访问材料核对。当前接续所需层级已理清，不代表所有旧 Goal 在本轮重新实审。

## 八、明确下一步

下发同包 `GOV-WORLD-BASELINE-001`：集中完成本地保全核对、当前状态入口与历史批准／验收索引、一次默认检查及只读依赖风险核查、资产清单复核和纯文档入库。在独立 `chore/world-baseline-governance-001` 正常 commit/push 后停止，回主线做准确 SHA 治理验收。

本轮不让 Codex 写 B1 生产代码，也不把候选字段自审变正式合同。治理证据收口后，主线下一工程方向为 B1 定稿与独立实现；无需重做 A，不直接跳 C，不合并 main。
