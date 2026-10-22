# ENG-WORLD-PREPLAY-FOUNDATION-001／RESUME-01 准确 SHA 实审 v1.0

## 1. 结论

**NEEDS REVISION：R-M01（样本提取的已知护具支付未进入公开 metadata）。** W02提交约束冲突已解除；本轮不要求再修原件空白、不重做controller／D1、不更改采样规则。先完成一次限定功能返修，暂不进入browser owner或UI。

受审提交 `cc147cd253f3e7e57e45de265610becb64a74821`；父 `ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`；tree `79ecbc3fea0d1f7e00277b64cc054ff00dd52532`；分支 `feature/world-preplay-foundation-001`。已从GitHub git commit及ref核对，与用户报告一致。不是主线访问用户E盘得到的本地状态。

CI163/run39697808099独立读取为completed/success，job119559364741的架构、类型、测试、构建阶段全部success。未下载完整job日志重新统计4444项；267/4444仍为作者报告数量，不冒称主线全量复跑。

## 2. R-M01：明确而有条件的耐久支付被漏报

位置：
- `src/core/residence-supply/player-metadata.ts:38–50`，Git blob `c856591a43ac31d59ac5cd41ed2d820a2f01c718`。
- 对照原执行职责：`src/core/residence-task/shared-actions.ts:29–37`，Git blob `e5a0d548f2867ddaa06b6ca4395a534f94ddcb62`。

新metadata仅在明确toolInstanceId且method属于crow/toolbox/lit时添加工具支付。样本cautious/direct没有这一tool参数，因此即使正在穿着有剩余耐久的厚外套，`resources`仍为`[]`。

原正式生产者却在样本分支检查：实际厚外套、integrity>0、该防护确实降低此方法风险；满足时消费`wear.tool`，使用保护后的风险。当前已批准配置两种方法均满足保护降险，`wear.tool=1`。这些是内部规则审阅事实，不授权公开风险百分比。

**玩家影响**：未来界面若按本批提供的支付metadata展示，可能显示没有装备支付，而实际提取后外套少一点耐久；只剩一点时外套归零，影响后续防护。尚未接UI，不能说已有玩家被误导；这是首玩准备接口的准确性缺口，而不是发现P错误扣款或存档损坏。

**为什么属于本批要求**：原任务W1 §2.2要求处理已知耐久/电量支付并同源；F02的支持记录已声明public payment。此支付可由当前装备与正式配置确定，不是隐藏感染目标，也不是未来随机结果。不能以unknown长期豁免，不能把`resources=[]`继续当成完整支付列表。

## 3. 独立执行与边界

主线取出两份完整源码，逐字节重算Git blob匹配后，运行`evidence/check-sample-payment.mjs`。

8项隔离检查：4项符合、4项支付提示不符、0非预期异常，实际exit1。两种方法×耐久12/1分别出现实际原分支消耗1而metadata资源列表为空；两种方法×耐久0/无外套的4项对照不扣费且列表为空。查询窗口所观察的资源消费、随机、身体、签发等适配器调用为0；前态不变。

**不是原生完整游戏执行。** 两份模块函数体原样执行，Node只去TypeScript类型和import；正式资格／来源／身体／资源算术／draw等外部依赖采用明示TEST适配器。输入是裁剪值，不能证明8种形状全部能由玩家路线到达。没有执行原生readCombatValue、P/R/S、facade或controller长链，也没有本地全量npm运行。

因此返修第一步必须运行包内`native-sample-payment-regression.test.ts.template`，以真实初配、入场、CTB胜利、移动至H5和真实sample任务复现。该模板共10个用例定义，主线只做TS语法剥离检查，**尚未在完整仓库执行、类型检查或验证导入**。1/0资源是明确标注的TEST边界；正耐久主见证必须从实际生产链取得。模板错误不得算语义检出。

## 4. 已阅读的相邻实现与保留项

定点阅读了：controller、drafts、confirmation、Feed；player-preplay/facade；D1 public-condition、safety-facts与G1窄抽取；完整command safety、payment metadata、正式qualification；原CTB两种primary fact函数与checkpoint；原样本producer；相关metadata/safety/confirmation测试和原生夹具。

D1确实引用infection_damage；confirmation持有原request及opaque scope且一次消费；controller在execute返回后采用新view，retrySave不重播命令。未在这些已读位置发现需要与R-M01合并修改的新阻塞。这里是定点源码审查，不是全文件/全功能正确性证明；R-M01修复后仍需准确SHA复审。

不撤销先前P/R/S的已审结论。感染精值、潜藏暴露、未来周期、隐藏医疗资格继续原unknown；正常H0空steps、双方归零死亡、保存失败保最新内存、旧选择失效和原notify次数保持。

## 5. Git、原件与异常许可

GitHub compare显示本次仅一提交、59路径，起点至提交+5578/-11；与作者59路径报告对照。未从用户磁盘验证其worktree/status、884指纹或全部保护文件。

主线从当前可访问的原ZIP实际字节，重算原7份输入目录tree `ef89fcc4858d97ec190cdf17f3adfaf27c6003f8`，续办4份输入目录tree `1f2dbe0b805856d856f003feff3a69ce23d7b06b`，与准确提交的两棵远端树一致。11份归档原件完整集合因此匹配；清单/逐件blob在evidence/input-integrity.json。

W01仍为旧两文件七处。W02仍只限原任务书第249行、EOF告警、SHA-256 `c8b7fba85afd741b871b4022d9824744938e1f38cfee16bce36bf06dd26f5325`、blob `85a39b34c414952cfc30005b4f76b483bb019a42`。原件保持已验证；本轮未在完整仓库重跑所有diff-check，原exit2属于作者执行证据。返修增量不得新加例外。

## 6. 本轮未执行

本地完整仓库下载失败：codeload及GitHub相关域名DNS无法解析，原输出随evidence保留。故本地原生P/R/S、作者75项及267/4444、两条长链、884文件指纹、全量保护审计均NOT RUN；浏览器、多标签、UI和Owner试玩亦NOT RUN。npm audit不从历史数字推定最新，仍UNCONFIRMED。

## 7. 修订边界与下一步

按随附R1任务一次完成：真实修前复现→原样本保护/支付条件的必要纯窄抽取→同源metadata→当前装备/耗尽/末次资源/两方法/参数拒绝/隐私/一次执行的配对回归→默认完整check与原两链→限定文档及普通commit/push。

禁止复制一套采样公式、试执行producer获取Preview、将外套一律列为必付、额外抽签、强制穿外套或修改原风险/费用/资格。已执行保护的量来自同一规则owner，输出仅合法公开支付，不输出风险表或隐藏暴露。若原生复现与本报告不同，记录准确分歧，不制造失败。

本审查和R1任务不授予browser owner、UI、入口、O3、迁移或依赖升级权限。

## 8. 可核查来源

- Commit: https://github.com/lvlw/elevator-survival/commit/cc147cd253f3e7e57e45de265610becb64a74821
- CI163: https://github.com/lvlw/elevator-survival/actions/runs/39697808099
- `source/`为两份精确Git指纹源码；`evidence/`为独立脚本、真实结果、原件核对及尚未执行的原生模板。
- 不把主线8项隔离、作者75项新增和CI通过相加为新增生产验证。
