# E01-R 准确 SHA 恢复接缝实审 v1.0

## 结论及当前停止点

**NEEDS REVISION：F01 历史身体步骤的规则／来源联合约束需要限定返修。**

受审提交：`346902461c3fd1f01ec88132d4d2e7c3ef1d50bd`。
父提交：`8c19ca0d28058cf743b41c8547cc2629c8eac767`。
Tree：`5df149782169e37a6a8211945c6fbaf7cc1fda49`。
分支：`feature/residence-content-supply-restore-001`。

不进入 E01-S。first-hub 的独立 execution、同进度完整 committed 比较、旧格式隔离和零玩法重放方向保持；不重做 v3，不撤销 E01-P 已审纯生产者边界。

另项 **W01 已明确接纳为限定归档空白例外**，不是源码阻断项；处理见第5节。此前没有明确列出的例外不能由作者自行推定为已批准，本次由主线明确处置，不要求改写原件或重写已有提交。

## 1. 实际读取和证据层次

主线读取准确 SHA 的9份新增生产文件：supply-types/schema/policy/validation/history/expected/codec/index/controlled；7份测试和专用 supply-test-fixtures；完成报告与验证记录；并定点对照原 G1 cycle.ts、G1 已批准配置、原 A 步骤验证、P 历史校验、实际 AGENTS 和本任务原包。

GitHub compare 显示仅比父基线前进一笔；实际 diff 的30路径是9生产、7测试、1辅助文件、4作者记录、5输入和4共享附记，未触碰旧核心或旧reader。远端同名分支、CI head SHA 与上述提交一致。

作者证据：起始161文件／3365测试；新增7文件／107项；最终168文件／3472项。CI #144 / run 37288884152 / job 111694316434 的完整日志已读取：实际checkout准确提交，52 DEC／289 core、类型检查、168文件／3472项测试及构建均通过。CI通过不替代下面的语义检查。

主线运行证据：
- 5份原输入的本地ZIP字节重新计算 Git blob，全部与准确提交目录对象一致；并定位7处双空格。
- `supply-history.ts` 全文件重建后的 Git blob 与远端一致：`57aa42a2947870863c8254a716e7592032d875d2`（9944字节）。
- 使用原样函数执行16项隔离检查：12符合／4不符／0程序异常；退出1。函数未重写；替换的只有 safeAdd、carriedItems、same 和错误类等导入工具，输入为该函数需要的投影，不是完整P聚合。
- 新附原生Vitest回归模板共13项，只做了语法转译检查，**原生执行 NOT RUN**。须由Codex在完整仓库先复现。

主线尝试取得可执行仓库副本时DNS解析失败，未完成clone。主线没有完整复跑npm、107项套件或原生codec反例，不将隔离结果冒充完整API结果。浏览器、真实Storage、多标签和Owner试玩均NOT RUN。

## 2. 已确认保留的正确边界

外部policy要求真实受控配置／catalog，保存的是自有壳副本，不冻结调用方壳。每次aggregate要求独立identity、phase、cycle、revision及任务execution；initial origins必须反向匹配外部initial execution。另一合法seed的first-hub不能用原expected自证。

同进度restore先验证独立完整committed，再比较完整值。encode/decode不产生SupplyAuthority或current；旧v1/v2入口和语义保持；真实pending combat拒绝，不清pending。

测试中的实际药食、安装、交样、两声明历史以及各类死亡正例仍有价值。这里发现的是附加历史验真缺口，不是这些纯生产者已经在正常行动中扣错血，也不是玩家浏览器已经加载了这种坏档。

## 3. F01：数值自己对得上，不等于该来源合法

定位：`src/state/residence-save/supply-history.ts` 的历史步骤循环和来源检查。

当前步骤检查确认顺序、非负数值、HP差值等于facts.damage，以及最新步骤HP等于角色HP；但没有把已记录流血幅度与对应已批准上限绑定，也没有把局部周期死亡与休整可发生的任务日联合起来。

### F01-A／B：流血幅度可被一起改大

当前G1配置是行动流血1、周期流血2，真实代码均执行截零。因此：
- 主要效果不损血、HP2时，行动流血不能记录为2→0／damage2；应当只损失1。
- 周期流血前HP3时，不能记录为3→0／damage3；该阶段最多损失2。

