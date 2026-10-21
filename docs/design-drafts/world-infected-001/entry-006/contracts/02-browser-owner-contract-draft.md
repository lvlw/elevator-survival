# 最近工程候选 2：浏览器启动与唯一持久化

状态：DRAFT，先采纳D2并经基础批次准确SHA实审；本文件不授予写权。

## 目标和唯一依据

按[浏览器候选合同](../04-browser-bootstrap-and-persistence.md)把实际 v4 S／strict codec 接入独立封闭命名空间；不改玩法、v4三键、expected独立要求或旧医院槽。引用DEC-049—052及原恢复／保存合同；新增的是技术外层和受控prepared交接，不是新生命周期。

## 真实缺口与复用

复用 combat-session、prepareCombatPersistence、combatNextExpectation／startup expected、R strict aggregate／codec、共享domain。需要**明确批准的受控 expected＋text handoff**；现有write(text)不是完整实现，不允许解析候选自证。未来可窄扩 composition／private commit保存边界，旧默认S接口和通知语义保持且原测试保护。冷material来自已持久化原生checkpoint，不来自candidate.origins；活current的完整比较只用S的独立committed，不持久化第二身体。

主推荐localStorage同步单checkpoint写、先reservation、同源Web Locks独占；异步IDB仅作后续替代，不为本批偷改port为Promise。占用失败／API不支持阻止进入；不自动抢占。reservation无checkpoint、版本交叉等blocked，禁止补发。首次额外reservation写与S每笔write独立计数。

## 可能必要路径（仅候选）

未来 `src/app/` 新世界 composition/bootstrap/checkpoint；`src/state/` 新独立浏览器adapter；现有 combat-types／composition／session／persistence 的受控小接缝及新测试。实际开工包必须精确列白名单与旧语义兼容回归。旧v1/v2/v3/v4 reader、schema、规则和旧槽不作为自动迁移出口。当前不批准创建这些文件。

## 原生＋真实浏览器验收

- read-null＋显式初选→一次initial provider→首次checkpoint；锁竞争第二页0provider／dispatch／write。
- prepared expected 外部传递、expected先于payload读；缺失、改seed／choice／版本／battle／closure均拒绝；不放松完整校验。
- first-hub、stable、三敌battle、living-hub、dead真实刷新恢复；恢复0玩法／draw／重发／终局关闭；同进度完整committed比较。
- reservation失败、首写失败、后续写失败、配额／安全错误、JSON损坏、generation交叉、更新中断、进程关闭；保最新内存，retry只存。
- 双页竞争、关页释放、崩溃／BFCache、无Web Locks、分区／隐私限制；不凭一个localStorage字段宣称互斥。
- 旧医院槽及入口逐字节不变，新旧格式拒绝正确；无自动clear／migration／Profile。

执行定向、完整默认npm run check、真实隔离浏览器存储／多页验收，不能用headless端口代替。回传准确SHA、parent/tree、各故障链独立计数、候选外材料来源、实际平台边界和CI。保存／生命周期接缝准确SHA实审后停，主线再发UI工程；不自动连跑。
