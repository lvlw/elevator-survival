# ENG-WORLD-PRESENTATION-PREP-001 主线准确 SHA 实审

审查日期：2026-10-31。状态：**PASS（本批授权范围）**。

## 1. 结论与授权边界

A 当前敌人安全展示查询通过源码与交付实审。本批 W0—W4 的实际交付可收口，无须发起返修。

W3 的原生观察和 B 候选合同、W4 的15槽关联与接入资料满足本批准备任务；这不把 B 的候选字段或生命周期变成已批准生产合同，不授权 B 实现、C 正式 UI、素材采用、O3、部署、合并或推送 main。

`INCOMPLETE_ART` 继续保留。审查没有完成素材像素、最终透明清稿或 Owner 体验验收。

## 2. 准确基线

- 仓库：`lvlw/elevator-survival`
- 分支：`feature/world-presentation-prep-001`
- 最终 SHA：`a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0`
- 父／起始 SHA：`723d547665298463ecd8a8d04c7ed508a1658dc1`
- Tree：`1f75162b22bcf486796b6c02bc57b3ec38e6616a`
- 主线实时读取远端分支和提交对象匹配。比较结果 ahead 1 / behind 0，共1提交、50变更文件（46新增、4修改）。
- 用户本地工作区和其他分支未变属于作者回执，不声称主线直接读取了用户磁盘。

## 3. 交付包与原件

实际读取用户上传 `MAINLINE-REVIEW(3).zip`：

- 大小：320277字节。
- SHA-256：`c424bc07075750d95bb7bd2731592711e284730b496b4eaf7b1222de91a13c0f`，与提交报告一致。
- 85个文件条目；无重复条目、路径越界或软链接条目；CRC全部通过。
- 实际执行包内已阅读的 `verify-review.py`：83个清单成员、50个source成员通过。
- 13份归档输入与最初任务ZIP逐字节一致。11是正文载荷数量；13包括清单与摘要文件，不混用两种统计。
- 50个源码/文档文件符合任务许可路径，6个生产文件（2新增、4窄修改），9个新测试文件、2个TEST辅助文件，33个任务文档/脚本/输入原件。

### 与 Git 对象的独立绑定

并非只信任作者清单里的Git blob字符串：对50份源文件重新计算Git blob，从实际字节及保护清单重建Git二进制树，与主线读取到的远端树比较。

| 检查 | 计算值与远端一致 |
| --- | --- |
| 最终 `src` 树（992文件） | `33bd650161a007ce36f27137bb04b80f77178ff7` |
| 起始 `src` 树（979文件） | `181d7c9a6d5b98ab3fce92c9bc80e0061a820df6` |
| 本任务新文档子树（33文件） | `3a5fa9f6290a8ffa453feeacb0b04494dfd955a2` |

以上证明包内17个src文件和33个文档文件对应准确提交；975份受保护既有src对象在两端保持。受保护源文件不是逐件重新执行。文件mode、目录排序和路径层级参与树哈希，不是简单拼接字符串摘要。

在仓库外临时目录执行交付patch的reverse-check、逆应用、forward-check及 `--whitespace=error-all`，均exit0；没有修改用户仓库。历史累计W01/W02只核对作者记录，不冒称本轮重新执行了全历史差异检查。

## 4. A 实现审查

### 实际路径

- `src/content/infected-world-v0.1/player-opponent-catalog.ts`：内容侧三组固定公开名称/视觉键；`Object.hasOwn`防止原型成员被当作合法映射。
- `src/content/infected-world-v0.1/player-query.ts`：通过原受控labels依赖接入可选opponent映射。
- `src/state/residence-session/player-opponent.ts`：仅在active-world且当前battle存在时，根据已校验entry.definitionId取得映射；检查闭合键/名称配对；只重建kind/visualKey/name三字段，不spread来源对象。
- `src/state/residence-session/player-queries.ts`：接入真实普通查询的combat投影，而不是孤立helper。
- `src/state/residence-session/player-types.ts`、`player-index.ts`：闭合类型与type-only导出，不新增运行命令入口。

### 已核对的边界

1. 不按地图、地点、图片文件名猜对手，不扫描历史或未来敌人。
2. 三种公开结果：感染护工 / infected-orderly；感染装卸工 / infected-porter；感染技术员 / infected-technician。
3. 非当前战斗不暴露旧对手；映射缺失/非法固定unknown，不通过错误文案泄漏原ID。
4. 无精确敌HP、raw CTB、seed、执行/实例/伤口/来源ID、资源路径或themeId进入公开对象、save或expected。
5. 旧公开字段与选择器生命周期保持。新增旧查询oracle并非“同实现与自己比较”：主线恢复原query并核对基线blob，确认oracle保留真实旧逻辑。
6. 只读投影不重跑生产者、不触发随机/保存，不创建current或第二writer。
7. 敌人原五阶段保持，`incapacitated`不作为死亡或胜利判断。

没有发现需要本批返修的A实现问题。

## 5. 测试：三类证据分别记账

