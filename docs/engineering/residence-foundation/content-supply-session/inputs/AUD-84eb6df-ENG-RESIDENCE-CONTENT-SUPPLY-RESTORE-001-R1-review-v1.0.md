# E01-R-R1 准确 SHA 专项复审 v1.0

日期：2026-10-05。
结论：**PASS；F01关闭；W01限定原件例外保留。**

- 受审提交：`84eb6dff5e9d3238c3e651525b6ed28412132549`。
- 父提交：`346902461c3fd1f01ec88132d4d2e7c3ef1d50bd`。
- Tree：`327e3474a3f6b90d156f6e34dbbcc0288f7efe87`。
- 分支：`feature/residence-content-supply-restore-001`。
- 审查对象：R1对v3历史流血幅度及局部休整来源约束的修复，不是重新宣称全部世界或任意离线历史已经认证。

## 1. 结论和下一停止点

唯一生产变化是`src/state/residence-save/supply-history.ts`新增15行。F01所指出的两组缺口已经在读取历史层补齐，没有修改G1执行、P生产者、v3格式或独立expected接口。原合法截零、主要效果先发生、Day6局部休整死亡、Day7行动死亡和正常H0空步骤均保留。

可以按既有批准下发E01-S：显式v3唯一会话、新内容事务与headless保存故障。该下一项须独立工程分支、完整任务、最终准确SHA实审；本PASS不授权自动进入E02/E03、玩家或浏览器接入。

## 2. 精确源码审查

源码Git blob：`b2bd29c90ae8858a04733e12bf2b6c097f079720`，共142行。本轮用旧受审原件加准确新增段重建全文后重新计算Git blob，与GitHub读取的准确SHA文件完全一致，才用于隔离执行。

### F01-A：流血实扣量

行动流血必须等于`min(该步骤healthBefore, 既有G1 bleed_action)`；周期流血的非零实扣量必须等于`min(该步骤healthBefore, 既有G1 bleed_night)`。读取的是实际配置，不另设数值。

这既拒绝HP2被行动流血2点杀死、HP3被周期流血3点杀死，也保留HP1周期只实扣1及合法主要伤害后的HP1流血死亡。旧周期记录不存前态伤口标志，零周期流血仍可能合法；不能拿当前身体的伤口去证明旧历史曾经流血或未流血。

### F01-B：局部周期死亡来源

仅对`source=supply-death/location-death`且以`cycle-bleeding`开始的当前局部休整死亡，查询该条归档自身绑定的历史catalog与节点，检查任务日小于截止日、节点可休整、无pending和节点上未击败敌人。

约束不误套到`primary`开头的Day7行动死亡；也不将真实deadline改成普通休整。存活遭遇只清pending不能伪造休整资格。规则计算和状态安装仍不发生在reader里。

### 回归与接口

新增`supply-review-regression.test.ts`的22项按真实P/G1/G2/A结果形成前态，再修改候选；四个原反例分别在aggregate、serialize、deserialize观察明确INVALID_STATE，并独立监测无玩法调用、无IO、无通知。原107项测试文件未改；独立first execution、同进度完整committed比较、旧格式双向拒绝均沿用。

新增两声明正例在旧截止流血后，于后续TEST执行真实包扎，验证不能用最新止血状态否定旧合法流血记录。此TEST声明不是第二份玩家内容。

## 3. 证据分层

| 来源 | 本轮可确认的事实 | 不代表 |
| --- | --- | --- |
| 作者本地 | 开工168文件/3472项；原模板修前4失败9通过，修后13通过；新增22、净增22；两类语义负控分别3和6失败 | 主线亲自重跑作者本地日志 |
| 准确提交CI #145 | run 37300333381 / job 111731266579；checkout准确SHA；architecture 52 DEC/289 core；typecheck、169文件/3494项、build成功；新22项实际在日志出现 | 人工体验、真实浏览器IO或无告警 |
| 主线源码及对象核查 | 读取生产变更全文、新增回归及相关旧G1/会话接缝；确认当前分支指向准确SHA、父SHA和tree；核对两个输入目录完整树指纹 | 用户磁盘、全仓库本地Git审计 |
| 主线独立执行 | 原样历史函数32项隔离检查，修订版32符合、0异常；相同扩展夹具在旧版20符合、12误接受 | 原生完整aggregate/codec或npm全量运行 |

