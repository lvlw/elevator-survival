# G3 实现记录

## 写生产代码前的接口与顺序设计

起点 `d7953bbf96dc842d2953e019f950275cd693bf09`；独立分支 `feature/residence-session-core-001`。开工实际全量测试 115 文件／2540 测试、exit 0；不是引用历史 CI。日志在仓库外 `residence-session-g3-audit/baseline.log`。

技术 envelope 固定为 `{ format: 'elevator-survival.residence-headless', formatVersion: 1, state }`，不注册产品 rulesVersion，不连接旧浏览器槽。严格 state 只有两类：

- fresh-hub：phase、character、missions、carried、itemStates、catalogRef。catalogRef 只绑定携带物目录，不是现场或执行。
- active-world：phase、character、missions、carried、itemStates、site。G2 事实按原结构组合，不另存 location/body；角色是唯一身体／D/T／revision owner，site.binding 仅为既有 G2 绑定。

策略由 composition 注入配置 handle、明确允许的 rulesVersion、完整声明全集、已校验 catalog handles。声明不从档案推导。严格根身份给出冷启动角色 ID；每份委托用该 ID 与策略声明构成 expectedBinding。冷候选无安装权，也不证明历史未丢失。

校验顺序：严格对象／版本 → 根身份／策略 → 完整委托集合及交叉绑定／活动唯一／执行 ID 唯一 → phase／时钟 → G1 身体／周期 → G2 现场／实体／知识 → 支持子集。关闭历史、非首执行、死亡和 pending 不安装、不擦除、不兜底新建。来源／实体检查明显矛盾但不抽随机。

唯一 owner 为私有闭包。受控 composition 签发 domain handle，一个 domain 只领取一个 owner；普通入口不导出构造 domain、replace、setState、installCandidate、外部 plan 或 initialState。

控制状态：unbootstrapped → 真正 read-null 后 no-save；有效字符串 → ready；读取异常 → read-error；坏档／不兼容／未支持 → blocked。retry-read 仅在 read-error，无 current；ready 禁止第二 bootstrap/create。

首次创建只接受受控 factory 给出的 fresh-hub revision 0。普通命令复用 G2 constructor，只允许 move（完整 binding、expectedRevision、单 edgeId）。owner 从 current 建立 authority，预检不支持的 arrival／遇敌，真实 plan 一次，检查签发／freshness、身份／revision，严格聚合并序列化后才提交。

完整后态一次替换 → write 一次 → 只读通知分发一次。保存失败保留新内存；retry-save 编码最新 current，不跑玩法、不通知。所有外部 read/factory/write/listener 前置 busy，重入写拒绝；只读可看完整 current。listener 异常逐个隔离，仅返回安全错误码，不暴露或冻结原始 Error。注册不立即通知；冷恢复不保存、不算玩法提交、不通知。

## 阅读与复用

重读 AGENTS、GDD、Slice、Architecture、DEC-006/009/010/011/014/016/045/048/049/050、O1/O2 批准原文、恢复补充、G1 契约、相关 Content 持续性条款及 UIR 知识边界。包内五件完整读取、摘要核对。

- mission readScope/readValue 复用窄值校验；原 restoreMissionCandidate 及四个受控函数不改。
- G1 readCycleContext/readResidenceBody、唯一 infectedResidenceConfig，G2 readLocationContext/planResidenceMove/assertResidenceLocationPlanCurrent/queryPlayerResidenceKnowledge 继续拥有规则；G3 不计算精力／流血／周期／随机。
- fresh-hub 复用 createCarriedItemContainersSnapshot、calculateBackpackWeightSubtotal/classifyLoad、createItemStateCollectionSnapshot，严格结构先于旧工厂。
- 已阅读旧 run-store/run-save-codec/production-bootstrap，不采用其公开 initialPhase/clear 入口，不导入旧槽。

## 实施与验证

实际定向／组合／完整检查及自查修订在交付前补录。G3 不宣称玩家可用、跨标签安全或防离线篡改；关闭历史、完整终局、CTB、后续角色接续及 O3 仍 OPEN。

