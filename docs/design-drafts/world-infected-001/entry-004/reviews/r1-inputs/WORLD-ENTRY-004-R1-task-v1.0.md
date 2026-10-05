# WORLD-ENTRY-004-R1：任务来源与严格模型边界限定返修

任务书v1.0；2026-10-05。**由WebGPT主线按Owner已有下发权限直接安排，完整读取后执行，无需逐步骤申请授权。**

## 0. 一次交付与停止点

保留WORLD-ENTRY-004的现有五图／战斗医疗／九组合方向，一次完成F01任务来源与执行联合校验、F02逐意图／原字段／语义拒绝边界、相邻自查、原套件及新增回归、四负控、冻结双跑、原生观察、文档同步、普通commit/push和完成报告。

本批仍为设计文档与隔离验证。D01—D04未采纳，不做正式归档，不改生产，不执行E01—E03。不要重做整世界，不以增加通用SDK、事件总线或完整CTB引擎解决模型问题。

## 1. 附件、起点与权限

Owner直接把本ZIP附在当前Codex设计会话。由你定位附件、在仓库外临时目录解压，完整读取任务、权限、审查报告、BASELINE、evidence与source、SHA256SUMS。无需Owner先解压、填绝对路径或手动复制到仓库。

```text
repository = lvlw/elevator-survival
base_sha = 0362460b259cba6ea160e79ad04a6cb14181cef0
base_parent = 0921df3f219f368479d1bf3401d8fecddc0d5f71
base_tree = a69fbf20abac1b7ed4b041298f4fc3746a7828a7
protected_src_tree = 98c840dd0b6b1a6cc014df4ac9165bc94bf2c794
branch = feature/design-world-entry-004
```

继续原设计会话和分支，不新建分支/worktree。重新核对repo root、origin、HEAD/parent/tree、branch、status、普通/cached diff及远端引用；未知变化停止相关写入，不reset、丢弃或覆盖他人内容。主线只读远端，不声称检查过用户磁盘。

本任务明确允许白名单内修改、原字节归档、在本分支普通commit及push到origin同名分支。不得推main或其他分支，不merge/force/rebase/amend改交付历史，不绕过hooks/检查，不改变SSL、代理、凭据或依赖配置。网络问题保留成果和真实退出码。

运行环境安排按Owner当前独立指令处理，不从历史关机记录推导本任务操作，也不以本任务默认未安排关机来否决Owner另外明确的运行后指令。

## 2. 必读依据与证据身份

先读实际AGENTS及要求的正式规则、相关content；定位DEC-049/050/051和原任务§3/§6.2，不将旧医院规则或候选当新正式规则。全文读本批00—07、candidate数据、check.py、fixtures、README和本审查报告。

来源任务合同要求：任务件由真实生产、绑定当前具体执行；领取事实与来源／单位一致。医疗及其他意图必须先验类型、数值、具体目标和字段，再产后态。有限模型仍需正确表达已承诺的这些子集，但不能冒充生产安全、完整存档或CTB验收。

本包31项是主线用原样模型＋源数据子集的定点结果，不是作者98/原生24复跑。**改模型前先在实际完整仓库数据上执行本包原probe.py**，记录原14处不符及合法对照。不要改变输入原件；发现子集与完整数据产生差异须先具体核对，给证据，不自称已复现。

原样模型blob应为4d3c0e443dd02232ca1cc8c7fbac25588ca06bd7。程序修复后的blob必然变化；probe报告中的matchesReviewBaseModelBlob是身份标注，不是用例通过条件。

## 3. F01：来源、任务执行和消费／完成事实

最小必修反例：foreign-execution-component-install、foreign-execution-module-install、missing-source-claim-install、missing-sample-source-claim-return。

- 现有真实模型提取所得组件／模块，execution改为其他执行时，不得用于当前安装。错误身份必须在消费材料、产生transfer或终局前拒绝。
- 已有来源单位却无相应claimed事实，不能当合法当前事实继续安装／交样。来源声明、原始份额、活单位和处分份额应联合一致，不只是总集合数量相等。
- 不删除B式来源守恒方向，不把单位丢失、重复或错来源“修复”为新库存，不从同名物、重新编号或重建来源绕过。
- 限制本次任务件，不扩大成“所有普通历史物资都必须属于本执行”；保留合法普通携出与历史语义。原有限模型不支持的跨委托总体恢复仍明确未支持，不增设全局防作弊承诺。
- 检查相邻样本、组件、模块、任务搬运、安装、已处分／已交付与重复请求。允许在现有模型表示内补足最小校验／证据，避免全面重构为事件溯源系统。

