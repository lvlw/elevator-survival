# ENG-RESIDENCE-TERMINAL-001 A：设计与实施记录

作者工程记录，不是 DEC、主线源码 PASS 或玩家体验结论。

## 开工实测

- HEAD `6438f7a38939297225538cdd68af24201ed7d34f`，父 `c67fd4117065e2e0dbd1117cae4fbfaa83791599`，tree `2afeb4504960b23585f5eb9b718473e2b3e4d161`。
- 入口分支 `feature/design-world-entry-003`，工作区及暂存区干净；准确基线新建 `feature/residence-terminal-core-001`。远端参考分支一致。
- 五件输入完整读取；SHA256SUMS 四条实算一致，原件不改字节。
- 实际 `npm run test:run` exit 0：124 files / 2791 tests，63.10s。日志在仓库外 `C:/Users/zjl/AppData/Local/Temp/residence-terminal-a-audit/baseline.log`。

## W1：生产前设计

1. 普通 index 只导出只读资格／金额查询、错误和类型。controlled 单独提供严格依赖／独立权威构造、正常返回／期限组成、G2 死亡消费及完整计划新鲜度核验；没有安装、写盘、任意 outcome 或 setCurrent。
2. 终局配置是独立依赖，仅 content config.ts 产生批准四值。G1配置身份／34值及规则版本不变。
3. 完整值只有一份 character、任务全集、balance、当前 site／carried／ItemState；另有旧仓、已关闭 site 历史、不可用实物处分与被动收据。实例全域唯一，历史站点不带第二份身体。死亡保留真实身体、位置和 pending，不伪造 active 使命或 CycleClosure death。
4. 受控策略绑定声明与 G2 catalog；H0／两个目标是内容角色映射；样本按来源／ordinal／定义及真实资源校验。任务专件和当地权限显式分类。测试受控夹具提供尚未实现的任务生产事实，不把任务件标 ordinary 绕过G2。
5. 技术 authority 索引只绑定完整前态指纹和受控依赖／G2权威，无可变 current 或奖励账。同revision改钱包／身体／历史仍拒绝。创建权属于未来可信composition，不证明离线历史从未被丢弃。
6. 正常返回／期限先完整验证原态、请求、资格及安全算术，私下调用一次G1；原结果形状、步骤、非自有字段通过后才关闭和处分。正常返回steps=[]，日结真实有序，死亡按HP0短路，不重算公式。
7. G2死亡先用原对象assertResidenceLocationPlanCurrent验签发和完整base，再验原HP0后态；不重跑动作／周期／随机，不增加第二次revision。最终dead另作联合校验。
8. T01—T12覆盖正常四例、期限三阶段死亡、真实移动／揭示／A/C休整死亡、数值／来源／篡改、两声明历史、独立调用计数。B/C、浏览器、五图与Owner试玩不在本批。

## 工具记录

内置apply_patch无法写入新文件；命令入口的bat转发丢失多行参数。改为同一Codex apply-patch可执行入口直接传递补丁后成功；未改权限、安全设置或Git配置。此前没有生产修改。

## 实施与修订

下文仅记录后续实际结果，不预填验证成功。

### 实际实现与反查修订

- W2/W3 完成普通只读查询、独立 authority、完整 TerminalPlan、正常／期限 G1 组成、真实原 G2 死亡消费、单一四值 content 依赖。
- 首轮 22 项正常／期限测试通过，扩展至完整新模块 156 项。未修改旧测试 expected；所有新回归独立在本白名单新增文件内。
- 自查修复：E1/cost8 后 E0 是 G1 正式截零，不能当作费用超余额拒绝；补实际移动／随机揭示死亡。未修改 G1/G2 参数或实现。
- G2 休整返回的对象字段顺序与 A schema 不同，原 JSON 字符串相等误拒绝；改为对象键序无关的纯结构相等，不用 JSON round-trip 规范化。真实 A/C 死亡复跑通过。
- 补齐历史 disposition 分类、目标／正确样本、最新 body/trace、周期、HP链和有序短路；移除收据派生 after，当前 balance 唯一。
- 将 source=prior-effect 与 source=terminal 区分，支持同执行样本已经另交但仍可合法失败返回，不重写或伪引用旧交付。两声明测试从实际 A 输出经真实 G1 出发、使命激活和 G2 现场／死亡继续；未手工伪造 closed。
- 消费前独立 stable/pending/rest 资格与原签发分别验证；本期 G2 可致死动作限定为真实付费移动／揭示，免费 G1 能力不被本模块修改。
- 严格依赖外壳先检查普通 data 属性／连续数组，再读 handle，防 getter 和未知字段冻结调用者；结果消费不冻结可变原提案。
- 期限在生产者前预检 G1 相同运算数的安全整数容量；正常 H0 不执行日结预检或补夜。没有新增身体结果计算器。
- 故障注入明确区分：未签发 clone 拒绝组；测试内验证真实原计划后注入损坏的 post-proof 语义组；私下 G1 生产者故障组。正例全部使用真实规则，坏结果的计数如实记录生产者已调用1。

### 执行中失败及修正

1. 初次类型检查发现测试中 node:fs 类型不在 app TS 环境，改用仓库现有 JSON oracle 导入模式；测试 helper 的深层 readonly 改为递归可变测试类型，不引入依赖或生产断言绕过。
2. 两个 A/C 休整死亡测试发现上述键序问题，修正后通过。
3. 实物测试假设处分类别按插入序排列，实际正式背包规范化按实例排序；改为检查本次处分集合并单独严格比较旧历史前缀，不改变生产行为。
4. post-proof 错序反例最初在错误的 rest 分支被拒绝，现先核准首步骤来源，再作相应验证，错误层与计数已锁定。
5. 新请求负测的 readonly TS 赋值错误使用已有测试 mutable helper 修正；最终 typecheck 通过。
6. 初次保护审计把9个既有 CRLF 检出文件与 LF Git blob 作原字节比较而误报；只读诊断证明仅行尾差异、Git clean-filter 对象和普通 diff 与基线一致。未改这9个文件、Git autocrlf 或任何保护策略；共享追加文档和输入原件仍按原始字节核验。

### 真实验证

- 起始 124 files / 2791 tests，63.10s。
- 最终定向 27 files / 772 tests，9.70s，exit0；包含原身份103、cold23以及原 G1/G2/G3/G4 回归。
- 最终全 check：51 DEC／257 core production files；typecheck PASS；133 files／2947 tests PASS（48.31s）；build PASS。
- 新增9个测试文件／156项；替换0、删除0、净增156。新核心非测试文件11个（含既有架构统计口径的 test-fixtures），原246→257。
- build 保留 Vite 大于500kB chunk 提示；未调整阈值或打包配置。
- 全量原日志在仓库外 `C:/Users/zjl/AppData/Local/Temp/residence-terminal-a-audit/`，只归档核查摘要。最终保护、输入、链接、范围与 source fingerprint 见 verification-results.json。
- B/C、实际存储、浏览器、Owner试玩、CI／主线实审并非这些本地测试，分别标记 NOT RUN／待提交后查询／待审。
