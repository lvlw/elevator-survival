# G3 + ADDENDUM-01 作者完成报告

起始／预期父 SHA：`d7953bbf96dc842d2953e019f950275cd693bf09`。分支：`feature/residence-session-core-001`。本文件随一次工程提交保存；最终 SHA、push 回执和远端核对在提交后消息提供，不为自引用而 amend。

## 基线与范围修正

原任务开工工作区干净，实际执行基线为 **115 文件／2540 测试**；另实跑原身份测试 **1 文件／103 项**。暂停期间 HEAD、源码、测试、依赖未变，续办时 cached diff 为空，仅保留本实现记录；未重复建立基线。

原阻塞是旧 K19/K20 精确枚举四个 controlled 导出，与新增冷候选入口及旧测试只读要求冲突。完整阻塞记录和 ADDENDUM-01 正文保留在 [实现记录](implementation-notes.md)。有效白名单为原 30 条加唯一旧测试路径，共 31 条；五份原 inputs 不改。

旧测试的唯一 Git 差异为 controlledApi 预期数组新增 `'parseMissionColdCandidate',` 一行。原四个名字、publicApi 清单、Object.keys(...).sort()、精确 toEqual、测试名及其他断言保持；原 103 项仍是 103 项，不计为新增测试。

## 四包实现

1. 冷候选：仅 controlled 新增 parseMissionColdCandidate；复用 readValue，严格绑定、冻结返回，无 current 安装权。原四函数和 restoreMissionCandidate 独立 expected 保持。
2. 聚合与 codec：严格 headless envelope、fresh-hub / active-world union、受控独立策略、完整声明全集和跨绑定、真实容器／ItemState／G2 现场校验；未知版本、坏档及未支持历史不修补、不 new。先严格校验／序列化后允许提交。
3. 唯一会话：受控域只认领一个 writer；私有 current；真实 read-null 才允许首次 factory；ready 禁止二次 bootstrap/create。唯一 move 路径使用真实 G2 plan、G1 规则、签发及前态校验，完整内存提交后 write 一次、通知一次。
4. 原生验收和文档：六份新测试、S01–S12 映射、支持合同、实际失败修订和日志摘要；四份既有文档仅末尾追加，保留 G2 实审来源、G3 待准确 SHA 实审及 OPEN Gate。

