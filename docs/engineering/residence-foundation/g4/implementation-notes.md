# G4 首次出发与驻留事务实现记录

## 开工与权威

- 起点 `60e9c30732c5e22cfe9ff58b9b381de64b945180`，tree `cd5ced1ff8be1ee7def4df2ac43e66f1a93a1`；原 G3 分支干净，普通及 cached diff 为空。
- 新建交付分支 `feature/residence-actions-core-001`，不改 G3 分支、main 或设计分支。
- 五件输入解压到仓库外，四个给定 SHA-256 全部相符；按原字节归档到 [inputs](inputs/ENG-RESIDENCE-ACTIONS-001-task-v1.0.md)。
- 修改前实跑 `npm run test:run`：121 files / 2681 tests，exit 0，13:13:06 开始，69.05s。仓库外日志 `residence-actions-g4-audit/baseline.log`，不是沿用历史数量。
- 重新核对 AGENTS、DEC-049/050、O1/O2、G1/G2/G3 合同与实际接口；旧医院规则不混入新 headless 版本。G3 实审是给定输入，不冒充本批实审。

## 写生产代码前的设计

1. `ResidenceSessionCommand` 为 launch / move / reveal / pickup / drop / rest 严格联合，保留 `ResidenceMoveCommand`。四类位置命令复用 G2 constructor；launch/rest 用既有身份、绑定和整数 schema。不接费用、结果、支持标志或状态。
2. composition 新增可选 `provideFirstExecution: () => unknown`。只提供 RunIdentity 材料，无 current 安装权；缺省仍可旧 G3 bootstrap/move，但 launch 不可用。捕获函数引用，在 busy 下、全部前置资格／绑定／revision 算术校验后调用一次。复用正式 `readExecution` 严格校验，不用宽松归一化。
3. launch 从 canonical fresh-hub 的 catalogRef 取得目录，仅选该目录绑定的未接委托。正式 activateMission、G1 depart、G2 establish 组成完整提案；departure authority 用原 unaccepted，建现场 authority 用新 active。首次不结夜、不恢复身体、不重置资源；入口遭遇等不支持结果拒绝整份提案。
4. active 操作调用正式 G2 move/reveal/transfer/rest。rest 从当前节点取得 A/C，不允许命令选择。每份计划验签、核对完整旧态；身份／site.binding／revision+1 保持。非 rest 保持完整 clock/cycle；rest 精确核对 cycle/taskDay+1 及其他 clock 字段、整个 site/carried/itemStates 不变。
5. 共同经过原 aggregate 校验和预编码，再走唯一 commit：一次 current 替换、write 尝试、通知分发。save failure 保留新内存，retrySave 只编码最新 current，零规则重跑。读、factory、provider、write、notify 都受原 busy 保护。
6. 到达事件、pending/combat/death、闭合历史／完整终局仍不支持；不安装部分结果，不删除后果。该限制是开发 headless 支持范围，不是玩家避死规则。

## 验证计划与职责

真实 read-null → createFirst → launch 为主链起点，后续只用 owner current。覆盖固定／随机来源、整实例资源身份、E0 免费转移、A/C 周期、冷恢复继续、严格输入、保存故障及重入。

两条独立故障链分别计数 provider、任务激活、现场建立、G1/G2 计划、draw、内存替换、read/write/notification。内存替换由 write hook 观察 current 引用，不以通知次数代替。

G3 旧 unsupported-kind 表中五个已扩展 kind 改为有效结构的阶段／资格回归；保留 view/close/combat/medical 及所有恢复／身份保证。新增、替换、净增分别报告。

主会话为唯一写者及 Git 操作者。两个只读 helper 核对首次出发和操作故障接缝；意见不等于主线准确 SHA 实审。最终等待 WebGPT 主线复审；Owner 体验、O3 均 OPEN / NOT RUN。

## 实际自查与修订

- 两名 helper 均未发现生产接线缺陷；共同指出 launch 十类拒绝表未锁定错误码。已补 NOT_AVAILABLE、STALE_COMMAND、BINDING_MISMATCH、INVALID_INPUT、SAFE_INTEGER_OVERFLOW 的精确断言。
- 补 drop 独立冷恢复后继续真实 pickup，以及三项首次核心提案均成功、最后 aggregate 因来源身份冲突拒绝的零提交反例。
- 补“已有兼容堆时不隐式合并”及带受伤敌人／非零风险游标的实际 session rest；专项 cold 夹具不替代真实首次长链。
- 首次完整定向回归实际为 20 files / 638 tests：637 PASS、1 FAIL（exit 1）。失败在新增无自动合并测试错误假设 backpack 数组维持插入顺序；正式 constructor 按 instance ID 排序。核对实际排序后改为恰2个实例及各自精确实例、数量、placement 断言，不改生产行为。失败原始 log/json 单独保存在仓库外 `targeted-iteration-4-failed.*`，后续复跑另记。
- 早期文件定位误用了不存在的目录/单数文件名及 PowerShell glob，属只读定位命令失败，未导致文件修改。直接 apply_patch 首次因父目录权限失败，随后使用获准的 apply_patch runner；未以其他写法绕过规则。三轮局部测试（96、146、163项）及四次 typecheck 均 PASS。
- 修订后定向20文件／638项 PASS（13.61s、exit0）；完整 check PASS，124文件／2791项，测试69.03s，architecture为50 DEC／246 core production files。最终实现指纹为 `cf532e50115a853e80afea03934a182950222ef88c6642a0ad9e4aaaa3c48734`（14份允许范围源码／测试，含2份未改文件），暂存后与提交后继续核对。
- 主会话反查：已活动 site 只由 G2 局部计划推进，只有首次 launch 能建立现场；来源 claim 从未作库存；rest 未删除 clock 连续性；write失败不重跑规则；真实首次链未借 active 存档；未支持死亡提案没有被清掉后果后保存；通知者及查询无安装权。
