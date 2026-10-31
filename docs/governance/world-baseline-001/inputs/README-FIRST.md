# GOV-WORLD-BASELINE-001｜先读我

这是 2026-10-31 新主线的治理收口任务包。已经实际完成远端盘点与固定检查点创建；需要 Codex 一次完成本地核对、当前入口落文、证据索引、检查与风险资料，并在独立新分支交付。

**不是让你再治理一遍所有历史代码，也不是让你合并旧分支。** 所有旧远端 feature tip 已包含在 a7 中；不要从旧 main 或旧设计分支开新工程。固定 baseline 只读。

## Owner 此刻操作

把这个 ZIP 整包附给 Codex 工程会话，再发送 `SEND-TO-CODEX.txt` 的全部内容。无需自己切分支、手算来源或复制几十份旧材料。推荐模型与强度见任务书；实际可选性未独立核验。

## Codex 阅读顺序

`AUTHORIZATION.md` → `BASELINE-AND-SCOPE.json` → `GOV-WORLD-BASELINE-001-TASK-v1.0.md` → `MAINLINE-GOVERNANCE-REPORT.md`／`CURRENT-STATE.md`／`OPEN-GATES.md` → `SOURCE-INDEX.json`／`BRANCH-REGISTER.json`／`evidence/REMOTE-EVIDENCE-SUMMARY.json` → `inputs/`审查原件。

验证：`python verify-package.py <解压目录或本ZIP路径>`。验证只证明本包完整性，不证明仓库测试或美术通过。

## 当前准确入口

- commit `a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0`；parent `723d547665298463ecd8a8d04c7ed508a1658dc1`；tree `1f75162b22bcf486796b6c02bc57b3ec38e6616a`。
- 固定检查点 `baseline/world-pre-b1-20261031` 已远端创建并回读；原29 refs均未变。
- 工作分支 `chore/world-baseline-governance-001` 尚未由主线创建，按任务由Codex从准确SHA建立。
- A实审承接PASS；B1候选未实施，C与美术采用未授权。

## 包含与不包含

包含主线治理摘要、完整分支登记、范围／授权／任务正文、源索引和Owner上传审查MD原字节。**不包含**完整仓库、旧素材/截图、旧任务交付ZIP或上一主线evidence ZIP；原件从明确SHA仓库读取。源索引中的远端blob是工具返回的对象引用，不冒称全部已在本包重新计算。

本包不自动更新Project Sources或项目说明。若这些旧快照与当前仓库不同，按适用版本及正式权威处理并登记，不复制旧文件覆盖新版本。