同时改记录里的healthBefore／healthAfter／damage会绕开现有“差值相等”检查。此次隔离函数对这两种自洽但不可能的步骤均接受。它们没有改变最终死亡标记、身份、revision、cycle、钱包或实物。

不能简单要求damage永远等于1或2：HP1时的周期流血真实损失是1。修复需保留截零，以及真实有主要损血后再流血的正例。

### F01-C／D：Day7截止死亡可被标成休整死亡

从真实Day7异地截止流血死亡结果，只把receipt.source由deadline改成supply-death或location-death，保持cycle-bleeding步骤和taskDay7，当前隔离函数仍接受。

G1明确拒绝taskDay>=days的普通rest；局部消费者的cycle-bleeding序列表示休整，不是任意截止入口。故这种“Day7局部休整死亡”不是支持的历史结果。

不能反过来禁止所有Day7局部死亡：Day7合法移动／任务动作仍可致死，其primary→action-bleeding序列必须保留。也不能拒绝Day6合法休整死亡或正常H0空步骤。

### 完整路径的核对与待执行边界

源码路径为deserialize/serialize→validateSupplyResidenceAggregate→P readSupplyValue→R validateSupplyResidenceHistory。独立expected不包含receipt的这些具体步骤；同进度完整committed比较能挡住篡改，但普通冷候选路径不能依赖它。P的相应历史检查只要求非空／任务日等粗关系，没有替代上述规则约束。

据此判断完整codec存在相同缺口；不过本轮没有在主线执行完整codec，这点须保留。原生模板要求用真实P/G1/G2/A结果建立前态，先捕获独立expected，再只改对应receipt，分别观察aggregate、encode和decode。若实际前置校验已拒绝，必须报告真实拒绝点，不能弱化它以制造失败。

## 4. 修订边界

修订限v3历史验证、必要的同层纯一致性helper、相邻测试和文档。不得修改G1公式／配置、P生产者、旧A/B/C/v1/v2、v3格式号或独立expected，也不启动E01-S。

校验可以读取已批准配置验证被记录的关系，但不能调用动作／日结／随机生产者重演过程。这里只补能从已存记录和规则直接判断的矛盾，不要求证明完全重写的离线历史，也不能用最新身体状态去验证另一旧委托当时的伤口。

需成组保留：合法HP0、HP不足额截零、Day6休整死亡、Day7行动死亡、正常H0空steps、deadline-ready、旧历史、13项新原生模板、原107项与P91项、旧B/C及全量check。增加对应负向控制，确认删除新约束会让回归真正失败。

## 5. W01：7处主线输入硬换行的限定例外

已逐字节核对：
- `docs/engineering/residence-foundation/content-supply-restore/inputs/ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-task-v1.0.md` 第7—9行；10339字节；SHA-256 `64f8040c04cae74937af837998211957bbc509adede451869cf5bc15e0c871d2`。
- 同目录 `AUD-8c19ca0-E01-P-review-v1.0.md` 第3—6行；4655字节；SHA-256 `bab11e7b844b831f28c25d6b0904696ab72cad2345efddcec785ecd157618d48`。

七处均为原包中的Markdown行尾两个ASCII空格。这次主线明确允许只保留这七处，不改原件，不更改Git检查设置，不amend／强推。原作者记录写fullCached/baseToIndex为EXIT1；主线独立no-index对两个原件检查各退出3。不同命令／环境不混成同一个退出码；都不是全绿。

R1须在现有报告追加本次授权和真实完整检查结果：从旧P基线累计检查如仍报告上述七处，可记`WITH_APPROVED_W01_ARCHIVE_EXCEPTION`；以本次3469024为基线的新增差异必须全部干净。任何第八处、新路径或不同字节不在例外中，须先停报。

## 6. 其他保持

CI日志另有依赖审计4项告警（2 moderate／2 high）及已有bundle提示；本次未开展依赖安全分析，不声称可利用性或生产影响，也不授权自动audit fix。它们作为维护事项保留，不与F01混合或私自升级依赖。

当前E01-R状态：等待本次限定返修与新准确SHA专项复审。当前不更新Project Sources、不改项目配置、不向Owner再要一次任务下发授权。
