# 首玩基础准备：安全提示与应用更新契约 v1.0

状态：MAINLINE_RATIFIED_ENGINEERING_BOUNDARY；承接Owner D1／D2及逐批顺序。文档准确SHA实审后须另发工程起点、分支、精确路径和commit/push权限；本文件不授权现在写生产。

## 1. Goal与来源

在394f59d已审玩家facade和唯一v4 S基础上，一批完成[当前病程映射](public-condition-contract-v1.0.md)、必要公开安全metadata、最小应用controller／稳定Presentation snapshot及错误／草稿责任。来源为DEC-049—053、UIR当前有效约定010—012／015、已批准查询主合同及受审entry-006/02、03、06和contracts/01。

不新增规则、第二current、writer、状态替换API、通用事件总线或SDK。普通详细设计与实现取舍由工程在授权内举证完成，不要求Owner逐函数协调。

## 2. W1：真实接口和同源安全能力

重新读取实际AGENTS、有效规则、player-*、combat-session/composition/persistence/expectation与实际依赖，先运行默认完整测试。列出字段→唯一owner→公开依据→实际函数→缺口；D1只按正式配置纯投影，既有公式不得搬到React。

现有Preview的available只表示资格，不保证生还。逐项盘点当前机制、公开费用／资源支付、实际公开变化、必要视觉标识和适用的完整命令死亡三态。不得调用producer／resolver试跑、签发计划、消费随机或从raw commit拼玩家数据；新增公开范围只能以已有规则和D1为依据。

UIR-015的动态保护条件保持：正式安全Preview确认完整命令必死，且仍有不保证死亡的合法替代时，进入相应保护确认。不能把unknown称安全或not-guaranteed，不能拿某条件分支死亡当整条命令必死，也不能将所有操作变成通用确认。需要新增隐藏知识的子项须明确停审；不能靠全部unknown删除该验收责任。

当前实际暴露事件没有专用安全DTO，不能从pending精值差分编日志。当前敌人／物品视觉标识只按允许公开的content metadata受控投影；资料不足可通用占位，不以节点、意图或真实ID猜身份。此处是工程职责，不批准新事件知识。

## 3. W2：显式ready更新与单飞

应用controller候选是唯一显式调用协调者，不是规则owner。Presentation持有的是不可变安全PlayerView缓存、busy／错误、UI草稿与session-local Feed；不持有可编辑canonical。getSnapshot在状态未变时返回同一缓存引用，不能每次render重新query产生新对象。mount／StrictMode不能重复bootstrap、创建或发物。

一次显式意图按顺序：检查单飞与适用的应用权限→持有原opaque请求→置Presentation busy→调用player.execute一次→忽略原生回调作为ready来源，只标记失效→正常返回后消费result.view→committed时清旧对象草稿并发布新ready（含save-failed）→释放busy并发布自洽安全snapshot。原生S通知仍一次；Presentation busy/ready更新另计，不作为第二玩法通知。

bootstrap/createFirst/retryRead消费受控返回view；retrySave消费返回view更新保存反馈，无玩法通知也能刷新。基础批只用headless端口，不获取真实浏览器锁；浏览器批在同一controller边界接独占门禁，不能在基础批伪称跨标签已通过。

所有正式写意图经controller。受控外部调用发生后，只在同步调用栈结束后显式同步取新安全view；不靠几个异步监听器分别修改资源、重算或保存。

## 4. W3：草稿、错误、Feed与真实组合

新current、阶段／战斗、移动、消费、拆合或冷恢复后，旧材料／格位／目标／确认草稿失效，不能查同名对象或刷新revision续交。未提交拒绝保留当前选择；retrySave同current保留选择含义。

写失败保最新内存，不回滚、不回读。投影异常时屏蔽旧可执行视图，保留原异常，通过受控synchronize恢复展示，不重发动作或再存。已提交但未取得返回时只核对唯一安全视图并标记反馈不确定，不自动重试command。任意程序Error（包括带code）不吞为业务拒绝。

Feed只读已公开执行前后差异／正式安全结果；不保留原状态、Effect、roll、内部身份或raw trace。明确拒绝不记成功。查看、取消、Preview、bootstrap、retryRead、retrySave不生成已执行玩法Feed；重载只显示恢复当前状态，不以日志重放规则。

验收覆盖五停点、无current／blocked、D1同档／跨档、隐藏医疗、稳定引用、双击／回调重入、blocked→ready、保存失败／retry、投影故障、旧对象／确认失效、两类敌终态死亡、正常H0与Day7。以真实生产者和facade执行，不另造有限游戏模型。

## 5. W4：验收、保护与交付

后续实际任务应列F01—F10映射：公开D1、同源metadata、完整命令安全边界、稳定snapshot、初建／加载一次性、显式执行一次、错误及草稿、Feed非干涉、真实组合／零副作用、全量回归与范围。

独立计数query／Preview／取消／拒绝和显式提交；分别记S dispatch/write/notice与Presentation更新。至少语义负控检出隐藏信息泄露、陈旧选择或重复执行。保护旧P/R/S、v4及现有局部30秒预算，D1涉及旧跨档断言的必要修改在正式任务精确授权后进行，不能在本轮先改。

完成默认npm run test:run基线、定向和组合回归、npm run check及范围/diff审计；提交准确SHA、parent/tree、真实增量、支持与未知项、失败修订及NOT RUN。停主线准确SHA实审；不接真实浏览器存储、UI/DOM、玩家入口或O3，不自动执行下一批。
