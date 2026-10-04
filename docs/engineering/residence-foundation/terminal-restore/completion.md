# ENG-RESIDENCE-TERMINAL-RESTORE-001（B）作者完成报告

## 基线与交付身份

- 起始 HEAD：`bfc6bd973eeb306df1e8ee916b2160c30b757cdf`；父：`6438f7a38939297225538cdd68af24201ed7d34f`；tree：`8429346ed7e1e42cf383f68d859c08801c84908e`。
- 入口 `feature/residence-terminal-core-001`，工作区／普通 diff／cached diff 均空。核对原件、远端和实际文档后创建 `feature/residence-terminal-restore-001`，从未在 A 分支写本批成果。
- 真实基线：本轮实际 `npm run test:run`，133 files / 2947 tests，exit 0；不是引用父项历史成绩。
- 本报告在普通提交前形成，不回填自己的 SHA 或二次 amend。最终完整 commit／父／tree、push 退出码、ls-remote 和干净工作区在最终消息及仓库外 Git 收据中提供。

## W1—W4

W1 先记录详细设计；W2 完成独立八值／一值入口、四态聚合、严格 v2 字符串 codec、独立 expected；W3 增加六文件 188 项原生测试；W4 完成自查修订、定向／全量、原件与旧对象保护审计及文档收口。实现不是主线 B 准确 SHA PASS，停止等待恢复接缝实审。

### 完整文件集（28 条）

新增生产八项：

```text
src/state/residence-save/terminal-types.ts
src/state/residence-save/terminal-policy.ts
src/state/residence-save/terminal-validation.ts
src/state/residence-save/terminal-history.ts
src/state/residence-save/terminal-expected.ts
src/state/residence-save/terminal-codec.ts
src/state/residence-save/terminal-controlled.ts
src/state/residence-save/terminal-index.ts
```

新增测试六项与专用辅助一项：

```text
src/state/residence-save/terminal-test-fixtures.ts
src/state/residence-save/terminal-save.test.ts
src/state/residence-save/terminal-aggregate.test.ts
src/state/residence-save/terminal-history.test.ts
src/state/residence-save/terminal-expected.test.ts
src/state/residence-save/terminal-compatibility.test.ts
src/state/residence-save/terminal-purity.test.ts
```

四份既有文档仅末尾追加，不改原前缀：

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

新增本批报告和原件九项：

```text
docs/engineering/residence-foundation/terminal-restore/contract-and-support.md
docs/engineering/residence-foundation/terminal-restore/implementation-notes.md
docs/engineering/residence-foundation/terminal-restore/verification-results.json
docs/engineering/residence-foundation/terminal-restore/completion.md
docs/engineering/residence-foundation/terminal-restore/inputs/ENG-RESIDENCE-TERMINAL-RESTORE-001-task-v1.0.md
docs/engineering/residence-foundation/terminal-restore/inputs/OWNER-authority-and-scope-terminal-B-v1.0.md
docs/engineering/residence-foundation/terminal-restore/inputs/AUD-bfc6bd9-ENG-RESIDENCE-TERMINAL-001-review-v1.0.md
docs/engineering/residence-foundation/terminal-restore/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/terminal-restore/inputs/SHA256SUMS.txt
```

### 实际结果

四态 fresh-hub／active-world／living-hub／dead 均经真实字符串编解码。fresh 由真实首次事实建立，active 经 G1 出发、正式使命激活和 G2 现场建立；正常成功／主动失败、期限生还／死亡及 G2 动作／休整死亡消费真实 A 输出。Day1/Day7 正常返回保留 steps=[]，dead 可保留 active clock，死亡到达的被动 archive pending 不被误拒绝；活人 pending 仍拒绝。

旧成功／旧失败→真实第二测试声明出发→active→死亡的旧记录逐项保持；另测期限 ready 后 D8 出发，不多走一天。两声明仅为隔离夹具，未注册新的玩家内容。来源与实物、钱包、历史及最新身体事实联合校验不抽样、不补物、不补账、不重放。

独立 expected 是强制完整同进度输入，逐委托复用原严格 restore，再比较完整聚合；合法冷值不等于已有 current 的替换权。测试明确展示内部自洽离线篡改可能通过 cold，但必须被独立 expected 拒绝，不冒称本地防回滚。旧 v1 双向版本拒绝、七值导出及原 closed unsupported 保留；新普通八值／受控一值均精确断言。

