# 证据分层与首玩验收候选

状态：AUTHOR_DRAFT / 本轮 headless 接缝证据，不是浏览器或体验 PASS。

## 本轮真实探针

使用[模板](validation/native-entry-probes.test.ts.template)和[运行器](validation/run-native-probes.mjs)，在仓库外生成 TS／Vitest 配置和日志，导入实际 repo 源码。Node v24.9.0、Vitest 4.1.10；显式 Node 环境，不改仓库默认 jsdom、worker 或测试预算。使用既有 TEST fixture、真实 P/R/S 和独立观察 spies，未替换玩法内核。

最终 run-02：1 文件／10 项 PASS，Vitest duration 3.13s，测试体 697ms。详见[实际 JSON](validation/results.json)和[源码指纹](validation/source-manifest.json)。

| 探针 | 真实结论 | 限制 |
| --- | --- | --- |
| N01 | Setup 读取不发物、0 IO／通知 | 无浏览器 Setup |
| N02 | write／subscribe 两次观察均 blocked；execute 返回 ready；1 dispatch/write/notice | 没有实现 React bridge |
| N03 | 随机来源 1 source/1 draw/1 write/1通知；失败保最新 current；retry无玩法、同 selector | TEST quiet draw；不是默认72实验 |
| N04 | 坏字符串、read-error、已有 expected 却 null 均不发初配 | 读取失败解除后仍须原路径重试，不证明跨崩溃 metadata 已存在 |
| N05 | 新 current 和真实 cold restore 拒绝旧对象，额外 write/notice 为0 | 浏览器对象生命周期未接线 |
| N06 | 合法 TEST HP1流血经真实 move 形成一次完整 dead | TEST前态，不称普通玩家已走到此处 |
| N07 | H0显式失败后 living-hub，无后继、无追加夜、真实空 steps | 不重跑整条成功路线 |
| N08 | 合法 pending0/1配对全视图相同，消毒 Preview 均 unknown；实际分别拒绝／成功 | TEST真实来源／实物＋合法身体边界，注入最小draw；不是隐藏行为永不可推知证明 |
| N09 | cold expected 先提供再读候选，0重发／写入 | TEST保留先前真实S checkpoint与独立初始参数；不是持久化生产桥 |
| N10 | 展示 context 故障后已提交内存保留；同步不再保存；旧操作拒绝 | TEST仅故障注入展示函数，未改生产者 |

首跑 run-01 为 7 PASS／3失败：N04 缺合法 existing 冷材料导致构造拒绝；N06/N08 从错误 TEST 模块导入 fixture，得到 TypeError。这些是探针编写错误，不是目标语义缺陷或负控检出。修订仅改本轮模板导入和合法冷夹具；原始日志保留仓库外，初跑汇总与异常信息保留结果 JSON。没有削弱断言或修改 src／旧 helper。

## 可复跑命令

```text
node docs/design-drafts/world-infected-001/entry-006/validation/run-native-probes.mjs --repo <仓库绝对路径> --out <仓库外新临时目录>
npm run validate:architecture
git diff --check
```

runner 拒绝仓库内输出，不自动安装工具。生成的 TS／配置／日志不进入 src 或 CI；.template 不是生产测试文件，本轮生产 suite 新增0项。本轮完整 npm check／test:run、typecheck/build、旧72样本 NOT RUN；输入中历史252/4369及CI160不替代本轮结果。

## 下一工程必须真实执行的验收（本轮 NOT RUN）

| Gate | 最小实际验收与故障 |
| --- | --- |
| 基础安全提示／ready | 稳定snapshot、StrictMode零玩法；blocked回调后最终ready；unknown医疗不探测；新旧草稿与异常；D1仅采纳后实现 |
| 浏览器启动／保存 | 真空槽→reservation→createFirst→出发→五停点刷新；初次／后续写失败；元数据缺失／交叉／坏档；已有current禁止重读覆盖 |
| 多标签 | 竞争首开、锁未获、主页面关闭／崩溃、BFCache、无API／隐私模式；第二页0创建／写入，不能用domain测试替代 |
| 首玩UI | 显式九种初选组合；真实工具／普通替代、任务放置和资源竞争；三敌、四终局；保存故障、冷恢复、无后继 |
| Owner体验 | 正常玩家信息先自由玩，再比较一次完成／合理撤退／主动分段／连续分段；观察重复赶路、材料与医疗负担，不预设胜率 |

工程交付、路线可达、Owner体验和公开发布分别记录。不让自动测试或内部 HP ledger 关闭 Owner Gate；不把全样本失败吞成成功，也不因死亡吞后续程序错误。

## DOC-WORLD-ENTRY-006：验收责任仍按接缝推进

批准与技术定稿不等于浏览器或体验 PASS。真实启动／保存／五停点刷新／单 writer、分段突破和九组合 Owner 复审仍待后续工程。本轮只新增 T01 工具证据，不复写原十项 native probe、72 样本或旧失败记录。

依据：[DEC-053](../../../05-design-decisions.md#dec-053)、[同范围后继正式合同](../../../engineering/world-integration/preplay/batch-plan-v1.0.md)。本轮文档与 T01 交付仍待准确 SHA 实审；批准／定稿不等于生产或体验验收。
