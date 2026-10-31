# ENG-WORLD-COMMITTED-PRESENTATION-B1-001 — 一次完成的工程任务

## Goal与玩家价值

把已经提交的玩家战斗动作，可靠地交给未来的呈现层一次；失败保存不能误报动作没发生，重试/恢复不能重复演出。下一轮真正接UI时不需要猜日志或偷读内部战斗轨迹。本项本身不改变当前界面、不降低完整战斗演出长期目标。

本包已主线定稿并授权B1，不需要Owner逐函数确认。详细来源和规则依赖见本包source references；规则权威与AGENTS仍优先。新知识/生命周期或范围冲突必须停相关子项并给事实，不得私自扩项。

## W0：实查、保全与基线

1. 在所有仓库/worktree之外解压附件，执行verify-package.py。按输入清单归档原字节；保留原件空白，不为git diff --check改历史原件。
2. 实查当前branch/HEAD/status/普通及暂存diff/worktree、远端head、是否有本地独有工作。不得自动checkout覆盖、reset/clean/stash或删worktree。若当前脏，保全后可在仓库外独立worktree的准确base工作；不让Owner逐文件指挥。
3. 起始必须完整`12186083a8791e26b4e87f21ab1767d3ae4e4a58`，tree`b2ffbddc453bfd93077359c5434d5a010473b745`。读取实际AGENTS、当前GDD/Vertical Slice/Architecture/DEC049—053、相关content及UIR012/013/015当前有效约定，重点核对本包路径和原B候选，不从旧Project副本逆推现状。
4. 新建`feature/world-committed-presentation-b1-001`；若同名已有非base提交或远端漂移，停相应写入并报告。固定baseline及所有旧任务分支不动。
5. 开工实际 `npm run test:run` 建立基线，日志记录323/4725是否仍实际成立；不能直接引用旧数。使用既有依赖，不升级、不改registry/lock/CI/全局workers或timeout。
6. 在独立临时目录记录准确旧返回keys/几个代表原生链的公开结果、完整current/存档摘要及计数作前后对照，必须标测试证据，不进入运行时或普通玩家载荷。选择器/token对照按引用重命名，不从私有身份派生。
7. 写implementation-plan与sources-actual，按T01—T11给出状态/效果/查询/临时issuer唯一职责及失败策略。可自主决定文件内函数拆分，不增加框架。

## W1：窄生产实现

仅4个既有生产文件与2个可选新纯辅助文件；按合同实现facade闭合action运输、controller纯安全投影和独立会话scope/token。保持原run/adopt/publish/Feed及S/current通知/保存次数。直接返回而不是加入snapshot或订阅总线。

完整实现六类和缺省分流，明确异常/blocked/保存失败。不把新字段放进query、save、expected或ui。把资源/动作事实的决定权留在既有核心；不按地点选择敌人，不加载新资源。

## W2：原生与反例验证

一次完成验收矩阵K01—K20，保留旧查询/选择/错误/支付/原生恢复链。补齐真实双响应仍单记录、真实胜利与两种死亡、保存失败继续/只保存重试、冷恢复五停点、三敌再入、确认与stale以及全输出非干涉。

只允许在两个已读旧研究测试中适配新增字段键集；按SOURCE-COMPATIBILITY-BASELINES列明前后。其他旧断言/输入/数量/timeout不改。新增TEST-only消费者验证skip/reduced/cancel/late token；不建生产动画播放器或修改owner来让测试通过。

负控在仓库外临时副本执行，清楚记录每个独立变异与预期业务断言；污染不会入提交。测试脚本不得从测试结果反过来修改生产参数或生成假“原生证据”。

## W3：集中自查、回归与当前状态

- 定向新测试及实际相关回归；原E03四路线/72默认样本保持，证据不累加。
- 默认 `npm run check` 全部脚本实跑；超时/基础失败保留，先定位不扩大旧测试/CI写权。有限合理重跑可做，但不能隐藏首次失败。
- 对照原生current/save/RNG/通知，保证增加呈现字段没有规则后果；隐藏字段读访问/序列长度/类型/错误一并检查。
- 独立自查从反例角度检查：选择scope与呈现scope混用、通知发令牌、save失败误rejected、终局null误胜利、额外原始对象泄漏、consumer回调二次执行。
- 仅纠正治理current-state的两处许可字面术语，保留所有其他字节和历史日期；不借此宣称三份审查原件或资产风险已关闭。
- 同目录完成CONTRACT-AND-SUPPORT、CURRENT-STATUS、TEST-INVENTORY、VERIFICATION-RESULTS、PRIVACY-AND-NONINTERFERENCE、LIFECYCLE-MATRIX、SELF-REVIEW及SOURCE-REFERENCES-ACTUAL。可合并文件以减少重复，但所有信息必须有唯一入口。

## W4：一次提交交付并停止

输入整包原件进入 `docs/engineering/world-integration/committed-presentation-b1-001/inputs/`。新增文档/工具只在本任务目录；不重复装入旧图、全部旧设计包/全仓库/node_modules/profile/存档。保存结构不变不等于本轮实际浏览器已测，所有NOT RUN明确列。

完成后正常commit；普通push仅新分支，并用独立远端readback验证最终SHA。一次完整结果优先一个提交；为保护工作允许在同一任务内必要检查点，但不借多提交跨B2/C、保存或规则门槛。不得amend/rebase历史。提交内completion写待精确SHA，最终commit/parent/tree回执放仓库外，避免自指哈希。

只交一个MAINLINE-REVIEW.zip：最终完整源码/新增测试/文档、source-files.json（Git blob+模式+长度+SHA256）、base→final patch、必要原始日志、原输入清单、保护对象/branch回执、实际测试与负控、未完成项、最终SHA/parent/tree、包大小/sha256。包清单闭合，无重复或越界，提供verify工具；以最终提交字节构建，不用CRLF检出字节冒充git blob。

完成即停止，等主线精确SHA实审。B2、C、素材修复/采用、依赖维护、main/发布均不自动继续。

## 报告必须回答

起始/最终完整SHA与tree；实际模型/强度是否可核验；真实开工基线；哪些文件变动；六类与每个K行的证据层次；新增/适配旧测试分别计数；初次失败和修后结果；default check；producer/current/writer/notify计数；全输出非干涉；scope和令牌生命周期；非combat兼容；原生不可达/未测项；保护对象与旧refs保全；准确CI已确认或UNCONFIRMED；唯一交付包路径/大小/摘要；明确停止点。

**工时不是验收目标，不必为做长而扩功能。** 在本授权内可以连续完成设计、实现、修订和全部验证，不因普通技术疑点反复让Owner转交；真正越界则保留局部产物而不是偷偷实现。
