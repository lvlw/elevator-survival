# 封闭首玩浏览器启动与唯一持久化契约 v1.0

状态：MAINLINE_RATIFIED_ENGINEERING_BOUNDARY，D2范围由Owner批准；技术内容承接受审entry-006/04、05及contracts/02。基础准备准确SHA实审后另发工程，不是当前生产写许可。

## 1. 适用边界与实际缺口

只有显式DEV、独立命名空间的封闭新世界，不切换或触碰旧医院默认入口／旧槽，不自动迁移、清理或重建。沿用唯一S、v4三键format/formatVersion/state、R严格expected及同进度完整committed比较；不新增第二身体／库存／钱包。

实际prepareCombatPersistence已有value/text/expected，但普通write(text)没有expected。后续工程须明确窄接缝，将已验真的prepared expected与预编码原text配对交唯一adapter，不能在adapter解析待恢复payload后调用committedExpectation自证。旧默认S接口及通知／重入语义保持，接口扩展及兼容测试须在届时任务精确许可。

本范围检测损坏、错身份／版本／初配／阶段、不完整组合及合作页面重复writer；不承诺对能改整套客户端数据或旧备份的用户防作弊、不回档、跨设备恰好一次或外部可信根。hash仅是完整性指纹。

## 2. 技术方向与材料所有权

采用与同步S适配的localStorage单checkpoint方向，独立初始化reservation；不引入第二存储真相，不将port偷改成Promise。精确应用外壳字段、key及版本是本批详细设计事项，须绑定下列事实、严格schema并经源码实审，不在本轮注册运行时。现有候选命名空间只是示意，不等于已创建槽。

| 材料 | 独立来源与固定时点 | 不得变成 |
| --- | --- | --- |
| 角色身份、execution、seed | 玩家明确初选确认后，经一次受控环境熵边界生成并严格校验；恢复不再生成 | 从候选字段抄出的expected或新委托 |
| 世界／模板／具体委托／完整声明 | 已批准content/composition静态受控来源 | 每次随机生成第二份任务 |
| 初始工具／专长 | Setup明确选择，初始化记录锁定 | 恢复改选或重新发物 |
| 规则／配置／内容／profile／随机版本 | 受支持registry与初始化材料交叉核对 | 按候选任意切版本 |
| phase/revision/cycle/missions/battle/closure expected | 上次真实受控prepared checkpoint生成并配对保存 | 冷payload的自证、可编辑第二current |
| 同进度完整committed | 活会话唯一S内存 | 额外持久化整份身体／库存／钱包 |

reservation只保留身份／初配／声明／版本及初始化占用；checkpoint含slot/generation绑定、完整原结构expected和原v4Text。expected中死亡场次／trace等严格锚不得为了“小”删除；metadata不交玩家DTO。环境身份熵不参与规则随机，玩法继续统一可注入种子来源。

## 3. 启动、第一次创建与checkpoint

获取独占后，只检查新命名空间。两记录真不存在才允许无档Setup；孤立、坏JSON、版本不支持、generation不一致或有历史占用而缺完整checkpoint均blocked，禁止回退初配。

玩家确认后先成功写reservation；失败则0 initial provider／0发物。成功后真实createFirst一次，由已验真prepared交接一次完整checkpoint setItem。首次reservation是额外应用写，须与S每笔checkpoint分别计数，不虚报“首次确认只有一次物理写”。

冷启动在锁内读外层并严格验证初始化、声明、版本及metadata，先固定独立来源expected，随后才让S读取／解码领域candidate。不访问v4Text.state、origins、battle或closure修补锚。读一个外层字符串可能已经取得payload字节，不能把逻辑解码顺序说成物理上没有读到任何候选字节。

一次完整checkpoint包含expected与text，不先保存expected再单独覆盖payload。技术generation不代替gameplay revision；同current的retry不推进玩法或悄悄换身份。adapter可保留只读预编码交接，不保留可独立修改的第二状态。

## 4. 故障与保守支持

| 情况 | 必须结果 |
| --- | --- |
| 读取权限／异常 | read-error，禁止创建，原路径显式重试 |
| 错版本、交叉身份／初配／generation、坏metadata或payload | blocked且保留字节；不修复、不删槽、不改expected适配candidate |
| reservation成功、首checkpoint失败 | 本页保留first-hub及保存失败，可retry；崩溃重开见孤立占用则blocked，不补发 |
| 后续checkpoint写失败 | current已完整提交；显示未保存；retry只验证／编码／写最新，不重播动作、随机、药耗、周期或奖罚 |
| 失败后刷新／退出 | 只能恢复最后成功checkpoint；不能承诺关闭提示一定拦截或持久化未保存内存 |
| 更新中断 | 严格绑定外层完整字符串；不声称设备断电物理落盘保证 |
| 已有current又读盘 | 禁止第二bootstrap覆盖或重建 |
| living-hub／dead冷恢复 | 0额外日结、发奖、罚款、死亡消费或新任务 |

除首次reservation外，不用通知监听器另写进度metadata。恢复／导出／清除／重建玩家流程和O3不是本合同许可。

## 5. 合作页面独占

采用Web Locks独占方向，在支持的同源安全环境持有整个可写会话；ifAvailable未取得则仅占用页，0 S创建／身份生成／provider／写入，不steal。无能力或能力不满足时阻止入口，不以localStorage布尔、时间戳、TTL或storage event冒充锁。

进程内domain继续保护同进程，但不能代替跨标签。页面终止、关闭、崩溃、BFCache恢复、同源frame与竞争重试都要真实浏览器检验。恢复页先确认持锁；失锁弃用旧可执行上下文／草稿，再获锁后只冷恢复最后成功checkpoint，不安装失锁旧内存。非合作脚本、分区、用户编辑、隐私限制及系统崩溃不在绝对保证内。

此处锁和存储是技术定稿方向，不是浏览器兼容率或已通过验证的声明；实际平台/API能力在工程时核对。

## 6. 工程验收与停止

B01—B10至少覆盖：真实真空槽和初选；expected原生交接与读取顺序；五停点／三敌／两类死亡刷新；错身份版本初配battle/closure／孤立记录；首写及后续故障；同进度保护／无重放；双页竞争；关闭/BFCache/失锁和不支持环境；旧医院隔离；全量及真实浏览器证据。

实际工程列精确新adapter/application路径和受控S窄接缝；保护旧reader/schema/policy语义，禁止以放宽校验解决启动。执行真实测试基线、定向、默认npm run check、隔离浏览器真实IO与多页面故障验证；headless字符串端口不替代浏览器。报告独立计数、平台、准确SHA、CI、未覆盖项；保存接缝实审后停止，主线另发UI，不自动连跑。
