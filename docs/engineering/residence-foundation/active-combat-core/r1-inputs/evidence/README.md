# E02-P 定点实审材料说明

本包复现材料不是完整仓库，不是原生测试已执行的证明。

## 已执行的隔离检查

在仓库外的包工作副本中运行：

```text
node evidence/run-isolated-review.cjs
```

需要现有TypeScript包（脚本先尝试普通require，再尝试主线环境的全局路径）。不得为此新增项目依赖；在其他环境可只在外部工作副本调整TypeScript加载位置并记录差异。脚本会写同目录isolated-results.json，所以不要在已归档原件目录直接运行。

三个source文件的Git blob校验先于执行。原脚本预期输出20项中12符合／8不符，exit1，无程序异常。外围依赖替换及TEST数据形状全部在脚本中可查；不能将此计为完整P实现或原生恢复实测。

## 必须先跑的原生模板

复制`native-review-regression.test.ts`到任务许可的`src/core/residence-combat/review-regression.test.ts`。主线只做语法转译，没有原生运行；Codex按原任务现有Vitest执行，记录真实首跑。

模板实际调用content→初配→出发→移动→旧CTB新profile组合。风险使用既有可注入入口的合法上界值，以稳定无新增伤口的对照；不stub战斗求值／效果应用／死亡清算。20项对应隔离ID，但不能要求为了匹配主线8个不符而弱化其他原生校验。

导入、类型或fixture前置失败必须单独记录并修正到能真实到达待测接口，不算语义检出。保留模板归档原文，仓库测试修订与理由另记。修后扩展为真实三敌和多次响应／退却／死亡／旧历史回归，不需Owner逐项确认。

## 计数

- 主线隔离20是本轮独立检查。
- 原生模板20是尚待Codex执行的建议回归，不追加为主线已执行。
- 原始作者102与CI复跑保持不同证据来源，不与以上重复累计。
- input-integrity.json记录原工程ZIP五件输入对Git blob；不是全仓库审计。
- ci-observation.json是读取摘要，不是下载的原样完整日志。
- isolated-stdout.json用JSON字符串无损包裹实际stdout并附原字节摘要；未裁掉原输出行尾空格，不新增归档空白例外。
