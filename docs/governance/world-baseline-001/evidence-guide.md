# 历史证据的等级与限度

[review-evidence-index.json](review-evidence-index.json) 记录23个实施/设计阶段的完整起止提交、final parent/tree、批准/审查/作者路径和摘要，并另列5份正式批准与3份主线技术采纳。[source-index.json](source-index.json) 提供实际读取来源的字节摘要与准确a7对象；读取范围按记录明确说明，不宣称重新实审所有历史源码与测试。

| 等级 | 只能支持的结论 |
| --- | --- |
| FORMAL_APPROVAL | 原件所限的Owner批准或明确标识的主线技术采纳；二者权限不混同 |
| MAINLINE_AUDIT_ORIGINAL | 实际定位到的主线原件、准确对象和限定结论；非本轮新增验收 |
| HISTORICAL_REFERENCE_ONLY | 后继任务或历史状态的引用；不能替代缺失原件或推导完整PASS |
| AUTHOR_EVIDENCE | 作者完成报告/清单；不等于主线或Owner验收 |
| CURRENT_EXECUTION | 本轮实际执行和原始回执 |
| NOT_RUN / NOT_VERIFIED | 没运行或没有足够证据核验，不能写通过 |

G1初次 `9bbf5aa…`、E02-P R1 `8512c99…`、E02-R初次 `55fbf0f…`、低资产初次 `2e3d13a…`、设计R1 `0e0c5cf…` 等原件保留其未通过/部分结论。后继修复仅按后继精确对象登记，不倒改早先失败。E03预算检查通过不等于query或后续UI体验通过；browser owner限定浏览器证据不等于所有平台或自由首玩通过。

| 最终专项原件缺口 | 实际可读的引用与限制 |
| --- | --- |
| 低资产UI R1 `6bb43c88…` | 设计输入 SOURCE-BOUNDARIES 及作者completion；初次审查原件仍是 NEEDS_REVISION；无最终专项原件不补PASS |
| 设计R2 `956da806…` | 设计owner-review/作者材料；旧R1 INCOMPLETE_ART仍按其时点保存 |
| readiness `723d5476…` | A输入 AUTHORIZATION-AND-STATUS 承接限定关闭；不据此伪造完整视觉实审原件 |

A审查使用任务包内原字节 MD，准确对象a7、限定PASS，范围是安全当前对手查询、B TEST来源观察与候选准备。它没有批准B生产协议或C。该MD提到的 evidence ZIP 未附本轮输入，记录 NOT_RECEIVED_THIS_TASK。历史CI#175 success也是MD内历史证据，不能记作本治理SHA的新CI结果。

原件缺失只是可定位缺口，不要求Owner重翻旧会话，不停做独立治理，不通过作者自查补造“主线审查”。本轮自查结果和主线接下来对准确SHA的治理审查分账。
