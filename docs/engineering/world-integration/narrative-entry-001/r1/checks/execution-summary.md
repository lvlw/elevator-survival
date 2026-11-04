# 本轮命令执行摘要

此文件是实际终端结果的摘录，不冒充原始终端日志。能保存的原始日志另附。

| 阶段 | 命令/环境 | 实际结果 |
|---|---|---|
| W0 BASE | 原npm run test:run | 355文件/5069测试通过，570.73s，exit0 |
| 修复前业务红灯 | 准确afbb隔离源码，加入两份本轮测试，vitest run这两文件 | 2文件/7测试业务失败，5.45s；启动缓存EPERM单独排除 |
| 初修定向 | 新旧state/UI narrative四文件 | 4文件/13测试通过，7.11s；typecheck通过 |
| 相邻回归首轮 | 63个相关UI/browser/state文件 | 424项中415通过、9失败；旧setup按钮名称不一致 |
| 按合同窄适配 | setup + 新UI narrative | 2文件/14通过，5.46s |
| 投影/初配小组 | state narrative两文件 + setup | 3文件/16通过，6.37s |
| 初轮原check | architecture/typecheck/test:run/build | 357文件/5076通过，578.71s；53 DEC/347 core；exit0；其后自查又加两项，不作为最终回执 |
| 自查前边界测试 | state narrative-r1五项 | 现场丢失、必要工具绑定丢失2失败；其余3通过，4.08s，原始self-review-before.log |
| 自查修复后定向 | 新旧state/UI narrative四文件 | 4文件/15测试通过，7.41s，原始self-review-after.log |
| 两类最终负控 | 隔离最终源码副本，酒店重新标search；P06强制read | 各自业务断言失败、exit1；原始negative日志；逐字节还原 |
| 最终原check | 原npm run check；环境VITEST_MAX_WORKERS=2 | 以final-check.log及final-check.exit为原始权威，不复用旧轮次 |

原check含既有E03，不额外叠跑一轮全集；没有修改脚本、timeout、依赖或CI。新增总数由5069增至5078（9项），其中state5项、UI4项。原有测试无删除或skip。

真实浏览器是原DEV React，不是afbb合成复现脚本。包内REPRO-RESULTS.json是主线原始旁证，不能纳入本轮新增游戏测试数，也没有用于替代正式facade/controller回归。