| 来源 | 实际证据 | 本轮处理 |
| --- | --- | --- |
| 作者本地 | 基线314文件/4672测试；新增9文件/53测试（39 A +14 B），替换0、删除0 | 阅读原日志与测试源；不是主线本地复跑 |
| 作者本地 | 89文件/728组合回归，含旧E03四路线/72样本 | 旧回归不累加为新增验证 |
| 作者本地 | 默认完整check：323文件/4725测试 | 原结果保留 |
| 主线独立 | 直接导入交付的实际两个纯TS模块，38项隔离检查PASS | 见脚本、JSON和控制台原输出 |
| 远端CI | 准确SHA的GitHub Actions #175：323文件/4725测试PASS；架构、typecheck、build成功 | 主线实际读取run/job及完整日志，当前可由UNCONFIRMED更新为SUCCESS |

### 主线38项的具体含义

检查三映射与冻结三键输出、地点/旧档不影响映射、不读取隐藏字段、unknown/原型键、无战斗不调用映射、legacy labels、10种畸形候选、额外getter不复制、意外受控配置错误原样抛出、当前场次更新无旧缓存，以及基线oracle和query blob。

这是Node v22.16.0对实际纯模块的隔离执行，使用仅适合投影测试的合成可信值；不是合法CombatValue恢复，不是原生P/S调用链，不是浏览器，也不计入仓库新增测试53项。

主线尝试只读取得完整仓库以运行原Vitest链路时网络代理解析失败；因此主线本地完整test/typecheck/build未执行。此限制没有阻止ZIP完整性、树绑定、源码阅读及上述38项执行。

### 作者覆盖的相邻场景

真实入场、退却/再入、胜利/死亡、冷恢复、保存失败后继续和retry、stale selector、整DTO隐值非干涉及两类语义负控都有原始测试/计数。对无法在当前偶数伤害和14/16初始HP下实际形成的正HP incapacitated，作者明确标注不可达，以原selector规范和素材槽覆盖分开表达，没有修改规则或伪造15种可达组合。这一处理可接受。

## 6. B 观察和候选合同

TEST-only观察确认：P计划、S提交、普通PlayerExecution和controller结果并不等同于安全逐击演出序列。原生两次敌响应等事实存在于内部witness，但内部queue/trace含精确HP/CTB、风险、隐藏临床信息与内部引用；不能直接公开，也不能由Feed文字或前后HP差补猜。

候选B1采取“六类combat命令每次真实提交只产生一条粗粒度发起动作记录”的范围，其他命令不生成token。只在提交后生成会话内标识；save-failed不改变提交；retry/read/cancel/reject/cold恢复不重放；动画不dispatch、不扣值、不决定胜败。这可作为下一步定稿的依据。

但以下不能由本次PASS推定：

- B生产字段、token的精确对象/ordinal协议、消费方生命周期已正式批准。
- 可以逐次播放敌方反击、精确命中数、伤害、未来CTB运动。
- B1粗记录已取代Owner长期期望的完整战斗演出。

下一批应单独明确B1最小合同与测试/停止点，再授权生产实现；详细逐击演出另保留安全事实来源与玩家知识边界审查。

## 7. 素材、范围与公开发布门槛

15槽覆盖3敌×5公开阶段，字段与来源引用结构一致；未复制/采用新美术。当前包不含候选原图，因此本轮不宣称核验其像素或透明边缘。背景真实2×、最终清稿、正式UI接线、浏览器和Owner体验门槛仍开放。

未改核心规则、内容参数、S提交、prepared/expected/save、browser owner、生产controller/UI、依赖或CI。公开映射错误的中性降级仍是异常保护，不等同于允许正式画面用占位图验收。

## 8. 附带观察：依赖审计摘要

读取准确SHA的CI原日志时，`npm ci`输出：7 vulnerabilities（2 moderate、5 high）。这比先前“审计API 404/UNCONFIRMED”的证据多了一份当前安装摘要，但未提供本轮完整包名、修复版本和可达链分析。

记录为独立待核查事项，不归因本批新增，不宣称都属dev或运行时安全，也不授权`npm audit fix`/升级依赖。A范围实审PASS不等于公开部署安全批准。需在之后专门依赖核查或发布Gate处理。

本次CI build成功；不把历史>500kB警告机械写成本轮仍有。完整依赖明细和环境差异没有进一步研究。

## 9. 当前停止点

本批无需作者返修或重新上传。当前可继续基线为a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0。保留工程分支停止；主线下一项工作是B1生产合同定稿和独立任务下发，不是继续修A，不是自动合并或接完整UI。

## 10. 可复核证据

同包 `independent/` 包含实际执行脚本、结果、Git树重建及包/输入/patch记录。`remote-evidence.json`为主线已读取的GitHub响应摘要；`ci-log-excerpts.txt`只是明确标记的日志选段，不冒称完整原日志。

对应在线来源：

- 精确提交：https://github.com/lvlw/elevator-survival/commit/a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0
- 分支ref：https://api.github.com/repos/lvlw/elevator-survival/git/ref/heads/feature/world-presentation-prep-001
- CI #175：https://github.com/lvlw/elevator-survival/actions/runs/41099921845
- CI job：https://github.com/lvlw/elevator-survival/actions/runs/41099921845/job/124215293395
- A投影：src/state/residence-session/player-opponent.ts、player-queries.ts
- B候选：docs/engineering/world-integration/presentation-prep-001/B-COMMITTED-PRESENTATION-CANDIDATE.md

审阅文件不写回仓库，不创造DEC/UIR，不作为后续任务自动开工授权。