32项包含原16项和16项相邻检查，不与作者22项、原107项或CI重复累计。隔离时替换导入的safeAdd、carriedItems、same和错误类，使用最小历史投影及声明的历史节点/敌人夹具，不替换受审函数。配置只用原流血值1/2及原上限。裁剪数据不是完整P合法快照，因此不能据此单独宣称每条完整codec反例已执行；这部分由已读原生测试和准确CI补证。

主线尝试获取独立完整仓库执行环境时，容器git clone因`Could not resolve host: github.com`退出128，未形成仓库，不执行本地npm。GitHub连接器读取和CI日志核对正常。本轮没有主线全量npm、作者负控复跑、浏览器或Owner试玩。

## 4. 原件与W01

旧五份输入目录树指纹：`f41046b30b2ae8fcaec92522551e832bf7b54e50`。
R1十份输入目录树指纹：`570c8a852dcef8b9937bd258ff39a4aab738c26e`。

从本会话两个原ZIP的完整文件字节独立构造Git树，均与准确提交的对应目录树相同，共15份原件；两个原件硬换行范围未增加：

- 原E01-R任务书第7—9行，SHA-256 `64f8040c04cae74937af837998211957bbc509adede451869cf5bc15e0c871d2`。
- 原E01-P审查报告第3—6行，SHA-256 `bab11e7b844b831f28c25d6b0904696ab72cad2345efddcec785ecd157618d48`。

作者记录R1新增差异检查exit0，8c19ca0到R1累计exit2仅W01七处。本轮主线独立核对原件字节与行位置，不冒称在完整仓库重新执行了累计diff检查。例外不扩展到任何新任务包、新路径或第八处告警；不得更改原件或将历史非零改写为PASS。

20个变更文件是1个生产修改、1个新增测试、4份共享附记、4份工程记录、10份原件。读取提交diff可见旧验证JSON仅加R1记录（原结尾为追加对象而增加逗号），并未将历史结果替换；正文保留历史时点。

## 5. E01-S必须承接的边界

1. 继续使用当前R严格v3，不为接会话而弱化F01或expected；旧v1/v2入口、测试不改。
2. 调用已有共享domain占用入口，不新建与v1/v2互不知情的registry，不建立第二current。
3. 首次真实read-null后才允许受控初配；冷启动的完整expected须由候选外的受控启动材料提供。不得把刚解析的存档字段、initial origins或decoded候选再包装成其自己的expected。
4. current已安装后，操作授权来自owner掌握的完整已提交前态。受控原计划验真后才验证完整后态、预编码、一次替换current、一次保存和一批通知。
5. 新任务/维护/移动/休整死亡消费原计划一次，不额外revision；活pending战斗仍是E02边界，不清pending冒充稳定态。
6. 保存失败内存保留最新；retrySave仅保存。四稳定态冷恢复需真正调用headless端口，但不冒称已实现单字符串自举的浏览器冷启动或跨标签锁。

## 6. 维护告警及未完成范围

CI还有依赖审计4项（2 moderate/2 high）、打包体积及runner action Node提示。本轮未分析具体可利用性或开展维护，不自动audit fix，不与F01混算。

E01-P/R已完成当前限定实审，E01-S尚待实施。活战斗、新玩家入口、浏览器槽路由与独立启动材料来源、O3、商城/身体服务、后续真实任务和完整体验仍按门槛推进。Project Sources没有因此自动同步。

## 7. 核查入口

以上源码/测试/文档均锁定`84eb6dff5e9d3238c3e651525b6ed28412132549`。仓库定位：
- `src/state/residence-save/supply-history.ts`：40—47行和56—62行。
- `src/state/residence-save/supply-review-regression.test.ts`：242行完整回归。
- `docs/engineering/residence-foundation/content-supply-restore/completion.md`：R1追加节。
- `docs/engineering/residence-foundation/content-supply-restore/verification-results.json`：R1对象。
- `docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md`：R04—R08。
- CI：`https://github.com/lvlw/elevator-survival/actions/runs/37300333381`。

主线判断：**F01关闭；专项源码PASS，归档仍WITH_APPROVED_W01_ARCHIVE_EXCEPTION。**
