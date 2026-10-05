# ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001（E01-R）task v1.0

## 0. 任务身份与停止点

目标：在 E01-P 的真实 `SupplyValue` 上实现 **独立、严格、纯恢复的 headless formatVersion=3 聚合与字符串 codec**，包含独立 expected、四稳定态 roundtrip、来源/处分/历史联合拒绝和旧格式隔离。

起始准确 SHA：`8c19ca0d28058cf743b41c8547cc2629c8eac767`  
父基线：`ad56a7d9dfc08e38f966f20cf7e07c71c08c09dc`  
起始 tree：`7de411403ecdde135fe0f0e6fa1ae9d9b9ed7936`  
工程分支：`feature/residence-content-supply-restore-001`

本任务完成后必须普通 commit / push 到该工程分支并停止。不得自动进入 E01-S、E02、E03。

## 1. 开工前必须实查

1. 重新读取实际 `AGENTS.md`。
2. 核对 HEAD 必须是起始 SHA；如不是，停止报告。
3. 核对 main、设计分支和旧工程分支不作为写入目标。
4. 工作区须干净；若有非本任务改动，停止。
5. 完整读取：
   - `docs/05-design-decisions.md` 中 DEC-049—052 当前有效正文；
   - `docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md`；
   - `docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md`；
   - `docs/engineering/residence-foundation/content-supply-core-contract-v1.0.md`；
   - 本包 E01-P 实审报告。
6. 实跑 `npm run test:run`，记录本轮真实基线，不引用历史 3365 代替。

## 2. 精确路径白名单

最多 30 条；不要求全部创建，但不得修改列表外路径：

