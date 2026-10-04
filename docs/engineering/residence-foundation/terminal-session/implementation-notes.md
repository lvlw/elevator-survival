# C：显式 v2 唯一会话实现记录

## W1 开工与详细设计（实现前记录）

- 起点：`b9b1e0fee0e779669ca40e088ac9a867016bff82`，父 `bfc6bd973eeb306df1e8ee916b2160c30b757cdf`；工作区和暂存区为空。
- 新分支：`feature/residence-terminal-session-001`。五份输入完整读取；四项 SHA-256 匹配。远端 11 个参照分支与任务清单一致。
- 本轮实际基线：`npm run test:run`，139 files / 3135 tests，退出 0。日志在仓库外 `C:/Users/zjl/AppData/Local/Temp/residence-terminal-c-audit/baseline.log`，不是引用 B 历史测试数。
- 权威：DEC-049/050/051、批准的 34+4 参数、runtime restore 补充、A/B 合同及三批门槛。C 不是五图、玩家入口、浏览器保存或 O3 发布决定。

### 所有权与依赖方向

1. `domain.ts` 只保存 issued/claimed WeakSet；v1/v2 共用，零 gameplay current。旧 `session.ts` 只移走注册表及对应检查，不改变业务、保存或死亡拒绝。
2. 新 controlled 入口只有 factory 与原 domain issuer；普通入口只有错误类与严格 command constructor。九类意图不接收结果、权限、状态或支持开关。
3. v2 捕获 B policy 与同步端口。无 current 才能冷读取；实际 null 才允许首次 factory。read-error/blocked 可显式 retryRead；已有 current 永不重装。
4. context 从当前完整值及 B policy 建立 G2/A authority。钱包、仓库、关闭记录、处分和归档只从 current 向后传递。
5. launch 先校验身份、首次阶段、catalog、revision、全奖容量，再取执行材料一次，委托首身份/G1/G2，不补夜。真实 fresh 钱包固定初始值；容量拒绝使用实际窄 guard 与非法输入测试分层证明，不伪造合法高余额 fresh。
6. 活动操作只调用真实 G2 并核验原签发 plan。生还 pending combat 不提交；死亡把原 plan 交 A 一次，不编码 HP0 active、不重跑 G1/G2、不额外加 revision。终局意图委托 A 的资格与周期。
7. 完整后态先 B 校验/预编码，再唯一 current 一次替换、一写尝试、一批只读通知。写失败保内存；retrySave 只编码最新 current 并写，不通知/重演。
8. BUSY 包围 read、factory、provider、规则、编码、写与通知。查询/退订允许，订阅异常隔离。普通命令不能安装候选或预制 plan。

### 测试与交付安排

新增八个测试文件及 test-only fixture。真实 read-null→create→launch→活动链→失败返回/死亡；成功和两声明历史使用标明来源的 A/B 受控测试内容，不宣称 C 能建立第二玩家委托。三类故障分别观察真实规则调用、current 引用替换、read/write/通知，不以返回标签替代证据。

定向运行旧 A/B、身份 103/冷候选 23、G1/G2/G3/G4；最终 check、diff、范围、旧对象、原输入及四文档完整前缀核验后普通提交，仅推 C 分支。浏览器、Owner 体验为 NOT RUN。

## W2—W4 实际执行、自查与修订

### 失败没有被隐藏

1. 首次 terminal-session 定向运行：25 PASS／1 FAIL。测试设 suppression15 却保留 suppressant quota1，正式 B 拒绝矛盾身体；测试调整为合法已使用抑制剂的 quota0，未改规则。首次输出仅在工具记录，未另存日志。
2. endings-01：23 PASS／3 FAIL。三个负例测试把完整 terminal aggregate 直接传给 exact G2 location，G2 正确拒绝额外字段；测试改用正式 locationOf，不放宽边界。
3. owner-boundary-01：36 PASS／2 FAIL。新 controlled 最初导出底层 issuer，与原公开 wrapper 并非同一个函数对象；修成直接重导出原 createResidenceSessionDomain，保证共用原发行入口，不改旧 controlled。
4. 中间 typecheck 一次失败：mock 参数是 unknown，测试改用 toMatchObject，不以不安全断言访问 kind。该次仅工具输出；最终 typecheck PASS。
5. 仓库外静态审计辅助初始化两次失败：Windows ESM 路径格式、TypeScript7 不含旧 JS parser API。改用 Node 内建文件/Git读取及相对值导入静态扫描；未安装依赖，未改工程工具或 npm scripts。audit-01/02 无 JSON 输出，不能视为有效审计证据。

