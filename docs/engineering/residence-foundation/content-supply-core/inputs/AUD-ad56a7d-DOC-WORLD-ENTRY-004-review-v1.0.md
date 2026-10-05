# DOC-WORLD-ENTRY-004 准确 SHA 文档实审 v1.0

审查日期：2026-10-05。结论：**PASS（本次文档归档限定范围）**。无需文档返修；可据已批准的首契约另行下发 E01-P 工程。本报告不是 E01-P 的执行任务，也不是生产实现／完整世界或 Owner 体验通过。

## 1. 准确对象与最新停止点

| 项目 | 已读取的仓库事实 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 最终提交 | ad56a7d9dfc08e38f966f20cf7e07c71c08c09dc |
| 唯一父提交／任务起点 | 612ac6673223cc93237184892e6713e789a9dce1 |
| 最终 tree | 1b2ec7efe6556c4e4254b089a48d3ddb019db2d3 |
| 远端设计分支 | feature/design-world-entry-004，读取时指向最终提交 |
| main | a76e9c1c998051fc1643b6e0c3d53443fa55feed |
| src tree | 98c840dd0b6b1a6cc014df4ac9165bc94bf2c794，与已审 C 一致 |
| 提交范围 | 44 条文档路径；24 既有文件增加内容、20 新文件；+7447／-0 |

GitHub commit、compare、根 tree、正式目录和分支引用均实际读取。比较为 ahead 1、behind 0、唯一父提交正确；44 条路径与原任务白名单对应。既有文件为 DEC 追加、10份末尾附记和13份顶部附记，不能把其历史段落仍写“待采纳”误判为当前未批准。

用户本地 HEAD、status、暂存区及实际 push 过程为作者交付证据；主线没有访问 E:/projects 或用户磁盘。主线独立确认的是远端引用和提交对象，并非本地状态。本次没有合并、推送或改写任何仓库分支。

## 2. 批准依据与内容阅读

已完整阅读挂载原任务 ZIP 中的任务书、Owner批准、采纳稿、确定载荷及核验脚本；该原包不是从作者完成报告重建。正式依据为已批准 DEC-049／050／051，加本次精确归档的 DEC-052，以及三份 content-supply／world-content 契约。后续代码位置的定点阅读只用于首工程准入安排，不冒充本轮新源码审计。

本次新增内容成立的边界：

- 103键／193整数叶是首轮试用，非经济或战斗平衡冻结；原38项配置不改。
- 五图24节点／29双向连接及声明动作进入限定内容资料；不等于玩家入口或生产格式已注册。
- H2随机以 choices／weights／unit 决定一支；排除 grant.H2-random 固定载荷，不能额外赠送消毒剂。旧模型显式抽签条件不是生产输入。
- 初配只有管、外套、一件选择工具和快捷绷带1，无初粮；专长本次驻留锁定，生存首绷只一次。
- 样本谨慎／直接两种方式均保留。旧模型只验证谨慎＋外套不构成禁用直接提取的规则。
- E0合法稳定药食不额外触发付费动作流血；维修／充电仍须付费资格和材料。
- 正常H0身体 steps=[] 保持；死亡步骤按真实来源严格验证，新医疗／来源分支不得全面放松旧G2单调伤害验证。
- E01-P纯领域值、E01-R严格v3编解码、E01-S唯一current分别停审。v3目前只是已定文档定位，活战斗格式及O3未决定。

## 3. 主线独立字节／Git对象核对

实际运行 `evidence/verify_objects.py` 对原件和远端对象作26项检查，全部匹配。该脚本不执行游戏规则或 npm；远端期望指纹从本轮实时 GitHub 读取，附件提供可复核的记录。

### 3.1 原件目录

将原 ZIP 的全部13件按 Git blob/tree 算法重算，完整目录树为：

`b1a2ff48765ae3f51aa2a56a06d29d4dbdd26ad2`

与最终提交 `docs/design-drafts/world-infected-001/entry-004/adoption/inputs/` 的目录对象一致。包内12条SHA-256也全部匹配。此项覆盖原件完整内容和目录组成，不只是抽样段落或作者自报摘要。

### 3.2 正式整文件与DEC全文

| 正式文件／对象 | 主线重算 Git blob |
| --- | --- |
| infected-world-entry-test-config-v0.1.json | 40ba0e3edd1a13843e40be5f8d420bef6afeb8f0 |
| infected-world-entry-content-v0.1.json | dece5112e546af127943f846d7003e384ff97a21 |
| content-supply-core-contract-v1.0.md | 4b31a312bcad79d5b5a9de99706433ba34316b53 |
| content-supply-restore-contract-v1.0.md | 726dcb8d67e0a7b7f78daa13853319143b642e0d |
| world-content-batch-plan-v1.0.md | 1f6ef2d8df467b19c439cdd6e34f9941561052d9 |
| 旧DEC全文 | c739151493cd8b5e46e03d25008ea0fb128c3e14 |
| 旧全文＋两个LF＋DEC-052载荷 | 9daf6f1b3c9d0aaf4d752b7d3e4701403d45be10 |

