# ENG-RESIDENCE-TERMINAL-001（A）作者完成报告

本报告随代码提交；自身最终 commit SHA 尚未产生，最终 SHA、父／tree、远端回执在提交后消息提供，不为自引用 amend。

## 基线与 W1—W4

- 准确起始 `6438f7a38939297225538cdd68af24201ed7d34f`；父 `c67fd4117065e2e0dbd1117cae4fbfaa83791599`；root tree `2afeb4504960b23585f5eb9b718473e2b3e4d161`；src tree `4d28340ad020950e90bbbed1dc0b902a7f6880db`。
- 实际入口 `feature/design-world-entry-003`，工作区／index 干净。按授权创建 `feature/residence-terminal-core-001`；只向 origin 同名分支普通提交推送，不修改 main、设计或旧工程分支。
- W1：生产前设计、包原字节、唯一4值受控配置、最小归属模型、信任边界完成。
- W2：正常成功／主动失败、期限生还／死亡、真实 G2 移动／揭示／A-C休整死亡消费完成；G1 空步骤、死亡有序短路与一次 revision 保留。
- W3：实例/资源/全域归属、既成交付分源、收据与唯一余额、真实两声明成功／旧罚后死亡、严格反例和独立调用计数完成。
- W4：定向／完整 check、接口与规则反查、修订及文档完成；提交前保护审计与提交后 Git 核验按任务执行。作者检查不是主线准确 SHA 实审 PASS。

## 测试与验证

| 检查 | 实际结果 |
| --- | --- |
| 起始 npm run test:run | 124 files / 2791 tests，exit0，63.10s |
| 最终指定定向命令 | 27 files / 772 tests，exit0，9.70s |
| validate:architecture（check 内） | PASS，51 DEC / 257 core production files |
| typecheck（check 内） | PASS |
| 全量 test:run（check 内） | PASS，133 files / 2947 tests，48.31s |
| build（check 内） | PASS；Vite chunk>500kB 提示保留 |
| npm run check | PASS，exit0 |
| 新增／替换／删除／净增 | 156 / 0 / 0 / 156；新增9测试文件 |

源指纹、输入摘要、范围、四文档前缀、全部834旧跟踪对象与 diff 检查见 [verification-results.json](verification-results.json)。9个旧文件的既有检出行尾不同于 blob，但 Git 对象与基线一致；没有修改它们。失败／修订轨迹见 [implementation-notes.md](implementation-notes.md)。

T01—T12 的实际 API／测试定位及正常返回／期限／G2死亡独立计数完整列在 [contract-and-support.md](contract-and-support.md)。正常和期限 A 内：G1=1、G2=0、draw=0、terminate=1、完整计划=1、IO=0。G2死亡先由原生产者签发，A增量 G1/G2/draw=0、terminate=1、计划=1、IO=0；随机揭示此前draw=1，休整此前G1=1，均不重放。终局额外revision=0。没有会话，未冒称真实内存提交或保存。

## 实际文件集（34 / 最多36）

新增代码／测试21项：

```text
src/core/residence-terminal/types.ts
src/core/residence-terminal/validation.ts
src/core/residence-terminal/config.ts
src/core/residence-terminal/config.test.ts
src/core/residence-terminal/authority.ts
src/core/residence-terminal/plans.ts
src/core/residence-terminal/dispositions.ts
src/core/residence-terminal/settlement.ts
src/core/residence-terminal/controlled.ts
src/core/residence-terminal/queries.ts
src/core/residence-terminal/index.ts
src/core/residence-terminal/test-fixtures.ts
src/core/residence-terminal/terminal.test.ts
src/core/residence-terminal/terminal.integration.test.ts
src/core/residence-terminal/validation.test.ts
src/core/residence-terminal/history.test.ts
src/core/residence-terminal/step-semantics.test.ts
src/core/residence-terminal/authority.test.ts
src/core/residence-terminal/queries.test.ts
src/content/infected-terminal-core-v0.1/config.ts
src/content/infected-terminal-core-v0.1/config.test.ts
```

既有文档4项仅末尾追加，完整保留基线字节前缀：

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

本目录新增9项：contract-and-support.md、implementation-notes.md、verification-results.json、completion.md，以及 inputs 下原任务书、授权范围、文档实审报告、BASELINE-AND-INPUTS.json、SHA256SUMS.txt。未使用两条可选旧身份测试修改权限。

## 配置／边界／停止点

- 批准120／0／2147483647／20逐键一致，旧G1全部34值、configurationId、规则参数未变；无新玩家rulesVersion，无Save schema/format变更，无依赖更改。
- 首身份、G1/G2生产、G3/G4会话／保存、原测试、正式DEC／合同／JSON、AGENTS、构建／CI均未修改；新core不依赖state/content/UI，不接熵源、IO或测试工厂。
- 无已发现的规则冲突。普通测试内容仅供消费资格与历史组合，不注册真实第二委托或五图任务。
- B/C、真实内容桥、出发前新任务衔接死亡、CTB医疗、钱包交易、玩家入口／浏览器存档、Owner体验 NOT RUN；O3 OPEN／未决定。这些是明确范围外，不是本批完成项。
- 本地作者验证完成后仅按授权正常 commit/push 本工程分支；不 merge/rebase/amend/force-push，不关机／重启／定时。提交后停止，等待 WebGPT 主线准确 SHA 源码实审，不自动进入 B/C。

CI 的实际状态另在提交后查询；未取得结论不得称 CI PASS。输入审查报告的受审对象仍为6438f7a，不回填本工程为既有主线PASS。