必须保留并实跑：真实组件/module生产→本地拾放／安装正例；不够材料、地面任务件、重复安装、E0安装拒绝；真正携本次样本的成功、地面／错执行／已交样不成功；消费、拆合、安装处分后总份额一致。

## 4. F02：逐意图输入、原始数值与语义错误

必修反例：四种非法medical quantity、False revision、夹带outcome的medical、treated=-1、缺op、未知source/task ID。详见固定probe结果。

- 在查字典、拷贝后覆盖或产生效果之前，严格检查输入为支持的对象、op以及各动作允许／必需字段。不能只用跨所有op的字段并集。
- 数字在原值时检查安全范围与类型，布尔不能借Python相等关系冒充revision0/1。quantity无论被使用或多余都不能忽略非法值；固定单单位用药可明确拒绝quantity，或严格限定其允许值，不新增批量药效。
- 伤口等已建模子结构的标志位与目标类型须严格，非法treated不能通过真值判断或治疗覆盖洗合法。相邻目标不存在／缺字段等应有明确拒绝。
- source、task、物品、目标等选择器不存在时给语义Reject，不让KeyError等程序异常冒充业务拒绝。保留真正未知异常的modelError/不符分类，禁止catch-all转PASS。
- combat外部条件、return选择与普通玩家意图边界分别表达：保留原条件战斗见证，但不因combat需要damage/outcome而给medical等操作也开放这些字段。
- 整理相邻phase、D/T、pending、额度和原始标志的有限支持边界；不要把本模型升格为生产schema，不为未支持阶段猜默认值。

必须保留E0合法免费自救、无目标不消费、HP0拒绝、受伤／伤口选择、生存首绷只一次、真实消费、付费维护、最后超余额、正常H0空身体步骤、真实日结／死亡短路和原四条条件路线。不能“一律拒绝治疗/任务/死亡”过检查。

## 5. 复现、回归、负控与冻结

在仓库外保留日志和输出。模型修改前、修改后各运行一次原probe；主线原件保持字节不变。必要表示变更导致旧准备态不再合法时，先保留原复现，再提供独立适配及同语义回归，逐项说明，不修改expected隐藏问题，也不要求Owner逐字段决定。

原98项按ID保留覆盖和证据身份，新增回归另计；状态表示适配不算新增玩法测试。不得删除、skip或仅改预期放过原失败。外部CTB条件仍标为条件，不凑“全部战斗通过”。原生24项复跑和有限套件分开统计。

```sh
python <附件解压目录>/evidence/probe.py --repo-root . --out <仓库外>/before-probe.json
# 修复后再次执行同一原件，输出after-probe.json。
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --out <OUT1>/results.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --out <OUT2>/results.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control source-duplication --out <OUT1>/negative-source.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control terminal-reopen --out <OUT1>/negative-terminal.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control double-body-cycle --out <OUT1>/negative-cycle.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control hidden-data-leak --out <OUT1>/negative-visible.json
node docs/design-drafts/world-infected-001/entry-004/validation/native-api-probes.mjs --repo-root . --out <OUT1>/native-api-results.json
npm run validate:architecture
git diff --check
git diff --cached --check
git diff 0362460b259cba6ea160e79ad04a6cb14181cef0 --check
```

四原负控保留且实际命中语义错误，不靠启动失败／崩溃。再为本轮任务execution遗漏及意图原值遗漏各增加一个可独立启用的模型语义负控，至少命中新回归，记录变异点、具体ID和非零退出；可扩现有negative-control名字，不能改生产。

所有正文／候选／脚本／夹具最后修订后再冻结并独立双跑，结果原字节一致；不将results、checks、completion或freeze自身纳入自引用冻结。保留0362460的历史证据身份和本次复现前后记录，旧输入原件、C审查与旧设计175/213等不改。当前结果文件可更新为明确R1，旧结果仍以不可改的0362460提交定位，不倒改历史成绩。

本任务不要求npm全生产测试或build替代设计验证；未执行标NOT RUN，新增生产测试0。原生探针和架构是本轮实跑，不能沿用历史记录。工具加载失败应单列，不能伪称原生已执行或修改package解决。

## 6. 文档同步与原件

