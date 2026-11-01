# ENG-WORLD-UI-V1-INTEGRATION-001 — 将已有新版UI真正接进游戏

**本包是可执行工程任务，不是设计讨论、原型制作或试玩准备。Owner已明确要求立即安排整套UI落地，当前先不试玩。**

- 准确起点：`c5abeda4861710325a123e8321a314423525f8df`；tree：`7b97cd88523255a737fe406974b78de247672f57`。
- 新分支：`feature/world-ui-v1-integration-001`；只准该分支普通commit/push。
- 实际交付：原`?dev-infected-world=1`入口的新版React界面、既有安全行为完整保留、真实浏览器画面及主稿对照。
- 三个连续工程工作包：M1主壳/场景；M2实物/信息层；M3战斗/异常/整体回归。不要在第一张背景或第一幅演示完成后停下等Owner；范围内自查修订一并完成。
- 全程不安排Owner试玩；最终由主线先做准确SHA与视觉实审，再决定何时恢复Owner试玩。

阅读顺序：OWNER-AUTHORIZATION → TASK → UI-INTEGRATION-CONTRACT → SCOPE → DEV-ASSET-ALLOWLIST → ACCEPTANCE → SOURCES。

直接读取本地仓库准确基线与设计原件。不要要求Owner重复转交已经在GitHub里的源码、素材或旧任务包。包内只有任务说明、准确资产引用和Owner否定的旧药房参考图，没有复制仓库源码或原素材库。

包完整性使用PACKAGE-MANIFEST.json核对。包内**没有**verify-package.py，不要声称运行不存在的脚本；用现有标准库核对路径/CRC/载荷摘要即可，不另建复杂打包工程。