## 开工约束冲突：BLOCKED

生产代码尚未写入时发现：原 `src/core/mission-lifecycle/mission-lifecycle.test.ts` 第 372–380 行的 K19/K20 测试，严格断言 controlled 模块只有四个导出。任务书 5.1 同时要求在该模块新增 parseMissionColdCandidate 入口，并禁止修改原 103 项测试；旧测试文件也不在 30 路径白名单中。正常新增导出将改变 Object.keys(controlledApi)，不能同时满足两项要求。没有采用隐藏导出、mock、跳过测试或修改模块枚举等绕过方式。

实际额外执行 `npm run test:run -- src/core/mission-lifecycle/mission-lifecycle.test.ts`：1 文件／103 测试 PASS、exit 0（11:24:56，2.12 秒）。这是未改生产源码的原测试结果，不冒称新增实现测试已通过。原始日志在仓库外 `residence-session-g3-audit/mission-boundary-check.log`。

暂停，等待主线授权最小调整：将该旧测试文件加入白名单，仅在受控导出精确清单中增加新入口，保留普通 index 清单、K18/K19 恢复语义及全部 103 项测试。未修改任何生产代码或测试；未完成 G3 实现／最终 check，未提交、未推送。

## ADDENDUM-01 执行正文（Owner／主线续办授权原文）

执行 ENG-RESIDENCE-SESSION-RESTORE-001-ADDENDUM-01。
这是原G3任务的范围修正与续办，已由WebGPT主线按Owner已有授权下发，
无需再次申请授权；不是新Goal，也不是检查失败豁免。

一、从现有进度继续
HEAD／起始基线仍为：
d7953bbf96dc842d2953e019f950275cd693bf09
沿用已创建的 feature/residence-session-core-001 分支。
重新核对HEAD、分支、status和普通／cached diff；保留本任务已有的
implementation-notes.md及阻塞记录，不重新建分支、不reset或丢弃成果。

二、有效白名单由原30条增加到最多31条
只增加：
src/core/mission-lifecycle/mission-lifecycle.test.ts

该文件仅允许在以下测试的controlledApi预期导出数组中，
插入一行 'parseMissionColdCandidate', ：
K19 K20 read-only exports exclude controlled transitions and test harnesses

保留原四个名字，保留Object.keys(controlledApi).sort()与精确toEqual断言。
不改同一测试中的publicApi清单；不改测试名称、其他断言或其他测试。
该文件的Git差异应只有这一个新增数组项，不格式化整个文件。
禁止改成arrayContaining、过滤掉新导出、弱化匹配或skip／删除测试。

三、原恢复保证及其余范围保持
controlled.ts仍只按原任务新增parseMissionColdCandidate及必要导入，
原四个函数不变；普通index、原validation/types及restoreMissionCandidate
的独立expected要求不变。冷候选仍无安装／覆盖current权限。
新增冷候选用例写入原白名单已有的cold-candidate.test.ts，
不借本次例外扩大原测试文件修改范围，不改G1/G2或支持矩阵。

四、原输入包保持原字节
不修改五份inputs、原任务书、BASELINE-AND-INPUTS.json或SHA256SUMS.txt。
本补充仅覆盖它们涉及“30条白名单／旧测试全部只读”的上述局部限制；
检查按“原allowed_paths并集本条新增路径”执行。
保护对象检查只对该测试的这一行作精确差异核验，其余保护要求不变。
将本补充执行正文追加到原白名单已有的implementation-notes.md，
在verification-results.json和completion.md记录阻塞原因、处置、
有效31条范围、该测试最小diff及实际检查；不新增仓库归档路径。

五、验证和完整交付
保留本轮已实际执行的115文件／2540项基线及103项身份回归记录。
确认暂停期间源码、测试、依赖和HEAD未变时，不必仅为续办重复建立基线；
记录必须可追溯，未执行的命令仍写NOT RUN。
修订后实跑原身份测试、新增冷候选／聚合／会话测试、原G1/G2回归，
并完成原任务全部验收及npm run check、全部diff和范围检查。
原103项仍保留；其中1项导出清单更新不算新增测试，新用例另计。