### 自查补强

追加四项独立回归：v1/v1 与 v2/v2 同域重复拒绝、首次 factory 原始可变对象不被冻改、真实首次入口待战斗不半安装。交叉 domain、被复制签发计划、字段注入、未知 revision、sync 端口/Promise 违约、current 已存在不能重建、重入异常后可再次合法操作均有对应测试。

原生首次链真实 factory/identity/G1/G2 运行，不把手写 active 覆盖所有入口。成功的真实任务件及两声明历史由既有 A/B 隔离内容测试生产者形成；不注册五图内容，也不让普通命令持有后态。容量差1用正式查询、实际窄 guard 和坏 fresh 三层验证，未伪造当前不可能合法的高余额 fresh。

同步只读诊断允许暴露内部状态给工程调用者，但不称其为 player-safe；两个普通 query 对不同隐藏身份/seed、精确敌人 HP 和感染进度保持一致。未新增 browser adapter、release/reset 或事务重试队列。

### 实际检查

- 基线：139 files／3135 tests，实际 01:51:08 执行，退出0。
- 初轮两文件49项 PASS；终局/故障/历史三文件48项 PASS。
- 全要求组合初轮41 files／1095 tests PASS；四项补强后41 files／1099 tests PASS。
- 最终 npm run check：architecture 51 DEC／257 core production files、typecheck、147 files／3274 tests、build 全 PASS，退出0。JS chunk 896.85 kB 的既有500kB提示仍在，不调阈值；未做依赖安全审计。
- 源码新增139项、替换0、删除0、净增139，新增测试文件8；旧测试没有改 expected 或 skip。
- 全888个基线跟踪对象按 Git clean-filter blob 核对，仅允许的 session.ts 与四份追加文档变化，其余883不变；40项输入基线对象核对通过。四份文档不仅规范化前缀相同，实际文件的完整原始 Git base 字节前缀也相同。
- 五输入与解压原件逐字节一致；四项 SHA256SUMS 和三项 bytes/blob 限定全部匹配。全部新增相对文档链接检查通过。
- 最终源文件指纹在全量测试后记录；后续仅工作报告补证，提交前再对 staged blobs、提交后 tree 逐项比对。工作报告不自引用最终提交。
- tracked/cached/base diff-check 通过；27个新增文件逐一 no-index 空白检查无错误。暂存及提交后核验作为独立 Git gate，真实结果随交付消息记录。
- 值导入静态图未发现从新增生产文件可达的循环；架构、类型和模块运行测试通过。生产扫描无 Math.random／系统时间／UUID、浏览器存储、旧 v1 codec、测试 helper 或 content 导入。

### 权限与未运行

32条实际修改在33条精确白名单内，可选 terminal-owner.ts 未创建；不修改 A/B、身份、G1/G2、34+4参数、存档定义、依赖或旧测试。四态数据版本仍由 B 唯一拥有，C 不迁移旧格式，不重放 current 的已发生规则。

浏览器、刷新／多标签、Owner 分段突破／恢复负担体验：NOT RUN；无玩家入口，本批不以 headless 测试替代这些 Gate。远端 CI 以实际查询为准，不将本地 check 写成远端 PASS。未发现白名单内未完成项或需要更改正式规则的冲突；后续五图、战斗医疗、真实第二任务及发布仍不在范围。

提交仅一个普通 C 工程提交，正常推送同名分支；最终 SHA／parent／tree 和11远端参照在提交后确认，不改报告以追逐自身 SHA，不 amend，不执行关机／重启／定时。交付后立即停止等待主线实审。
