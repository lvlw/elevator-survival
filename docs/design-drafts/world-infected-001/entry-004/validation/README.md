# WORLD-ENTRY-004 验证边界与复跑

A类：`check.py`与JSON是隔离有限Draft模型，productionCalls=0；不会调用或替代正式游戏规则实现。B类：`native-api-probes.mjs`直接加载当前TS源码，使用已有隔离test-fixtures作输入，调用G1/G2/A/B/C和旧纯模块；没有执行生产测试runner或注册内容。两类分别统计，不相加。

## 可复跑命令

从仓库根目录运行，OUT1/OUT2选不同仓库外目录，Python仅标准库；Node使用当前安装版本内置类型转换与临时loader，真实源码依赖使用现有node_modules，不安装包。

```text
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --out <OUT1>/results.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --out <OUT2>/results.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control source-duplication --out <OUT1>/negative-source.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control terminal-reopen --out <OUT1>/negative-terminal.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control double-body-cycle --out <OUT1>/negative-cycle.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control hidden-data-leak --out <OUT1>/negative-visible.json
node docs/design-drafts/world-infected-001/entry-004/validation/native-api-probes.mjs --repo-root . --out <OUT1>/native-api-results.json
npm run validate:architecture
```

正套件两个独立进程exit0，结果原字节相同；四负控应exit1且有对应语义失败，不是启动异常。Node临时加载API有experimental提示，保留真实stderr，不等同语义失败。实际命令/退出码/哈希在[checks](../checks.json)。

## Oracle、分层与检测器

| 覆盖 | 独立预期依据 | 检查范围／没有证明 |
|---|---|---|
| 批准配置 | 输入清单原件摘要+正式配置叶数34+4 | 字节只读，不是另一配置 |
| 能量、四终局、空步骤、截止 | DEC-049/050/051；手写expected字段 | Python模型镜像只属有限一致性；原生另证 |
| 图、来源、任务资格、真实格位 | 原03/06/D01及手写固定动作 | 不穷尽所有路径；种子case不是生产者 |
| 消费与工具/九组合 | D03/D04的明确条款，手写结果 | 只验证单目标维护；完整多目标恢复池未模拟 |
| 四条路线 | 固定地点/动作/显式旋转；成功条件独立写定120/H0 | combat动作的CTB/HP/磨损是**外部测试条件**；没有真实战斗/RNG可达性证明；装备仅隔离资源字典，非完整生产ItemState恢复 |
| 语义拒绝 | 指定Reject码+基态canonical逐字不变 | 普通Exception记modelError/mismatch，绝非预期拒绝 |
| unsupported | 当前源码拒绝或明确未实现声明 | 单独计数，不算实现PASS |

局部seedItems可将若干单位放入抽象quick域以只验效果/来源；不代表生产双快捷位容量、单单位和装备联合schema已经通过。固定路线只用初始一份快捷绷带，其他拾取按背包格位验证。活pending读档在有限模型中仍属unsupported，不把其拒绝当永久玩法。

测试参数就在fixtures：战斗条件数值、局部初始HP/E/物资/地点属于隔离输入，不能移成运行时默认。输出记录动作前后E/HP、D/T、感染条件、来源、物品格位/归属/处分和任务进度；这些内部诊断数据不得直接交玩家。

source-duplication在grant允许同来源多签单位，命中`source-once`；terminal-reopen在closed检查前把终局改回active，命中`closed-reopen`；double-body-cycle在正常返回后偷扣HP并加D，命中`normal-empty-cycle`；hidden-data-leak在安全投影添加隐藏感染精值，命中`hidden-pair`。都改变真实判定语义，不是加未知JSON键。

## 冻结与收据

[freeze-manifest](freeze-manifest.json)列正文、候选、脚本、夹具、输入及只读参照摘要。排除results/native/negative输出、freeze自身、checks/completion自引用。最终改动后冻结，复跑后核对所有摘要；两个正套件在独立进程执行，所有输出无时间/绝对机器路径。运行时间/实际路径只在checks回执。

修订前原生加载失败、错误聚合传参及错误预期代码分别保留在checks；模型构造路线时的格位错误也记入completion。不改历史175/213/269及旧输出哈希。起始/最终生产全套NOT RUN，新增生产测试0；无浏览器、人工体验或长期经济模拟。