不为解除本阻塞单独做一次小提交；按原任务一次完成G3实现、
自查修订、文档、普通commit及同名工程分支push。
不合并、不强推、不推main或其他分支，不改规则／参数，
不接玩家入口或浏览器存档，不执行关机／定时操作。
最后报告最终完整SHA、父SHA、实际测试、该最小测试改动及push结果，
停止等待当前WebGPT主线准确SHA源码／headless恢复实审。

## 续办核对与首次自查

实际 HEAD／分支符合；普通与 cached diff 均空，只有本实现记录 untracked。暂停期间源码、测试、依赖均未变；沿用本轮真实 baseline.log，不重复计数。有效范围为原 30 条并集唯一旧测试路径，共 31 条；原五份输入不改。

生产接口与第一批测试两次 typecheck 均 exit 0。首轮定向 17 文件／514 用例，511 PASS、3 FAIL：两个新测试误把输入 ItemState 数组顺序当作正式工厂输出顺序；一个新测试将缺失 envelope.state 预期为内层错误，但 Zod 在 envelope 就拒绝。核对原 createItemStateCollectionSnapshot 后修正为完整身份排序比较，并修正外层错误预期；不修改生产规则以迁就测试。追加请求形状／身份／旧修订和冻结边界测试，复跑结果在验证 JSON 单列。

## 十二组原生验收映射

| 组 | 实际测试入口和代表用例 |
| --- | --- |
| S01 | cold-candidate.test.ts：preserves 六种状态；rejects cross binding；does not replace the original independent expected boundary |
| S02 | residence-save.test.ts：strict string codec、envelope/config 八类拒绝；session.test.ts：bad stored is blocked |
| S03 | aggregate.test.ts：aggregate cross-binding、real containers、duplicate ground/carried、duplicate run ID |
| S04 | codec 两阶段 round trip；aggregate：actual G1 closed clock、D7、unsupported dead/later/pending |
| S05 | session：creates only after actual read-null；四类 failed first factory；persistence：failed first save keeps ready |
| S06 | session：loads current once、same domain、read-error、retry-read、busy covers read/factory |
| S07 | session：real G2 move、E1 cost8；integration：three real session moves consume only preceding current |
| S08 | integration：unsupported damage/exposure/live-enemy/bleeding-death；aggregate：pending installation 拒绝 |
| S09 | persistence：r→r+1 写失败→query→r+2→stale r→retry-save r+2；首次保存失败同样不重建 |
| S10 | session：queries/subscriptions、copied command、frozen state；persistence：write/notify reentry、throwing subscriber |
| S11 | integration：real reveal→whole pickup/drop→rest→string cold restore；真实实体/资源/敌人/游标/知识保持，未 mock resolver |
| S12 | session：旧 string/candidate 无替换入口；原 103 身份、169 G1、115 G2 原生回归；Git 对象保护审计 |

定向修订二 17 文件／522 测试 PASS 后，再补实际 G1 六次休整到 D7、三种正式关闭时钟、跨 active/closed 重复 runId 与有效 retry-read，最终定向为 17 文件／528 测试 PASS，其中原 387、新增 141。原身份用例数仍 103；导出清单更新不算新用例。

## 最后自查与最终工程验证

首轮完整 check 为 121 文件／2681 项 PASS。再次检查组合测试时发现，来源已兑现的 re-reveal 断言如果直接传 aggregate，会因额外 phase/missions 字段而先拒绝，未精确证明来源资格。已在新白名单测试内显式投影原 G2 snapshot，并断言正式 NOT_AVAILABLE；未改 core。修正后捕获 18 份测试源码摘要，再实跑定向 17 文件／528 项与完整 check，均 exit 0；全量仍 121／2681。最终 architecture 为 50 DEC／246 core production files，typecheck/build PASS；既有 bundle chunk-size warning 保留。日志分别为 targeted-verified.log、full-check-final.log；没有将旧通过结果冒充最后版本。