B01—B12 的 API／测试映射完整列于[支持合同](contract-and-support.md)。

## 独立计数

`terminal-purity.test.ts` 在真实夹具构造后独立清零 24 个 spy，再执行两次序列化／解码、envelope 与 warm 校验。

| 场景 | 构造阶段独立实断言 | codec 阶段 |
| --- | --- | --- |
| fresh | establishMissionFact=1，activate=0 | 24 项全部 0 |
| active | establishMissionFact=1，activate=1 | 24 项全部 0 |
| 正常返回 | terminate=1，issueTerminalPlan=1 | 24 项全部 0 |
| 期限返回 | terminate=1，issueTerminalPlan=1 | 24 项全部 0 |
| G2 随机揭示死亡 | terminate=1，issueTerminalPlan=1，drawIntInclusive=1 | 24 项全部 0 |
| 两声明历史 | terminate=2，consumeResidenceLocationDeath=1 | 24 项全部 0 |

这些构造数字只列测试明确断言的入口，不推称每个构造函数都是零。24 项包含 G1/G2/A 规则与工厂、四个实际随机 draw、owner 工厂、Storage get/set/remove/clear。纯 cursor／来源 ID 值构造不是 draw。B 无提交／通知接口；公开 API 与依赖扫描也确认未接 owner，不用不存在的真实会话假装执行保存失败测试。

调用方可变输入不被修改或冻结；结果深冻结、重复编码稳定、解码等价；克隆出来的计划不能恢复 G2/A 的签发权限。

## 实际测试与检查

| 命令／检查 | 实际结果 |
| --- | --- |
| 开工 npm run test:run | 133 files / 2947 tests，exit 0 |
| 任务规定的八目录定向回归 | 33 files / 960 tests，exit 0 |
| residence-save 最终 JSON 报告 | 8 files / 249 tests，exit 0；其中原 61 项，新 188 项 |
| npm run check | exit 0：architecture、typecheck、test:run、build 均通过 |
| 最终全量 | 139 files / 3135 tests |
| 架构统计 | 51 DEC / 257 core production files（原脚本口径，未新增 core 文件） |
| 测试变动 | 新增 188／替换 0／删除 0／净增 188；新增测试文件 6 |
| diff 检查 | 普通、cached、相对起始 SHA 检查通过；最终暂存／提交另以 Git 收据记录 |

新增分布：save 52、aggregate 58、history 53、expected 12、compatibility 4、purity 9。原身份 103、cold 23、A 156 及 G1—G4 回归全部保留于实际定向／全量运行。构建成功但仍报告 >500 kB chunk 提示，不改打包配置或阈值。

### 失败与修订

曾有测试夹具把 stack 数量 3 放入单件快捷位（1 fail / 167 pass），修正夹具而非规则；曾有 Node fs 类型导入失败，改为现有 Vite raw glob。自查先复现 4 fail / 100 pass，补齐 B 的周期连续性、期限精力与最新身体事实联合检查后全部通过；详细过程见[实施记录](implementation-notes.md)。未改旧测试 expected 来迁就输出。

## 审计、限制与停止点

原始命令日志、JSON、文件摘要及范围／链接检查放在仓库外 `C:/Users/zjl/AppData/Local/Temp/residence-terminal-b-audit`；[验证记录](verification-results.json)保留实际摘要，不伪造未保存日志。五份输入保持原字节；四条给定 SHA 和三条给定 Git blob／大小复核；四份共享文档保留 Git 和工作区完整原始字节前缀。CRLF 工作区与 LF Git 对象分别记录，不更改 Git 行尾配置。

没有玩法规则冲突；A、首身份、G1/G2/G3/G4、旧 v1、旧测试、AGENTS、DEC、配置、依赖／lockfile、CI、UI 与素材均未修改。新增源码与测试在最终检查后不再修改，暂存和提交对象与实测快照逐项核对。远端与提交最终身份由收据记录，作者检查不冒称 CI 或 WebGPT 主线 PASS。

未完成／NOT RUN：B 主线准确 SHA 恢复接缝实审；C 及其 current 安装、真实保存故障／重入；浏览器、多标签、玩家入口、五图生产者、战斗医疗、商品服务、专长／工具箱、O3 发布及 Owner 试玩。它们不是本批代码未收口的功能，不自动开始后续工程。不 merge，不推 main 或旧分支，不 force，不关机／重启／定时，不替换 Project Sources。