更新00/02/03/05/06及README、checks、completion所需段落，说明模型表示／校验修复和新增反例；其他当前候选文件只作相关一致性修订，不重新调参。D01—D04维持待采纳，E01—E03维持候选，不创建DEC编号或确定载荷。

原entry-004/inputs五件保持原字节。本包十四件按BASELINE.archive_mapping归档到reviews/r1-inputs，目录结构不扁平化、文件不重写；SHA清单不自包含。四份共享旧文只追加R1状态，保留完整0362460字节前缀。原98、原生24、38配置和各历史身份不累加成新通过。

## 7. 精确白名单（最多38条）

目录名不是递归授权。当前20件可在本批内相关修订，共享4件仅追加；本包14件仅原字节归档。范围外全部只读。无需为了凑满38件修改无关文档。

```text
docs/design-drafts/world-infected-001/entry-004/00-owner-review.md
docs/design-drafts/world-infected-001/entry-004/01-current-production-and-gaps.md
docs/design-drafts/world-infected-001/entry-004/02-world-content-and-mission-contract.md
docs/design-drafts/world-infected-001/entry-004/03-combat-medical-contract.md
docs/design-drafts/world-infected-001/entry-004/04-specialties-tools-and-loadout.md
docs/design-drafts/world-infected-001/entry-004/05-source-and-adoption-map.md
docs/design-drafts/world-infected-001/entry-004/06-next-engineering-contracts.md
docs/design-drafts/world-infected-001/entry-004/07-playable-and-release-gates.md
docs/design-drafts/world-infected-001/entry-004/content-candidate.json
docs/design-drafts/world-infected-001/entry-004/parameter-candidate.json
docs/design-drafts/world-infected-001/entry-004/validation/check.py
docs/design-drafts/world-infected-001/entry-004/validation/fixtures.json
docs/design-drafts/world-infected-001/entry-004/validation/results.json
docs/design-drafts/world-infected-001/entry-004/validation/negative-controls.json
docs/design-drafts/world-infected-001/entry-004/validation/native-api-probes.mjs
docs/design-drafts/world-infected-001/entry-004/validation/native-api-results.json
docs/design-drafts/world-infected-001/entry-004/validation/freeze-manifest.json
docs/design-drafts/world-infected-001/entry-004/validation/README.md
docs/design-drafts/world-infected-001/entry-004/completion.md
docs/design-drafts/world-infected-001/entry-004/checks.json
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/design-drafts/world-infected-001/readiness/01-current-baseline-and-adoption.md
docs/design-drafts/world-infected-001/readiness/04-evidence-and-playtest-gates.md
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/WORLD-ENTRY-004-R1-task-v1.0.md
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/OWNER-authority-and-scope-WORLD-ENTRY-004-R1-v1.0.md
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/AUD-0362460-WORLD-ENTRY-004-review-v1.0.md
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/BASELINE-AND-SCOPE.json
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/SHA256SUMS.txt
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/evidence/probe.py
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/evidence/probe-results.json
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/evidence/dependency-slice.json
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/evidence/README.md
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/evidence/input-audit.json
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/evidence/probe-run.txt
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/source/check.py
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/source/infected-residence-core-test-config-v0.1.json
docs/design-drafts/world-infected-001/entry-004/reviews/r1-inputs/source/infected-terminal-core-test-config-v0.1.json
```

src、生产测试、AGENTS、正式DEC／合同／批准配置、依赖／lock、CI、TS/Vite、旧模型/输入/素材只读。不接E01/E02/E03、浏览器、玩家入口、商店、第二委托或O3。没有批准的规则冲突须报告主线，不通过改玩法给模型兜底。

## 8. 完成交付与停止

一次完成，不为解除一个反例单独小提交。报告：起始/最终完整SHA、parent/tree、分支；F01/F02修复与相邻自查；原31项在完整数据的修复前后结果；原98项保留和新增／替换／删除统计；原生24独立结果；六类负控实际ID/退出码；冻结双跑摘要；白名单、原字节、4前缀、38配置、链接、src/root保护对象、diff与push回执。

按实际保护对象检查确认生产树仍为98c840dd0b6b1a6cc014df4ac9165bc94bf2c794。普通commit/push只到本分支，最终核对远端、工作区及基线至最终diff；失败则如实记录，不宣称已同步。

结束后停在当前WebGPT主线准确SHA专项复审，不自动采纳、正式归档或进入生产。任务内部详细设计、修复和技术协调由你完成，不让Owner在两个问题之间往返。
