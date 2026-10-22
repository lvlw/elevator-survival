# DOC-WORLD-ENTRY-006 — 实际交付记录

## 状态与基线

文档与 T01 交付完成，独立工作区审计通过；本轮交付仍需主线准确 SHA 实文件审查。不是基础生产、浏览器、UI 或体验 PASS。

- 起始 SHA：`20b833aeec4693e56afee075c9878425d3c58605`；父：`394f59d3c5df2a65ce87186e8988982d76784a71`；tree：`29271bdca786ba60fc9884ae12bc7fba844fa488`。
- 分支：`feature/design-world-entry-006`，沿用既有分支；起始工作区、暂存区、untracked 均空。
- 范围：55 条精确路径，25 份原跟踪文件修改、30 份新文件；[全部路径及摘要](checks.json)。不新增生产测试。

## 批准、定稿与来源标注

Owner 在本会话直接批准 D1 当前粗档、D2 独立 DEV 封闭首玩及限定顺序，当前任务再次明确授权落文与同分支普通提交／推送。主线给定编号及七份技术载荷不等于 Owner 对所有技术细节逐字决定。

来源标注差异：包中 [OWNER-approval](inputs/OWNER-approval-WORLD-ENTRY-006-v1.0.md) 实际保存上一条助手的确认回执（以“收到，确认本条为 Owner 批准记录”开头），不是 Owner 逐字原话。该原件及确定载荷均按要求保留原字节；真正授权依据是此前 human 用户消息和本轮直接任务，不以助手回执独立证明权限。不新增或扩写玩法决定。

## W1：原字节录入

- 19 份输入完整归档，SHA256SUMS 的 18 条及清单自身大小／摘要独立核对；[输入清单](inputs/BASELINE-AND-INPUTS.json)。
- [DEC-053](../../../../05-design-decisions.md#dec-053) 只将给定 6575 字节接到起点原文件；旧 DEC-001～052 完整前缀保留，不新增 UIR。
- 其余六份载荷原字节安装：[公开病程](../../../../engineering/world-integration/preplay/public-condition-contract-v1.0.md)、[字段 v1.1](../../../../engineering/world-integration/player-query/player-query-field-contract-v1.1.json)、[基础准备](../../../../engineering/world-integration/preplay/foundation-contract-v1.0.md)、[浏览器 owner](../../../../engineering/world-integration/preplay/browser-owner-contract-v1.0.md)、[低资产 UI](../../../../engineering/world-integration/preplay/low-asset-ui-contract-v1.0.md)、[批次门槛](../../../../engineering/world-integration/preplay/batch-plan-v1.0.md)。
- v1.1 原 24 键及顺序保留，其余 23 条字段不变；旧 v1.0 JSON、历史 3／12／9 与原 23 公开／1 unknown 实现记录不改。批准不表示生产已显示粗档。

## W2：仅末尾同步

23 份既有文档末尾增加带定位链接的本轮附记，完整旧字节前缀保留。GDD／VS 保留旧医院语义，Architecture／Traceability 区分 current、checkpoint 与只读 Presentation；UIR 只作 DEC-053 索引。旧 entry-006 DRAFT、probe 模板、checks、results 和历史失败不追改。

D1 只公开当前粗档，不公开精确进度、潜藏暴露或未来答案，隐藏医疗目标 Preview 继续 unknown；分段引用原 infection_damage，参数未变。D2 不动旧入口／旧槽，孤立 reservation 不补发、不自清，失败保存刷新只恢复最后成功 checkpoint。O3、迁移和永久双产品仍未批准。

## W3：T01 实测与边界

- 修前在仓库外原字节副本运行给定模板：12 项，10 符合、2 个 ..probe 误放行、0 程序异常，实际 exit 1。仅路径谓词证据，不冒称 Windows 文件系统或游戏证明。
- 修后 Node 独立回归：35／35 PASS，0 NOT RUN。包含 12 个 posix/win32 计算案例、真实 Windows junction／仓库别名／悬空链接／多层缺失／默认临时目录／创建后复核。
- 组件边界代替字符前缀；按现存真实祖先解析，再拼未建尾部；lstat 区分缺失与悬空，解析失败 fail closed。默认输出先计划再创建；mkdir 后、写 TS/config/log 和 spawn 前复核真实落点。
- 仓库外负控一恢复旧前缀：3 个真实 AssertionError 检出；负控二去掉真实落点包含检查：3 个真实 AssertionError 检出。两者均 exit 1，无导入／fixture／语法失败冒充检出。
- 兼容核对：runner 的 const posix 起至 EOF 与起点逐字节相同，三工具 node --check 通过；实际 CLI 拒绝 repo/..probe，未创建输出。原 native 游戏 suite 未执行。
- EACCES／EIO 为注入故障，不是实际 OS ACL 实验；posix 只验证路径计算；未承诺防恶意并发换链的 OS 沙箱。临时测试不递归清理任何 Owner 目录。

完整逐例记录：[T01 修前／修后／负控](t01-path-guard-results.json)。

## W4：验证、历史与停止点

包模式核验 exit 0；报告齐备后的安装模式 222 项 PASS、exit 0。安装模式首次在作者报告尚未生成时报告缺失 completion（exit 1），该中间状态保留，不包装为通过。架构实际 PASS：53 DEC／341 core production files。工作区独立审计 PASS：55／55 许可路径、19 原件、7 载荷、23 旧前缀、24 字段及其余 23 条保全、79 个相对链接／26 个锚点、1472 份受保护文件不变；全部新增 UTF-8 与空白检查通过。详细记录见 checks.json。

历史 W01 实查累计 exit 2、原两文件七行；本批新增 diff 与暂存 diff 均 exit 0。旧 src／测试／配置／依赖／CI 保持。精确暂存审计为 25 修改／30 新增，19 原件与 7 载荷一致；最终提交前复查全部索引字节，提交后另核对 Git 对象。最终 SHA、父／tree、push／远端／CI 回执在提交后另行返回，不追写自身 SHA 或 amend。

NOT RUN：test:run、完整 npm run check、typecheck、build、原 10 项游戏 probe、72 样本、浏览器／多标签／Owner 试玩、实际 ACL 和 POSIX OS 实验；新增生产测试 0，T01 工具不计入历史生产测试。CI 如自动触发，只报告准确新 SHA 实际状态。

规则冲突：未发现批准玩法冲突；输入来源标注差异如上透明记录。未完成：主线准确 SHA 审查及后继三批工程／浏览器与 Owner 验收；O3 仍未决定。本任务结束即停止，不自动开工生产。

## ENG-WORLD-PREPLAY-FOUNDATION-001：批准来源定位澄清

依据[本轮主线来源澄清](../../../../engineering/world-integration/preplay/foundation/inputs/MAINLINE-approval-provenance-clarification-v1.0.md)：主线核对其 WebGPT 会话，Owner 以用户角色发出并明确采纳“收到，确认本条为 Owner 批准记录”完整文本。谁最先起草措辞与 Owner 是否采纳是两件事，不能仅凭句式撤销已明确批准。本作者此前“助手回执”判断保留为历史，不倒改该段、旧 checks、573 字节原件或哈希；该判断不影响 D1／D2 的有效批准。此处如实引用本包主线核对记录，不冒称本机独立访问了另一会话。

澄清不新增批准、不扩大 D1/D2，也不自动授权后继浏览器或 UI。
