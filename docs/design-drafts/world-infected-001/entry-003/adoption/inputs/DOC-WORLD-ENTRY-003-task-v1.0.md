# DOC-WORLD-ENTRY-003：四终局、最小积分与关闭态恢复集中正式归档

任务书v1.0；日期2026-10-04。**已由WebGPT主线依据Owner实际采纳与既有任务下发权限直接下发；完整读取本包后执行，无需再次申请开工或逐项确认。**

这是一次完整的仅文档任务：原件归档、DEC-051、唯一试用配置、终局恢复补充、A契约、A→B→C门槛、相关入口与状态同步、自查修订、检查、普通commit／push及报告。**不执行A/B/C，不改生产源码或生产测试。**

## 0. 一次交付目标与当前状态

将WORLD-ENTRY-003-ADOPTION v1.0已获Owner采纳的范围正式归档，使下一项A工程有唯一、可核对的依据。原R1专项已PASS，不重开终局设计或再跑一轮返修；有限模型不移植到生产。

只新增DEC-051。包内approved-documents五份载荷是主线依据批准范围给出的确定归档正文；编号、文档位置、配置标识和技术格式定位由本任务明确，不让Codex自创或采用更宽候选。载荷不是声称Owner逐字起草了每个技术句子。

本项结束时，必须同时说明：本次终局规则与限定参数／契约已经批准并归档，待文档准确SHA实审；G4仍只支持其已审子集；完整终局／新格式生产实现仍未由本任务执行；旧医院入口／旧槽发布安排和其他未批事项仍OPEN。不得把“已采纳”写成“已实现”。

## 1. 精确基线、分支、Git权限

| 项目 | 本任务锁定 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整SHA | c67fd4117065e2e0dbd1117cae4fbfaa83791599 |
| root tree | 23e4813756ab35972b98875b99f409f1aa583afb |
| 源码src tree | 4d28340ad020950e90bbbed1dc0b902a7f6880db |
| 分支 | feature/design-world-entry-003，沿用现有分支，不新建分支或worktree |
| 正式DEC | 基线最大050；本次唯一新增051 |
| main远端参考 | a76e9c1c998051fc1643b6e0c3d53443fa55feed |
| 允许操作 | 仅§5的37条文档路径；本项普通commit及同名分支push |
| 停止 | 提交推送并核验后，等待当前WebGPT主线准确SHA文档实审 |

不合并、不推main／其他分支、不强推、不amend／rebase／改历史、不reset／clean／stash丢弃或隐藏改动、不绕过hooks、不改Git配置、代理、证书或SSL验证。模型设置由Owner在Codex会话处理，本任务不更改运行配置。

