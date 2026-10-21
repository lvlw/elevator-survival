# 唯一 owner、刷新和错误时序候选

状态：AUTHOR_DRAFT。N02／N03／N05／N10 为真实 headless 探针；下述 UI bridge 尚未实现。

## 唯一责任

| 层 | 持有／负责 | 不得持有／执行 |
| --- | --- | --- |
| 既有 v4 S | 唯一 current、期望、完整提交／写入／原生通知 | 不由 UI 增加第二套规则 |
| 玩家 facade | 安全 query／Preview、opaque 解析、委托 S | 不返回 raw current／commit／authority |
| 应用 controller 候选 | 单飞门、显式调用、生命周期、浏览器资源、ready 发布 | 不结算、重放或修改身体／钱包／库存 |
| Presentation bridge 候选 | 不可变安全 PlayerView 缓存、busy／错误／草稿／Feed | 不缓存第二 canonical，不发独立保存／终局命令 |
| React 候选 | 展示和明确意图 | 不用 getState 补洞、重算资格或从隐藏值做按钮差异 |

Presentation 缓存只是已投影的只读展示，不具有 domain 安装权。`getSnapshot` 返回缓存对象，不能每次 render 调 `player.query()` 返回新对象。订阅函数稳定、mount／StrictMode 不 bootstrap 或发物两次。参照 [React 官方 external-store 合同](https://react.dev/reference/react/useSyncExternalStore)；该链接是 API 依据，不是已实现证据。

## 显式更新序列

1. controller 检查自己非 busy、拥有浏览器锁；保存当前草稿的 opaque 原请求及展示授权上下文。同步关闭双击门，发布 Presentation busy，不增加 S 通知。
2. 预览／提交仍使用原请求；若期间上下文改变，拒绝旧意图。绝不找同名物、同序号或最新行动替换 selector。
3. 调用一次 `player.execute`。原生 write／subscribe 回调中 query 可能 transaction-in-progress；回调只标记 invalidated，不建立 ready、不改 current、不调用 retry／第二 dispatch。
4. 执行正常返回后，消费 `result.view`。若 committed，清所有旧对象草稿并发布完整 ready（包括 save-failed）；拒绝则展示当前安全反馈，不当作成功日志。
5. Bootstrap／createFirst／retryRead 使用受控 bundle 的返回 view；retrySave 用其返回 view，只更新保存反馈。无原生玩法通知的重试也必须让 Presentation 得到更新。
6. 最后释放 controller busy，并发布一份自洽安全 snapshot。Presentation 可有 busy→ready 两次通知，**原生 gameplay 仍只有一次**。Hover／Focus／读取仅看缓存／纯 Preview，不重建 context。

所有写者必须经过该 controller。若受控外部动作引起 invalidation，只在其同步调用栈结束后由单一显式同步入口取新安全 view；UI不能直接订阅 S 并拿 blocked 当永久终态。禁止任意异步监听器各自保存或模拟结算；不把 controller 变成游戏事件总线。

## 故障与草稿表

| 情况 | 候选处理 | 禁止 |
| --- | --- | --- |
| 双击／busy 回调再入 | 第一个意图单飞，后续拒绝；按钮只读显示处理中 | 排队两个原 command、自动重试 |
| 新 current／phase／冷恢复 | 销毁旧确认、placement、材料、目标；显式重选 | 只检查仍“合法”就复用旧授权 |
| 未提交拒绝 | 保留对应当前展示，提示修改输入 | 先扣物、成功 Feed、额外 save |
| committed＋save-failed | 最新内存，明确“本次操作已提交但未保存” | 回滚、reload、resolver重播 |
| retrySave | 同 current／selector；发布新 persistence | 清掉当前选择或重新发物／通知 |
| 执行后投影异常 | 旧画面只读／遮蔽，视图受阻；保留原异常；受控 synchronize 后 query | 为“修画面”重发动作或再存一次 |
| 完整结果已提交但 controller 未拿返回 | 检查 busy 已解／取唯一安全 current view；记录反馈不确定，不重交 | 猜测未执行、自动 retry command |

N10 的 TEST 故障只替换展示 context 构造，生产者保持原生；一次 current／save 后受控同步不再保存。它不证明真实 UI 已经实现上述恢复。

## 安全结果与 Feed

Feed 只消费已经公开的执行前后安全事实及正式安全结果；不保留原状态、Effects、roll、风险百分比、身份或原 commit。相同隐藏状态配对不能因错误文本／选项／颜色／日志泄漏。只有实际明确执行后合法公开的结果才允许不同。未知医疗失败不能被 Preview 循环探测；明确拒绝和材料消费的观察不同，不作不可推知隐藏状态的绝对承诺。

bootstrap、retryRead、retrySave、取消、Preview、查看、关闭结果均不生成已执行玩法 Feed。浏览器 reload 不复原历史日志，不用日志再驱动规则。