所有整文件对象均与最终远端对象一致。DEC最终275572字节，旧001—051正文没有被本次追加倒改。旧DEC原件取自此前挂载的审查附件，先核对其完整blob与本轮基线已知对象，再参与拼接；不是未经验证地信任旧附件。

另外对已匹配载荷解析得到103键、193整数叶、H2无固定grant、5地图／24节点／29连接。完整载荷指纹证明正式数据未偏离确定载荷；本轮没有再次下载完整历史 candidate JSON 去独立重做其所有数值溯源。

## 4. 入口同步及保护范围

读取了新增DEC全文、三份正式契约、作者完成报告及提交差异中的规则／状态附记。附记将“局部已采纳、纯核心待实现、R/S后续、E02/E03及O3仍保留”分开；没有把有限模型字段、外部战斗结果、历史测试数量或草案来源说明升级成新默认。

比较接口列出的44路径均在原白名单；无删除、源码或依赖改动。src根对象独立保持原C，根目录package、lock、scripts和AGENTS对象未变。23份入口的前插／追加形式由实际diff核对；主线没有在自己的 Git worktree 对930个对象和23份全文前后缀逐件重跑作者检查。

作者所报198处链接、31处锚点、架构52 DEC／257 core、diff三阶段及930保护对象通过，保留为**作者证据**。主线没有复跑整个作者脚本、架构或链接套件。两份作者报告的换行处理不涉及原件字节豁免。

## 5. 首工程接缝与适用说明（不增加玩法）

已定点读取当前G1 action／body校验、G2 catalog／location／movement、A settlement／history校验和现有content目录：

1. G1主要effects只接损血／暴露，不是医疗任意后态入口；新的合法恢复不能靠负healthLoss或放宽普通接口完成。
2. G2旧catalog有固定／均匀choice、定向边和到达surface知识；新加权／成对来源、不同工具方式和调查后才揭示的C5边需明确受控接缝，不能提前公开隐藏边或绕过真实工具／任务前置。
3. A旧实物处分按完整实例且全域ID唯一；部分消费必须有新的来源份额联合协议，不能删历史、补回已经吃掉的单位，或假装旧B已能保存新结构。
4. 旧原生入口／精确导出与回归须保持。可在新专用入口和明确共享纯函数上扩展，后续任务必须列出必要纯核心修改路径；B/C状态文件本轮仍不开放。

**维护适用消歧：** DEC-052 D07“不因维修改变身体、专长、日额或任务资格”不能脱离D01继承的付费规则及E01-P P05／P10“维护动作死亡”理解为免精力／免流血。此句约束资源修复本身不附赠回血、治伤或额度刷新；维护动作仍支付已批精力并处理应有付费流血。首工程应按此整体契约执行和回归，不能新增治疗副作用，也不修改原DEC。这是现有条款结合适用的非阻塞说明，不是新规则或新DEC。

## 6. 执行证据与未运行

| 类别 | 本轮情况 |
| --- | --- |
| 主线实时仓库读取 | commit／compare／tree／ref、正式对象与接缝源码 |
| 主线实际执行 | 26项字节／对象／结构核验，全部匹配 |
| 作者文档／架构／范围检查 | 作者报告，未全部在主线复跑 |
| 生产测试、typecheck、build | 主线与本次文档作者均NOT RUN；新增生产测试0 |
| 历史模型194／原生24等 | 本轮NOT RUN，不与26项相加 |
| CI | 本轮未核验，不将本地检查当远端CI通过 |
| 浏览器／真实IO／Owner试玩 | NOT RUN |

主线隔离容器一次尝试只读获取仓库失败，原因为DNS不能解析github.com；没有因此改用臆造源码、跳过对象核对或要求Owner手动做Git。实时GitHub连接读取和已挂载原件仍可用，本结论基于这两类证据。该尝试不涉及用户本地工作区。

## 7. 结论和后续权限

文档归档 **PASS**，未发现需要本批返修的载荷、采纳范围或版本覆盖错误。该结论仅限上述准确提交与阅读／核验范围，不是全局无缺陷保证。

按Owner既有权限另行下发 `ENG-RESIDENCE-CONTENT-SUPPLY-001（E01-P）`，从ad56a7d完整SHA新建独立工程分支。其完整任务书负责限定源码白名单、实际测试、普通commit／push和停止点；不在设计分支直接实现。不自动进入E01-R/S或E02/E03，不合并或推main。

## 8. 可核查仓库入口

- 提交：`https://github.com/lvlw/elevator-survival/commit/ad56a7d9dfc08e38f966f20cf7e07c71c08c09dc`
- 所有路径均固定在该SHA，不使用浮动main：
  - `docs/05-design-decisions.md#dec-052`
  - `docs/content/infected-world-entry-test-config-v0.1.json`
  - `docs/content/infected-world-entry-content-v0.1.json`
  - `docs/engineering/residence-foundation/content-supply-core-contract-v1.0.md`
  - `docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md`
  - `docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md`
  - `docs/design-drafts/world-infected-001/entry-004/adoption/DOC-WORLD-ENTRY-004-completion.md`

审查附件保存原包、旧DEC已核验原件、26项结果和可复算脚本；不是完整仓库归档，也不代表Project Sources已同步。
