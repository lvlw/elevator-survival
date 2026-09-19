# 独立纸面核算附件

> 非生产代码、非正式resolver测试、非存档恢复验收、非Owner试玩。保留历史ZIP原始字节，不接入 `src/`、`tests/`、npm scripts或CI。
> 本次打包仅验证文件SHA-256、ZIP结构和CRC；没有重跑其中脚本，未增加任何游戏通过结论。

| 原始包 | 脚本入口（解压后） | 历史证据范围 |
|---|---|---|
| [物流](logistics-work-area-v0.1-checks.zip) | `paper_encounter_check.py` | 指定CTB与路线算例，不是随机胜率。 |
| [通信](communication-terminal-v0.1-checks.zip) | `run_checks.py` | 指定战斗、逐动作路线、拒绝断言及限定多日账。 |
| [整局反例](full-world-counterexample-v0.1-checks.zip) | `audit_checks.py` | 包含规则缺口前停止及显式敏感性假设，不是全部通关。 |
| [跨日重访](cross-day-revisit-v0.1-checks.zip) | `revisit_checks.py` | 原先候选生命周期下的接续；后来获确认不改写旧结果时态。 |

各包的README/源码/输出共同说明前提。需要复跑时先检查脚本，在独立临时目录解压运行并另存新的输出，禁止覆盖历史ZIP及原始输出；不得把新的复跑结果写成生产测试或Owner体验通过。若环境或路径不具备运行条件，报告NOT RUN/原因，不为归档扩展模拟器。

完整性清单见 [attachment-manifest.json](attachment-manifest.json)。其路径相对上一层 `small-world/` 根目录。

部分ZIP包含其当时报告副本，这是原始检查包自包含输入，保留不改；它不是新增一份现行规则。正式有效性按上层 [资料入口](../README.md) 与DEC判断。