- `src/state/residence-save/supply-types.ts`
- `src/state/residence-save/supply-schema.ts`
- `src/state/residence-save/supply-policy.ts`
- `src/state/residence-save/supply-validation.ts`
- `src/state/residence-save/supply-history.ts`
- `src/state/residence-save/supply-expected.ts`
- `src/state/residence-save/supply-codec.ts`
- `src/state/residence-save/supply-index.ts`
- `src/state/residence-save/supply-controlled.ts`
- `src/state/residence-save/supply-test-fixtures.ts`
- `src/state/residence-save/supply-validation.test.ts`
- `src/state/residence-save/supply-history.test.ts`
- `src/state/residence-save/supply-expected.test.ts`
- `src/state/residence-save/supply-codec.test.ts`
- `src/state/residence-save/supply-compatibility.test.ts`
- `src/state/residence-save/supply-purity.test.ts`
- `src/state/residence-save/supply-roundtrip.test.ts`
- `docs/engineering/residence-foundation/content-supply-restore/completion.md`
- `docs/engineering/residence-foundation/content-supply-restore/contract-and-support.md`
- `docs/engineering/residence-foundation/content-supply-restore/implementation-notes.md`
- `docs/engineering/residence-foundation/content-supply-restore/verification-results.json`
- `docs/engineering/residence-foundation/content-supply-restore/inputs/ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-task-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-restore/inputs/OWNER-authority-and-scope-E01-R-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-restore/inputs/AUD-8c19ca0-E01-P-review-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-restore/inputs/BASELINE-AND-INPUTS.json`
- `docs/engineering/residence-foundation/content-supply-restore/inputs/SHA256SUMS.txt`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`

若实现发现必须修改列表外生产文件或旧 v1/v2 测试才能完成目标，**停止并报告具体冲突**；不得自行扩大路径或弱化旧断言。

## 3. W1 — v3 envelope、policy 与纯候选

实现独立新入口，技术格式固定为：

- product / format family：`elevator-survival.residence-headless`
- `formatVersion = 3`

具体字段名可在本任务内定稿，但必须满足：

1. v3 envelope 明确绑定并严格验证：
   - rulesVersion；
   - 原 G1 residence configurationId；
   - terminal configurationId；
   - E01 supply configurationId；
   - contentId；
   - character identity；
   - 声明范围/具体委托；
   - 所属 phase 与对应 execution expectation。
2. `SupplyValue` 仍是领域真值；envelope 元数据是格式/独立绑定，不成为第二可编辑 gameplay truth。
3. 反序列化先做严格 JSON/envelope/schema 校验，再调用实际 E01-P 聚合校验；未知字段、未知版本、错误类型、布尔冒充数值、非安全整数、不支持阶段明确拒绝。
4. 编解码不得执行任务、移动、日结、随机、用药、维护、终局、发奖或实例发放。
5. 解码成功只返回冻结的严格候选，不创建 `SupplyAuthority`，不安装 current，不触发存储。
6. 序列化前必须重新严格验证真实 `SupplyValue`；不得把未经验证对象直接 JSON.stringify。

### R-GUARD-01：first-hub 独立 execution expected

这是本任务强制验收项：

E01-P first-hub 的 pending execution 目前存在 initial origins 的 binding 中，unaccepted mission 本身没有 execution。v3 restore **不得从候选 origins 自己读取 execution 后再作为 expected 自证**。

对 first-hub，受控 policy / expected 必须由候选外部独立提供 runId/seed/rulesVersion 或等价受控 execution 事实，并与全部 initial origin binding 联合核对。

对 active-world / living-hub / dead，同样继续要求独立 mission/execution/phase expectation；不得从候选生成 expected。

## 4. W2 — 严格历史、来源与四稳定态恢复

v3 支持且只支持：

- `first-hub`
- 稳定 `active-world`（`pending.kind === none`）
- `living-hub`
- `dead`

活 pending combat 继续明确拒绝；不为通过 codec 清 pending。

必须直接复用/调用 E01-P 的真实不变量，而不是复制一份更松的来源逻辑：

- origin / allocation / lineage / unitTransfers；
- production；
- disposition；
- choices / firstBandageUsed；
- carried / ground / warehouse / archive；
- ItemState；
- mission lifecycle；
- receipt / balance；
- 真实样本、安装、已消费历史；
- 两声明 TEST 历史。

要求：
1. 已消费、已安装、已交样、地面留置与历史 archive roundtrip 后保持精确语义。
2. 旧成功、失败、死亡历史不能因新候选重写。
3. 冷恢复不重抽随机，不重新用药、维修、安装、关闭或结算。
4. 不能用“全部重新发一份初始物资”修复坏档。
5. 完全伪造但内部自洽的离线历史、防用户手工回档不属于本接口保证；但候选与独立 expected 的已知矛盾必须拒绝。

## 5. W3 — 旧格式隔离与零规则重放

必须新增原生正反例：

### 5.1 双向格式拒绝

- v3 reader 拒绝旧 v1。
- v3 reader 拒绝旧 v2。
- 旧 v1 reader 拒绝 v3。
- 旧 v2 reader 拒绝 v3。

旧 `codec.ts`、`terminal-*` v1/v2 reader、旧测试 **只读，不修改**。

### 5.2 四态 roundtrip

每态至少：
- encode → decode → 等值领域候选；
- decode → encode 字节稳定；
- 可变输入不被修改；
- 冻结返回；
- 错 configuration/content/identity/execution/phase expected 拒绝。

### 5.3 来源/历史篡改

至少覆盖：
- 缺 origin / 多 origin；
- allocation 区间重叠、缺失、跨来源替代；
- split/merge lineage 或 transfer 重放；
- disposed 单位重新成为 live；
- task item 错 execution / ordinal / substitute；
- production 缺失、重复、关闭后 production；
- `firstBandageUsed` 与真实 medical history 矛盾；
- 安装 recipe 历史矛盾；
- delivered sample 与 success receipt 矛盾；
- wallet / receipt / archive / mission closure 顺序矛盾；
- 旧成功被后来死亡改写；
- 非法数字、额外字段、未知 tag。

### 5.4 零玩法调用

对 v3 encode/decode/restore candidate 独立 spy，验证以下类别均为 0：
- G1 action / cycle；
- G2 move/source/transfer/rest；
- E01 task/source/medical/maintenance/inventory producer；
- RNG draw；
- mission activate/terminate；
- A terminal settlement；
- storage read/write；
- notification。

纯验证 helper 的调用不冒充玩法重放。

## 6. W4 — 接口、兼容、文档与验证

建议使用独立命名：
- `supply-index.ts`：普通只读 codec/types 入口；
- `supply-controlled.ts`：受控 policy / candidate restore 入口。

不得把新 v3 自动挂入旧 `src/state/residence-save/index.ts` 或旧 terminal index；E01-S 届时显式选择。

普通入口不得导出安装 current、任意 replace、Storage adapter 或 gameplay authority。

完成以下：
1. 新模块定向测试；
2. E01-P 原 91 项及关键旧 B/C 回归；
3. 全量 `npm run check`；
4. `git diff --check`（普通、cached、基线到最终）；
5. 精确白名单检查；
6. 本包 5 份输入归档字节核对；
7. 新旧格式双向拒绝；
8. 无新依赖、无 CI/阈值修改；
9. 完成报告和 verification JSON。

## 7. 范围外

- 不修改 E01-P 玩法规则、内容或数值。
- 不做 E01-S current/session/storage。
- 不做浏览器 IO、多标签。
- 不实现 active-combat 存档。
- 不实现 E02/E03。
- 不接 React/UI。
- 不决定 O3。
- 不增加第二真实委托、商城、身体服务、未来专长改选。
- 不引入新依赖、通用事件总线或通用任务 SDK。
- 不合并、不推 main、不强推。

## 8. Git 权限

授权：
- 新建 `feature/residence-content-supply-restore-001`；
- 仅在该分支普通 commit / push。

不授权：
- merge；
- main；
- 设计分支写入；
- 旧工程分支写入；
- force push。

## 9. 最终报告

必须报告：

- 起始/父/最终完整 SHA 与 tree；
- 分支与 commit message；
- 修改文件和白名单核对；
- 真实起始测试基线；
- 新增/替换/删除/净增测试；
- R01—R12（或等价十二组）验收映射；
- 四态 roundtrip 结果；
- first-hub 独立 execution expected 证据；
- v1/v2/v3 双向拒绝结果；
- 零规则重放调用计数；
- 最终 `npm run check`；
- GitHub CI（若能核验；不能则写 UNCONFIRMED）；
- 浏览器/Storage/Owner试玩均按实际写 NOT RUN；
- 未完成项、冲突及停止点。

完成后停止，等待 WebGPT 主线准确 SHA 的 **v3恢复接缝实审**。不得自动进入 E01-S。
