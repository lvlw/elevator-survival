# ENG-RESIDENCE-ACTIONS-001（G4）作者完成记录

状态：作者实现及本地验证完成，待最终准确 SHA 主线源码实审。不是主线 PASS，不是完整新世界或玩家试玩通过。

## 起点与交付

- 起始／预期单次提交父 SHA：`60e9c30732c5e22cfe9ff58b9b381de64b945180`。
- 起始分支 `feature/residence-session-core-001`、工作区与暂存区干净；从该 SHA 新建 `feature/residence-actions-core-001`。
- 开工实跑：121 files / 2681 tests PASS。最终：124 files / 2791 tests PASS。
- 普通提交建议：`feat: add controlled first launch and residence action transactions`；只推 `origin HEAD:refs/heads/feature/residence-actions-core-001`。最终 SHA、远端核验和 CI 实况在提交后报告，不为自引用反复 amend。

## W1—W4 完成内容

W1：先记录设计，扩展严格六类命令；可选受控 execution provider，真实 activateMission → G1 depart → G2 establish，body、carry、其他任务不刷新；无提供者的旧 G3 调用仍兼容。

W2：接通真实 G2 来源揭示、整实例拾取／留置及 A/C 休整。每类严格绑定唯一 current 与 revision，原计划签发及后态校验保留；非 rest 保持整个 clock，rest 只按真实 G1 结果推进 D/T 并保持完整现场。所有操作走原唯一 commit/save/notify。

W3：真实 read-null→创建→launch 起步长链完成；五个冷恢复检查点、两条独立保存故障链、各操作 write failure、五类 callback 重入和监听隔离均通过。详见[合同 A01—A12 映射](contract-and-support.md)和[逐项计数／验证](verification-results.json)。

W4：主会话逆向自查与两名只读 helper 检查完成。补强精确拒绝码、后段 aggregate 拒绝、drop冷恢复、已有堆不合并、非零敌人游标跨夜。记录一次新测试排序假设错误及修订，未改正式规则或核心行为。

## 文件范围

生产变更仅 `src/state/residence-session/`：types、commands、session、index，新增 launch、transitions。测试修改 session.test、session.integration.test、test-fixtures，新增 launch.test、operations.test、operation-persistence.test；原 persistence.test 不改。

文档：本 G4 四份交付文档及五件原始 inputs；仅末尾追加 Architecture、Traceability、world-overview、decision-queue。`controlled.ts` 无需变更。实际审计25条路径（11修改、14新增），在27条白名单内。

## 测试与真实计数

- 新增3个测试文件，共114个展开用例；原 integration 新增1条长链：总新增115个展开用例。
- 原 G3 五条“kind完全不支持”旧范围断言由 G4 合法／非法矩阵替换，移除旧5项，保留 view/close/combat/medical。净增110；不是将重复运行计作新增。
- 定向20文件／638项 PASS：原身份103 + cold23 + G1 169 + G2 115 + G3 save61 + session167。
- 原 G3 的历史141项保留历史身份；当前对应 G3/G4 区域是 cold23 + save61 + session167 = 251项，其中净增110。

两条故障链计数包含各自首次 create 提交：

| 观测 | launch写失败→reveal→retry | reveal写失败→pickup→rest写失败→retry |
| --- | ---: | ---: |
| execution provider / mission activate / site establish | 1 / 1 / 1 | 1 / 1 / 1 |
| G1 cycle / action | 1 / 1 | 2 / 2 |
| G2 reveal / transfer / rest / move | 1 / 0 / 0 / 0 | 1 / 1 / 1 / 0 |
| RNG draw | 1 | 1 |
| 内存提交（current引用独立观测） | 3 | 5 |
| 原 owner read / write尝试 / notify | 1 / 4 / 3 | 1 / 6 / 5 |
| 额外新domain cold read / write / notify | 无 | 1 / 0 / 0 |

第二链冷恢复的 provider、factory、规则调用均0，source cursor1，同一真实实例／资源，D2/T2/startCycle1，全快照一致。旧命令拒绝、retry只存当前，无隐式 reload、rollback、重激活、重抽、重复周期或复制物品。

## 验证和限制

`npm run check` exit0：architecture PASS（50 DEC、246 core production files）、typecheck PASS、124/2791 tests PASS、build PASS。构建仍提示旧浏览器 bundle 超过500kB，不修改构建配置。实际定向失败637 PASS/1 FAIL与修订说明保留于[实现记录](implementation-notes.md)，不是隐藏失败。

原始 stdout、Vitest JSON、失败记录、源码指纹、保护对象审计及完整 patch 保存在仓库外 `C:/Users/zjl/AppData/Local/Temp/residence-actions-g4-audit`。仓库内验证JSON记录事实及文件名；审计在暂存、提交后再次核对，不把预计成功写成实际远端成功。

工作区保护审计 PASS：753份基线保护对象保持，9份既有 checkout CRLF 仅做 LF 对照后核对 Git blob，没有改其字节。五件输入的字节／大小／SHA-256／Git blob 一致；四份共享文档保留旧字节前缀；24个新增相对链接有效；34项配置叶与批准键值一致；94个运行时依赖文件中无新环。新增及变更文件 UTF-8无BOM／LF，普通、cached、基线至工作区 diff-check PASS。

原身份核心、G1/G2、residence-save、G3历史文档、DEC、旧医院、依赖、scripts、CI、浏览器/UI及存档格式均不修改。最终源码／index／commit指纹须一致才交付，暂存及提交后审计写到仓库外而不为自引用 amend 本文件。

规则冲突：无。当前G4范围内未完成实现项：无。完整返回／截止／死亡协调、后续委托、钱包、战斗、五图、专长、玩家入口、真实浏览器存储及 O3 仍为明确范围外责任。浏览器／多标签／Owner试玩 NOT RUN；不宣称体验通过。

提交推送后停止，等待主线准确 SHA 实审；不启动下一工程，不合并、不推 main／旧分支、不强推，不关机／重启／定时操作。
