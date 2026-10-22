# ENG-WORLD-PREPLAY-FOUNDATION-001-R1 准确 SHA 专项复审 v1.0

结论：**PASS — R-M01关闭。** 基础准备可作为后续浏览器 owner 工程起点；不是浏览器、玩家入口、UI或Owner体验PASS。

## 1. 锁定事实与审查性质

- 仓库：lvlw/elevator-survival。
- 受审完整SHA：`bc60f24cc16625a25ad56b0b917da63b16f29f56`。
- 父SHA：`cc147cd253f3e7e57e45de265610becb64a74821`；tree：`875f04ad8018f48df9b248fc19317d35e48798a0`。
- 远端 `feature/world-preplay-foundation-001` 在本轮读取时指向受审SHA。
- 主线实际读取commit、compare、三份本轮生产实现和三份新增测试、作者R1追加记录，以及下批正式浏览器合同／当前真实S接口。不是仅依据完成报告。
- 当前源码工作区是否干净、其他23分支是否未变、作者1562保护对象及888被测指纹的完整审计，仍是作者证据；主线没有直接读取Owner本地磁盘。

## 2. R-M01为何可以关闭

`src/core/residence-task/sample-protection.ts`是最小内部纯事实owner。它保留原两方法索引、配置风险选择、实际装备厚外套、integrity正数及确实降低风险的条件；只返回冻结的新结果，不修改／冻结调用者、不签发计划、不抽签、不消费资源。

`shared-actions.ts`在原资格校验后读取该事实，仍由原`consumeCommittedResource`实际支付。来源创建、完整候选检查、随机draw、身体行动和最终签发保持原先位置。没有把外套变成提取的必要条件。

`player-metadata.ts`仅在真实sample任务且方法明确时读取同一事实的payment，再复用原`previewCommittedResourceAction`生成既有公开支付字段。内部risk未spread进DTO，真实instanceId只在私有查找中使用，不输出给玩家。正常／最后1点支付1，耗尽／未装备不伪造支付。

两旧宿主源码已按Git blob校验。撤掉本次明确的窄抽取／投影差异后，其余完整字节恢复到父提交归档源码；这证明修改范围，没有把静态等值说成完整原生行为证明。

## 3. 实际测试阅读

完整阅读：

1. `src/core/residence-task/sample-protection.test.ts`：10项，双方法、正常／末次／耗尽、无装备、保护不降低风险及调用者不变。
2. `src/core/residence-supply/player-metadata-payment-review.test.ts`：18项，真实初配／CTB胜利／H5提取，原物和ItemState守恒，工具／门卡／维护／充电／武器相邻支付。
3. `src/state/residence-session/player-payment-review.test.ts`：15项，companion／controller预览、明确提交、两种失败保存／retry、非法放置／陈旧／跨会话选择和隐藏状态／相反draw配对。

这些源文件共43项，与作者报告净增一致。无外套测试把原外套移入背包并通过完整聚合，没有删除来源或声称已有玩家换装按钮。末次／耗尽等TEST边界与真实路线分开。保存失败后retry仅保存，不重扣外套、不重发sample、不重复通知。不同隐藏事实配对使用同公开病程档；相反draw是条件见证，不包装成默认种子实验。

作者修前原模板10项中6支付断言失败、修后10通过；8组原生完整snapshot／draw golden及最终270文件／4487测试为作者原生证据。本轮主线未原生重跑它们。

## 4. 主线独立执行

容器Node v22.16.0；将连接器读取的准确源码落入隔离目录并核对Git blob。执行时仅去掉TypeScript类型与import，三个模块函数体原样执行，外围配置／资格／来源／身体／资源算术／draw使用明确的TEST适配器。

| 执行 | 结果 |
| --- | --- |
| 原8项，父提交原样模块 | 4符合／4支付漏报；exit1；0非预期异常 |
| 同8项，修后原样三模块 | 8符合／0不符；exit0；0非预期异常 |
| 内部owner 16项边界 | 16通过；exit0；0非预期异常 |
| 外部变异：删sample支付投影 | 原8项中4个支付断言失败；exit1 |
| 外部变异：耗尽仍支付 | owner 16项中2个业务断言失败；exit1 |

16项覆盖正常／末次／耗尽／无装备、错误装备定义／资源种类、保护相等／更差；与原8项有重叠，不把24当作24条新原生玩法用例。8项修前／修后所观察的源分支资源结果／资源调用数保持，查询无所监测的生产调用，输入不变。未覆盖完整Zod聚合、真实CTB、facade／S、存储、浏览器或Owner操作。

源码指纹：

| 文件 | Git blob |
| --- | --- |
| sample-protection.ts | aa377b625729fe07cc22f5d947a91348c13656f8 |
| shared-actions.ts | 3089eec30f0f9dbd57376a5e65eac3672d85c98a |
| player-metadata.ts | b1646df1816d788ece487018c50f8e4a6f5cbfef |

可复现材料放在同名review ZIP的source与evidence中，脚本、原结果、负控和局限均保留。容器直连GitHub请求失败于DNS，本轮未取得可执行完整仓库，不声称主线npm全量通过。

## 5. 原件、范围和CI

从实际R1任务ZIP字节重算：14件输入、13条SHA-256全部匹配；完整Git目录tree为`b62077c837fc8a24b9ff5fac42c96eeb6de5e20d`，与准确提交`foundation/r1-inputs`一致。

GitHub compare为ahead 1、29路径，均在R1任务许可中；仅两个既有生产宿主修改、一个新纯owner，旧controller／安全三态／D1／G1/G2／S/domain／codec／批准配置和旧测试未出现在差异中。文档保留BLOCKED／RESUME-01，R1以附记及新JSON对象记录。没有独立整套复跑作者链接、所有历史前缀、1562保护文件及全部空白检查；不据此宣称本机完成这些命令。

准确SHA CI164（run39785580346）已是completed/success，job119847770365的architecture/typecheck/test/build四阶段均成功。本轮读取运行元数据及步骤，不重新下载完整日志统计4487项。

W01为原两文件七处；W02为原基础任务书第249行EOF空白。已批准例外保留，R1新增差异应为exit0；累计真实exit2不能改写为全部干净。npm audit镜像404仍UNCONFIRMED，不由CI绿色推定漏洞安全，也不顺手升级依赖。

## 6. 下一步与未通过事项

可在单独任务中实施已定稿的browser-owner-contract-v1.0：真实DEV隔离composition、候选外初始化材料、prepared expected/text窄交接、单checkpoint、Web Locks和真实浏览器验证。须从本准确SHA新建工程分支，重新跑默认基线，完成后保存接缝停审。

本复审不批准新玩法／新格式迁移／清档／第二委托／O3；不提前进入低资产UI。正式合同已授权的细节由下一任务在明确路径内完成，不需要Owner逐字段决策。

主线检索来源均为本repo准确SHA：commit／compare、sample-protection.ts、shared-actions.ts、player-metadata.ts、上述三测试、作者foundation记录、CI164运行及步骤、browser-owner-contract与现有combat-session/composition/persistence/expectation。该报告没有把隔离测试、作者测试、CI和历史记录相加为新增验证。