API、状态机、拒绝分类及全部支持责任见 [合同与支持矩阵](contract-and-support.md)；十二组实际入口／代表测试名见 [验收映射](implementation-notes.md#十二组原生验收映射)。机器可读执行记录见 [verification-results.json](verification-results.json)。

## 实际测试与自查修订

| 执行 | 结果 |
| --- | --- |
| 本轮开工 test:run | 115 文件／2540 项 PASS |
| 未改源码原身份回归 | 1 文件／103 项 PASS |
| 首轮定向 | 17 文件／514 项，511 PASS／3 FAIL |
| 修订二定向 | 17 文件／522 项 PASS |
| 扩展定向 | 17 文件／528 项 PASS |
| 最终定向（自查修正后） | 17 文件／528 项 PASS：原身份 103、G1 169、G2 115、新增 141 |
| 最终 npm run check | PASS：architecture、typecheck、全量测试、build，exit 0 |
| 最终全量测试 | **121 文件／2681 项 PASS**；净增 6 文件／141 项 |
| architecture | 50 DEC／246 core production files PASS |

首轮三个失败全部为新增测试预期：既有 ItemState 工厂按实例 ID 规范排序（两项），缺失 envelope.state 在外层拒绝（一项）。核对正式代码后纠正断言，没有改规则迁就测试。后续自查把来源已兑现回归改为精确 G2 输入并断言 NOT_AVAILABLE，防止多字段拒绝误通过。最后版本重新实跑定向及完整 check。

两次 typecheck、两次完整 check 均成功；最终 build 419 modules，保留既有大于 500 kB 的 chunk warning，未改阈值或构建配置。测试重跑不重复计入新增数。

原始 stdout 与测试 JSON 保存在仓库外 `C:/Users/zjl/AppData/Local/Temp/residence-session-g3-audit`。最终测试源码指纹为 `eb49126c2ac652e5d6836d850b86a6838bc46270ef81b19f926a0f0fe0003519`，覆盖 18 份源码／测试路径；暂存及提交还须与该实测版本核对。

## 保存故障、重入与真实组合

连续故障见证：r → r+1 保存失败 → 只读查询 → r+2 保存失败 → 旧 r 命令拒绝 → 显式 retrySave 保存 r+2。**2 次真实规则计划、2 次完整内存提交、1 次 read、3 次 write 尝试、2 次玩法通知**。旧磁盘字符串在两次失败期间保留，内存继续使用新状态，无 rollback/reload/自动重试/重放。

首次 create 写失败仍 ready，不重建角色。read、factory、write、notify 中重入均 BUSY；write/notify 读取完整 committed 状态；抛错订阅隔离并继续后续订阅，返回安全 LISTENER_FAILED，不暴露原始 Error。订阅注册／取消零通知、零写入。

真实 G2 reveal → whole pickup/drop → G1 rest → 字符串冷恢复保留实体身份、装备资源、敌人状态／意图、游标和知识，恢复不抽随机、不补发来源。三条 move 链只消费上条 current，E1 最后一动与生还流血按原规则，E0 下一动拒绝。目录损血／暴露预检为零计划；遭遇／致死纯提案为一计划但零提交／写入／通知。

## 文件与完整性

本轮预期实际 31 路径：6 份修改、25 份新增；没有任务外文件。源码包括 controlled.ts、旧导出清单一行、cold-candidate.test.ts、新 residence-save 与 residence-session 模块及其测试；文档包括原指定四份追加文档、四份 G3 交付文档和五份原输入。最终逐路径清单和摘要在作者审计 JSON／Git diff 中。

最终工作区审计 PASS：全部 31 路径在有效白名单内；五输入大小／SHA-256／Git blob 匹配；四份原文档完整字节前缀保持；735 份任务外基线文件 Git 内容保持；原 controlled 四函数前缀及旧测试精确一行核验通过；34 叶唯一参数源与批准 JSON 一致。运行时递归依赖审计涉及 91 文件，新生产路径无新增 import cycle、环境随机／时间／IO／浏览器依赖。新增相对链接 23 项有效，UTF-8 无 BOM、新文件 LF、无新增行尾空白；普通、空暂存区及基线 diff --check 均 PASS。

编码明确区分：7 份既有保护文件和本次两个旧 mission 文件保留原 checkout CRLF，与 LF Git 对象规范化后内容一致，不声称原字节相同，也不为本轮格式化旧文件；G1/G2 生产原字节保持。逐项原件／源文件／日志摘要与保护路径记录见 verification-results.json。已逐路径 stage 并实核暂存区：仅 31 文件，6 修改／25 新增，所有暂存字节与工作区在既有 EOL 策略下对应，735 份保护 index 对象保持，18 份实测源码指纹一致，cached diff --check PASS。最终提交仍须复核同一源码／保护对象和干净工作区；实际结果在提交后报告，不提前声称完成。

## 未完成与越界检查

本批只交付首次静态中枢和首活动稳定现场的开发期 headless 支持。closed 历史安装、完整返回／截止／死亡、角色接续、稳定战斗、钱包、五图、专长、工具箱、玩家入口、浏览器持久化、跨标签一致性、O3 发布安排及 Owner 试玩仍 OPEN / NOT RUN；不是本批悄然省略的已实现功能。冻结／revision／域句柄不证明离线文件未回滚。

本轮只使用注入同步字符串端口；真实浏览器 IO **NOT RUN（范围排除）**。没有只读助手审查冒充主线实审；WebGPT 准确 SHA 源码／headless 恢复实审仍 PENDING。CI 以 push 后实际远端状态为准，不由本地 check 推断。

无玩法规则冲突；原范围冲突已由 ADDENDUM-01 最小授权解除。未修改 G1/G2 生产代码、批准参数、DEC、AGENTS、依赖、旧医院 Save/Store、UI 或浏览器槽。未执行关机／重启／定时操作，不决定 O3，不启动下一工程。

完成一次普通 commit 和仅本分支 push 后停止，等待当前主线准确 SHA 实审。
