# ENG-LONGCHAIN-TEST-BUDGET-001 准确提交复审 v1.0

## 结论

**PASS。F01 的本机默认完整检查欠账关闭；已关闭的 F02 保持。无需继续返修测试预算。**

审查日期：2026-10-20。受审 SHA：`7a3acd3855aefdde68fdaed13ebe037f3e9bd6de`；父 SHA：`de8f358d2d281eb4ff914d6ebc20f16986164701`；tree：`17d43169891e71e5e5686ccff8271f98b49800c7`；分支：`feature/world-route-acceptance-001`。

本结论只收口本任务及 E03-A 的限定测试／路线验收门槛。不是完整 E03、玩家安全查询、UI、浏览器保存、多标签或 Owner 体验通过；也不是生产性能优化结论。

## 一、实际读取与核对

1. 使用已连接 GitHub 读取准确 commit 的全部变更结构与关键 diff，核对 Git commit 对象、父提交、tree 和当前远端同名分支。没有冒称读取 Owner 本地磁盘。
2. 完整读取两份最终测试。`combat-longchain.integration.test.ts` 仅首个完整成功链增加 `,30_000`；`supply-longchain.integration.test.ts` 仅 success/voluntary-failure 参数化调用增加 `, 30_000`。其余逻辑、断言与调用保持。
3. 主线在容器保存上述工具返回的源码，重算最终 Git blob 后，只移除该唯一新增参数，再重算整份原始文件 blob。四个指纹全部匹配，证明没有连带修改 callback、断言、fixture、seed、策略或其余测试。这是整文件字节证明；主线没有另跑作者的 Rolldown AST 脚本。
4. 实际打开本会话的原任务 ZIP，核对其中任务、权限、基线、报告及清单；五份 blob、四项 SHA-256 和完整 inputs 目录 tree 与远端匹配。目录 tree 为 `683f876e43722d5d428d6e1e2829b43f85166bfb`。
5. 变更仅12条授权路径；除两份测试外为文档及原件，两个旧文档仅追加。未见全局 timeout、worker、CI、依赖、生产实现或 F02 修改。完整保护对象枚举／全部链接／W01累计命令由作者执行，主线没有再次完整执行这些命令。
6. 独立查询 CI158 run `39448730938`：准确 SHA、attempt1、completed/success。读取 job `118717516392`，核对架构、类型、全量测试、build四个步骤均 success。本轮未下载完整CI日志重新统计用例数，242/4318与330.53s分别保留为作者CI日志摘记。

## 二、两份源码的独立字节证明

| 文件 | 起点 blob／移除新增参数后 | 最终 blob |
| --- | --- | --- |
| combat-longchain.integration.test.ts | 64a9a5407944efa684128e3bec5980f9c1a6de02 | fbe01336c6aa57f5056d17a96d1b23f75463bf46 |
| supply-longchain.integration.test.ts | c9c9cf3a46cf12ec888b7a97e5fb1d58f444a8f3 | e3689797ecf1b0979ac5830fed90dad788e43849 |

删除量分别仅7与8字节。两个调用展开影响3个用例，而非新增3个测试；仓库测试数量仍242文件／4318项，新增／替换／删除／净增均0。

## 三、作者实测与主线证据分账

作者默认原样基线：4316通过／2超时，exit1；两项分别5869ms与5290ms，记录保留。作者修改后两次固定顺序默认完整check均4318项通过，282.93s／296.04s；未通过worker覆盖替代默认检查。目标10项与E03额外124项均通过。金额120误断言121的仓库外负控得到业务AssertionError，未冒充新生产缺陷。

主线复核了源码、任务原件和这些证据记录，并独立确认准确SHA远端CI的全部必要阶段通过；没有在主线运行上述原生测试、全量npm、四路线、72样本或负控。对完整仓库的主线获取尝试实际失败于DNS，`git ls-remote` exit128，记录随审查附件保留。

不能将作者两次全量、本轮额外定向、CI和主线字节检查相加为新增测试。

## 四、为什么可以关闭 F01

修订只改变完整长链用例的执行时限，不改变被验证的事实。任务要求的两次本机默认完整检查已有真实成功记录；相同准确提交的默认CI也通过。没有删除慢种子、skip、全局加时、弱化断言或改变生产路径的证据。故本任务原定门槛满足。

这一结论不承诺任意硬件或负载下永不超时，也不等于已经完成性能剖析。以前CI156失败、本机失败和CI157成功继续作为各自时点记录保留，不倒改历史。

## 五、保留边界与下一步

W01仅原两份历史输入七处Markdown硬换行；累计检查仍真实exit2，新差异要求exit0。该历史例外没有扩张为其他警告豁免。

E03-A的四路线与固定八seed／九组合是有限原生见证；63成功／9死亡不能推广为总体胜率或平衡结论。安全查询仍是候选，raw item selector含seed、wound selector含execution的隔离责任尚未通过生产工程验收。

下一步由主线另行下发安全查询技术合同归档任务；本审查本身不直接授权生产开发。既有UI、浏览器、多标签、O3、完整E03和Owner首玩Gate继续OPEN／NOT RUN。

## 来源与复核入口

- Repository：`lvlw/elevator-survival`，准确提交`7a3acd3855aefdde68fdaed13ebe037f3e9bd6de`。
- `src/state/residence-session/combat-longchain.integration.test.ts`
- `src/state/residence-session/supply-longchain.integration.test.ts`
- `docs/engineering/world-integration/longchain-test-budget/completion.md`
- `docs/engineering/world-integration/longchain-test-budget/implementation-notes.md`
- 原任务 ZIP：`ENG-LONGCHAIN-TEST-BUDGET-001-Codex-Package-v1.0.zip`
- CI158：`https://github.com/lvlw/elevator-survival/actions/runs/39448730938`

审查附件包含源码及指纹核验数据；源码base副本由删除唯一获批参数还原，并由起点blob核实，不冒称通过完整仓库checkout取得。