开工重新读取真实仓库，不沿用旧会话推断。至少记录：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git rev-parse HEAD^{tree}
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin
```

普通fetch可用于取得准确已知对象；目标HEAD／目标远端必须为本次基线，工作区须无他人或遗留改动，拟新增目标不存在。干净时允许切到指定现有分支，不移动其他分支。冲突先报告具体事实，不自动覆盖、强推或把“最新提交”替代基线。主线只核对了远端，用户本地状态由你实查。

## 2. 输入与阅读责任

包内11件：根目录六件（任务书、获批稿、Owner实际批准、R1实审、基线清单、SHA清单）及approved-documents五份载荷。SHA256SUMS覆盖其余10件，不自哈希。逐字节归档11件，不归档ZIP本身或旧审查大包。

先验证全部摘要，再完整阅读获批稿、Owner实际消息、前置审查及五份载荷。原获批稿／实审中的“待采纳／不授权归档”是当时状态；本次实际批准和本任务构成后续授权，不能改写原件以更新状态。

按实际AGENTS及其适用嵌套规则读GDD、Slice、Architecture、DEC及相关Content。此任务不设计UI，不改UIR；若引用信息安全原则，只读当前UIR有效约定，不创建统一弹窗规则。固定基线必读：

- DEC-049／050与本次涉及的终止、真实物品、周期和恢复条款；07仅辅助定位。
- entry-003的00—05、config-candidate及R1状态；原003／R1的完成及检查记录只作历史证据，不算本轮执行。
- 新世界04-main-mission、11-points-hub-recovery及reviews/endgame-candidates-v1.1；003C／003D原确认只按必要段核对，不重读整套历史。
- 原首身份契约、energy-cycle-contract-v1.0及runtime-restore-supplement-v1.0；G4实际支持合同；G1 CyclePlan／CycleClosure、G2 LocationPlan及G3/G4保存／会话接缝只读对照。
- 实际package.json、scripts/validate-architecture.mjs，不假设脚本未变。

玩法权威仍是后续已确认DEC优先；获批稿／实际批准限定本次采纳；本包只落实该范围。普通排版、链接和同步问题在任务内处理；发现载荷与批准实质矛盾时停止相关归档并报具体句子，不选择更宽解释。

## 3. 四个工作包一次完成

| 包 | 交付 | 范围底线 |
| --- | --- | --- |
| W1 原件和批准归档 | 11件原字节输入和批准入口 | 不改原件措辞／换行，不移动Project Sources |
| W2 正式规则与参数 | 精确追加DEC-051，安装四值唯一终局配置，局部覆盖关系 | 不改旧001—050，不复制G1参数，不批准商品／医疗等 |
| W3 契约定稿 | 安装A纯核心契约、终局恢复补充、A→B→C门槛 | 不放宽expected，不在文档任务创建生产模块或新存档 |
| W4 同步与交付 | 全部指定状态入口、自查／只读交叉审查、检查修订、commit／push和报告 | 不拆Owner逐文件任务；不执行A/B/C、不改历史验证结果 |

允许只读审查辅助；根会话是唯一写者与Git操作者，不把助手意见算成独立实际运行。整包规范和检查通过后再提交，不为内部小步骤分别请求Owner确认。

## 4. 确定载荷与唯一当前入口

### 4.1 精确追加DEC-051

approved-documents/DEC-051-append.md按目标docs/05-design-decisions.md编写相对链接。读取Git基线原字节，核对完整基线blob：

```text
f13e8c5718583d08aec3ce09edd311df60ee61b0
```

目标必须严格等于：

```text
baseline_DEC_bytes + b"\n\n" + DEC_051_payload_bytes
```

不得strip、格式化、重编码或改变旧段换行。001—050正文保留，包括当时“未实现／排除120”的历史状态；只追加051，并在当前入口解释后续局部覆盖。不得另增052或修改已确认旧正文。

DEC-051的C01—C12是本条局部定位，与来源C01—C12保持主题对应；具体文案按给定载荷。来源候选未被逐字整体升级，本次批准范围和正式目标为唯一依据。

### 4.2 四份新目标原字节安装

| 包内载荷 | 唯一当前目标 |
| --- | --- |
| approved-documents/infected-terminal-core-test-config-v0.1.json | docs/content/infected-terminal-core-test-config-v0.1.json |
| approved-documents/terminal-core-contract-v1.0.md | docs/engineering/residence-foundation/terminal-core-contract-v1.0.md |
| approved-documents/terminal-restore-contract-v1.0.md | docs/engineering/residence-foundation/terminal-restore-contract-v1.0.md |
| approved-documents/terminal-batch-plan-v1.0.md | docs/engineering/residence-foundation/terminal-batch-plan-v1.0.md |

以上整文件与对应载荷逐字节相同。inputs/approved-documents只是不可变输入副本，不承担另一个可修改的当前规则／配置来源；原entry-003候选继续保留证据身份。

配置config的键全集恰为success_reward=120、initial_balance=0、balance_max=2147483647、failure_penalty=20；数字必须是整数而非bool/字符串。前三值首批试用，20此前已确认且本次正式落文。metadata仅说明来源／定位，不增加玩法参数。与获批稿及未改config-candidate逐键对照，禁止修改候选来迁就检查。

新技术语法定位为elevator-survival.residence-headless / formatVersion 2；新并列接口拒绝v1，原v1接口不默改。该2是技术版本，不是经济第五参数。终局配置依赖与原G1配置分别严格绑定；不在文档任务发明或注册新玩家rulesVersion。实际工程任务仍须给受控组成、类型／字段与准确路径，不能把元数据当已有生产能力。

旧O2合同继续适用；新增终局恢复合同只补四态／金额／处分和完整提交的扩大支持边界。原首契约、原expected、G1/G2及G3/G4历史原件一律不改。A是完整可执行契约边界，尚不是实际工程开工包；B/C的具体接口与路径在其前项实审后由主线锁定，不填虚构SHA。

### 4.3 同步正文要求

每个新附记都应按文件职责简写，不机械复制整份规则。必须能定位本次批准与唯一正式目标，并清楚区分已批准／首批试用／生产未接／历史证据／后续Gate。

| 文件组 | 同步责任 |
| --- | --- |
| GDD／Slice | 当前新连续驻留终局范围、达标显式成功／未达标合法失败、正常无夜；旧医院回归与当前仍不可玩分开 |
| Architecture／Traceability | 纯终局计划→新编解码→会话消费，唯一所有权与实际缺口；候选路径不假称已实现 |
| Supersession index | 051仅对当前新委托局部补齐终局、任务件和四数值；不整体废止旧DEC，不用索引创造规则 |
| overview／queue／readiness01 | 关闭本次已采纳子项，标明R1 PASS及本次待文档实审，剩余商品／服务／专长／内容／发布仍OPEN |
| readiness02／04 | 当前G4能力、A/B/C接口依赖、真实生产测试和保存／体验门槛，不冒领历史模型为新验证 |
| entry-003/00—05 | 顶部新附记指向DEC、配置与三个工程文档；旧全文作为源候选和历史验证边界保留 |
| 04-main-mission／11-points-hub-recovery／终局候选 | 顶部明确本次消费者资格、四终局、四数值及任务件细则已局部归档；旧其余内容仍Draft，不扩大地图和服务等参数 |

状态词不能统一改为PASS。保留R1的原106／175及主线37／43等历史归属；本次文档检查不复跑它们、不把这些数加进本轮成绩。旧20／40／80治疗价格、商城、地图、医疗和战斗参数仍待批准；三专长、工具箱和Owner试玩责任不删除。

## 5. 精确文档路径白名单：37条

未列路径不得产生仓库差异。目录名不是递归白名单；不得新增空模板、工程源码占位或仓库检查脚本。

### 5.1 DEC精确追加（1条）

```text
docs/05-design-decisions.md
```

### 5.2 既有文档仅末尾追加（10条）

```text
docs/01-game-design-v0.1.md
docs/02-vertical-slice.md
docs/03-architecture.md
docs/07-decision-supersession-index.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/design-drafts/world-infected-001/readiness/01-current-baseline-and-adoption.md
docs/design-drafts/world-infected-001/readiness/02-source-gap-and-ownership.md
docs/design-drafts/world-infected-001/readiness/04-evidence-and-playtest-gates.md
```

基线Git字节必须是完整前缀。不能把全部旧文档重编码／格式化或删除旧状态。

### 5.3 候选来源仅顶部新增采纳附记（9条）

```text
docs/design-drafts/world-infected-001/entry-003/00-owner-review.md
docs/design-drafts/world-infected-001/entry-003/01-source-and-adoption-map.md
docs/design-drafts/world-infected-001/entry-003/02-terminal-outcomes-and-settlement.md
docs/design-drafts/world-infected-001/entry-003/03-state-ownership-and-restore.md
docs/design-drafts/world-infected-001/entry-003/04-next-engineering-contracts.md
docs/design-drafts/world-infected-001/entry-003/05-validation-and-open-gates.md
docs/design-drafts/world-infected-001/04-main-mission.md
docs/design-drafts/world-infected-001/11-points-hub-recovery.md
docs/design-drafts/world-infected-001/reviews/endgame-candidates-v1.1.md
```

每份文件严格为“新附记字节＋完整基线Git字节”，旧全文为完整后缀，不在中间替换旧待审或旧数值。新附记与旧文之间有清晰历史分隔，读者可先见当前入口再读来源。

### 5.4 四份正式新目标与两份任务报告（6条）

```text
docs/content/infected-terminal-core-test-config-v0.1.json
docs/engineering/residence-foundation/terminal-core-contract-v1.0.md
docs/engineering/residence-foundation/terminal-restore-contract-v1.0.md
docs/engineering/residence-foundation/terminal-batch-plan-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/DOC-WORLD-ENTRY-003-completion.md
docs/design-drafts/world-infected-001/entry-003/adoption/checks.json
```

前四份按载荷复制；后两份记录实际执行。不要为最终SHA自引用再amend或新增回执commit。

### 5.5 包内11件逐字节归档（11条）

```text
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/DOC-WORLD-ENTRY-003-task-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/WORLD-ENTRY-003-ADOPTION-owner-review-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/AUD-c67fd41-WORLD-ENTRY-003-R1-review-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/BASELINE-AND-INPUTS.json
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/SHA256SUMS.txt
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/approved-documents/DEC-051-append.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/approved-documents/infected-terminal-core-test-config-v0.1.json
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/approved-documents/terminal-core-contract-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/approved-documents/terminal-restore-contract-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/approved-documents/terminal-batch-plan-v1.0.md
```

输入原有相对层级保持。归档载荷中的链接按正式目标解释，不为归档副本改写链接或指纹。SHA清单本身也需字节保全。旧R1审查ZIP与模型大包不再重复入库。

## 6. 明确范围外

所有src/**、scripts/**、.github/**、AGENTS、依赖／lockfile、tsconfig、vite、Git配置、.gitattributes、旧首契约、原O2／G1合同、G1—G4原件、docs/06、UIR、旧医院内容／保存均只读。

entry-003/config-candidate.json、validation/**、原inputs/**、R1 reviews归档及旧completion不改，不重冻／重跑／重写它们。它们中的保护指纹本来锁定历史规则；本次新DEC归档可能使旧模型的“当前文件未变”防漂移检查不再适用于新HEAD，不能为继续显示旧175绿灯而更新保护指纹。

本任务只用文档字节／参数／链接／范围及架构检查验收。不运行原模型、原API探针、生产测试、完整npm run check、构建或浏览器来填本轮成绩；没有执行均写NOT RUN。不得安装／更新依赖、修审计告警或修改检查阈值。

不实施A/B/C、钱包／终局代码、编解码、迁移、真实任务生产者、战斗／医疗、UI、玩家入口或新任务供给。旧医院入口／旧槽发布安排继续保留，不执行清档。无关机／重启／定时操作，Project Sources和项目配置不改。

## 7. 验收与自查

临时验证脚本／详细日志放仓库外；仓库只保留本任务两份报告。可自主写核对脚本，不要求Owner逐行指挥。必须检验全文／语义，不以计数或标题命中代替内容一致性。

| 检查 | 必须实际核验 |
| --- | --- |
| 原件 | 包内10项SHA清单通过；11归档件与输入包字节／大小／SHA／Git blob一致，包括清单自身 |
| DEC | 旧完整字节保全；最终严格等于§4.1公式；标题编号仅新增051且不重复，C01—C12均在确定载荷内，无052 |
| 正式配置 | config恰四个键和四个整数值；完整文件匹配载荷；获批稿与基线candidate逐键一致；G1 34值及原配置blob不变 |
| 契约 | 三个新工程文档全文匹配载荷；A无安装／保存，B并列接口，C在B通过后消费；旧expected及原O2合同不降级 |
| 源码现实 | 不将纯文档归档宣称为新增模块／完整终局实现；src tree及所有生产／测试对象和依赖／CI不变 |
| 原文保全 | 10追加文件的基线前缀、9前置文件的基线后缀完整；旧DEC、R1／G4／模型／输入历史全部保持 |
| 来源分层 | 已批准规则、试用数值、待文档实审、未实现与仍未批事项分开；旧发布O3不与本次技术选择混同 |
| 链接 | 新增／变更当前链接和锚点有效；载荷从正式目标位置核验；原件及历史链接按证据身份列明，不改原件掩盖断链 |
| 编码空白 | 新写文本UTF-8／LF／无BOM／无行尾空白；原件按原字节保全；若真有冲突报告，不静默修原件 |
| 路径对象 | 37条准确白名单且交付齐全；全体非白名单Git对象和受保护根tree保持，不能只验数量 |
| 架构 | 实际执行npm run validate:architecture，记录真实输出／退出码；不冒充生产测试 |
| 差异 | 普通、cached、基线至工作树以及提交后基线至HEAD的git diff --check全部执行并保存真实退出码，无新例外 |

至少执行：

```text
npm run validate:architecture
git diff --check
git diff --cached --check
git diff c67fd4117065e2e0dbd1117cae4fbfaa83791599 --check
```

归档旧载荷的目标相对链接以mapping在正式位置核验，不要求它在inputs层级也能打开；这不是当前正式链接的豁免。不得通过不检查真正当前入口来获得PASS。当前包不授权任何行尾空格例外，不使用--no-verify／过滤错误或改core.whitespace；原任务历史例外不继承。

本包已由主线检查新输入是否有行尾空白；执行者仍应独立核验完整实际diff。若架构检查真的需要未授权环境安装或规则冲突，报告具体缺项／错误，不把NOT RUN写成PASS。

## 8. 普通提交、推送及网络续办

全部文档检查通过并对索引重做字节／保护对象核验后，允许一次完整普通commit；建议消息：docs: adopt terminal settlement and restore contracts。最终父SHA应仍为指定c67fd41完整值；不能混入其他任务变更。

只向同名分支普通push：

```text
git push origin HEAD:refs/heads/feature/design-world-entry-003
git ls-remote --heads origin refs/heads/feature/design-world-entry-003
```

提交后对本次变化对象、input blob、正式payload、所有保护对象及基线diff复核。确认远端目标等于最终完整SHA；其他远端参照分支核对，不把查询失败说成未改变。报告工作区真实状态；主线不会假称访问用户磁盘。

网络故障时允许在原授权内最多再尝试一次普通push，先核对远端没有他人新提交；不得强推、merge／rebase或修改代理／证书／SSL／remote。保留本地提交，不为记录推送失败新增commit或amend。仍失败则在仓库外生成离线审查ZIP，包含本次已提交文件、其基线对应原件、完整SHA／父／tree、name-status／binary diff及逐文件哈希／blob映射和脱敏回执；报告REMOTE UNCONFIRMED与ZIP路径。离线交付不冒称已推送。

## 9. 完成报告、证据归属与停止点

仓库的DOC-WORLD-ENTRY-003-completion.md和checks.json至少记录：起始完整SHA／tree、分支、实际W1—W4成果、37条路径及模式、原件／载荷指纹、四参数逐键验证、旧文保全、原生架构命令／真实退出码、实际链接和diff检查、失败与修訂过程、范围外对象、冲突及未完成项。

新增生产代码／测试=0。起始和最终生产测试、npm run check、模型／API探针、build、浏览器／多标签、Owner试玩均按实际写NOT RUN；历史成绩只能引用为历史，不累加新验证。主线准确SHA文档实审仍PENDING；本地检查通过不替代它。

最终完整SHA／父／tree及push回执在提交后消息提供，不把包含自身的SHA写进同一提交。最终消息开头明确DOC-WORLD-ENTRY-003，说明是否已推送、真实远端、工作区、实际检查、未完成项与停止点。

**交付后停止，等待当前WebGPT主线准确SHA实文件评审；不自动正式发起A/B/C或转到工程会话。** 文档实审通过后主线按Owner已有权限另发A完整工程，不要求Owner再次授权生成任务书。
