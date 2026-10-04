# ENG-RESIDENCE-TERMINAL-RESTORE-001（B）设计与实施记录

作者工程记录，不是新规则或主线准确 SHA 实审结论。

## 开工实查

- HEAD `bfc6bd973eeb306df1e8ee916b2160c30b757cdf`，父 `6438f7a38939297225538cdd68af24201ed7d34f`，tree `8429346ed7e1e42cf383f68d859c08801c84908e`。
- 入口 A 分支，普通／cached diff 与工作区均为空；远端引用与输入清单一致。新建 `feature/residence-terminal-restore-001`，不在 A 分支交付。
- 五件输入完整读取，SHA256SUMS 四条实算一致。输入解压与原始日志在仓库外临时目录。
- 本轮基线 `npm run test:run`：exit 0，133 files / 2947 tests，53.28s；不是沿用 A 的测试记录。
- 首次 sandbox 内建分支被 index.lock 写权限拒绝，依本任务明确授权通过工具审批重试成功；未改变 Git 或安全配置。内置 apply_patch 新文件写入失败，改用同一 Codex executable 的 apply-patch 入口。

## W1：生产修改前详细设计

1. 新 terminal-index 精确八个值导出；terminal-controlled 仅策略构造。旧 v1 的所有源码、导出、测试与 G4 消费者保持原字节／Git 对象。
2. 受控策略只持有已签发 G1／终局配置、声明全集及各自已签发目录和终局角色映射，不持有 current、余额或签发游戏计划。普通对象外壳先验描述符，避免 getter 或冻结原输入；已签发句柄复用，值数据复制冻结。
3. active-world、living-hub、dead 直接保留 A TerminalSnapshot；fresh-hub 是独立最小分支，包含 catalogRef、真实初始携带与旧仓形状、明确空终局历史及初始余额，不伪造 active 使命。公共角色／G1配置／终局配置严格分开。
4. 先严格检查原数据（plain、exact、无访问器／稀疏／非法数），再调用既有纯核心读取：使命冷候选、G1 身体／时钟、G2 实体／目录、A 完整终局联合校验。B 不调用动作、周期、activate／terminate 或 A 清算来恢复。
5. B 补齐冷态来源实体检查：当前现场与所有 archive 的兑现事实，联合真实携带、旧仓、所有地面和处分；来源稳定 ID／ordinal／定义／数量与目录候选相容，资源保持实际剩余值。未知派生来源和不存在的序号不因进入历史而洗白。
6. 仅活人稳定 active 可以恢复；合法完整 dead 可保存真实 active clock 及被动 archive 中的 combat-required。正常 steps=[] 与实际日结／死亡非空来源分别遵循 A；历史身体不是当前身体副本。
7. envelope 仅 format、formatVersion=2、state。serialize 验证先于 JSON，deserialize 区分 JSON／envelope／版本／配置／状态／unsupported。旧 v1 与新 v2 双向拒绝，不迁移、不修补、不兜底首次创建。
8. expected 接口强制独立完整值；候选与 expected 各自严格验证，再逐委托使用原 restoreMissionCandidate，并比较完整同进度聚合。返回纯冻结候选，不生成安装许可。冷档自洽不承诺离线防回滚。
9. B01—B12 原生测试覆盖真实首次／正式出发／A 四结果、真实两声明链、来源／历史／expected 反例、v1隔离和独立零调用计数。测试工厂只在测试引用，不在生产导出。
10. 全部新增路径限任务28条，四共享文档仅追加；配置值从已签发依赖读取，不复制常量。C、IO、玩家入口、O3、浏览器及 Owner 试玩不执行。

## 后续实施与验证

此节只记录实际运行结果，不预填通过结论。

### W2／W3 实施与自查

- 八个新生产文件、一个测试辅助文件和六个原生测试文件；旧 v1、A、身份核心与 G1—G4 所有生产／测试保持只读。
- 第一轮 104 项通过；第二轮 168 项中 1 项失败，原因是测试夹具把数量 3 的 stack 放入只允许数量 1 的快捷位。改为真实单件快捷位及背包数量 3 的 stack，不修改规则；后续通过。
- 测试曾直接 import node:fs，typecheck 明确拒绝（应用 TS 类型没有 Node globals）。改用现有 Vite raw glob 检查八个生产源码，不加依赖或配置。
- 自查／只读助手的公开接口复现发现日期和 startCycle 联改、期限精力记录与现值联改、最新流血资格不符等漏验。先加回归实际得到 4 fail / 100 pass，再仅改 B 新路径，得到 residence-save 8 files / 242 tests PASS。
- 继续补齐首次执行起点、primary 暴露与既有暴露相加、死亡前抑制值、期限 ready 原生出发 D8 等正反例。最新单文件历史测试 53 项通过。最终所有用例和旧回归重新执行，结果以 verification-results.json 为准。
- 只读助手未写源码或操作 Git；其复现／静态意见不作为本会话测试执行证据。原生失败、修订及复跑日志分别保留于仓库外。
- 新来源校验复用 G2 稳定 ID 构造，其中 createRandomCursor 是纯值构造；独立观测的是实际 draw 四入口均 0，不把 cursor 值构造冒称随机抽样。

### 边界复核

冷恢复不可能区分全部历史同时伪造但内部自洽的离线数据；独立 expected 才比较另有权威的同进度完整值。无 UI、IO、current、安装权限或 C 故障重入测试。没有新规则／参数冲突，不扩展 A 生产语义。
