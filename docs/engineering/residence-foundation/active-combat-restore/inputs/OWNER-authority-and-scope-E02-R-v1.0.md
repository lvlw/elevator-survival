# E02-R 权限与范围记录 v1.0

本文件由WebGPT主线依据Owner此前对DEC-052方向、受控新格式及分批任务的批准，以及直接下发完整Codex任务书的明确权限编制。它不是新玩法DEC，也不冒充Owner逐字原话。

- 任务：ENG-RESIDENCE-COMBAT-RESTORE-001（E02-R）。
- 基线：`9ada1bd76c768b7bcff676b263e4533854064909`，父`8512c991adb353775ffa4785599a011e419a81fa`，tree`8a0c09f43fb3be66a2ff07cf64b928aa6e1a7862`。
- 前置：E02-P-R2专项实审PASS，见同包准确SHA报告。
- 新工程分支：`feature/residence-combat-restore-001`；不在P分支交付。
- Goal：独立v4严格聚合／编解码、候选外expected、五类完整边界、真实P恢复后接续、旧格式互拒与零规则重放。
- 允许一次完成W1—W4、详细设计、实现、正反例、组合、负控、自查修订、检查和报告。
- 允许新工程分支普通commit／push；不允许合并／推main、其他旧分支写入或强推。
- 许可路径为任务书35条最大集合；不要求全部创建。
- 对旧实现唯一可选窄例外是`src/state/residence-save/supply-history.ts`的无语义历史断言抽取及新共享helper。旧入口／schema／codec／expected／普通接口及全部旧测试仍原字节保护。不得据此放宽旧来源。
- 不修改P纯核心、F01/F02/F03、G1/G2/身份、批准规则参数、依赖／CI、任何旧技术格式。
- 不执行E02-S、E03、current、真实存储、浏览器、多标签、UI、O3、商城／身体服务／新真实委托。
- 完成后立即提交准确SHA等候WebGPT恢复接缝实审；本项权限不自动延续到下一项。
