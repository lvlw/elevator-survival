# DOC-WORLD-ENTRY-006 准确提交文档／T01实审 v1.0

## 1. 结论和适用范围

**PASS。T01关闭；D1/D2正式文档可以作为首批基础准备工程依据。** 这是对文档归档和限定TEST工具的实审，不是病程公开映射已经实现、浏览器保存可用或Owner首玩通过。

- 仓库：lvlw/elevator-survival。
- 受审提交：`ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`。
- 直接父提交：`20b833aeec4693e56afee075c9878425d3c58605`。
- tree：`5c0b802aa15d053ebaaa24e1ca1fe9bf836e6101`。
- 分支：`feature/design-world-entry-006`；主线只读核对远端指向此提交。用户本地干净和其他分支前后不变为作者交付证据，不声称主线读取了用户磁盘。
- 55路径、25修改／30新增，+3836/-4。远端compare为直接ahead 1；唯一删除发生于TEST runner的4行路径前置逻辑，正文没有删除。

主线此前已有下发完整任务的Owner授权；本次通过后另发基础准备工程，不自动开始浏览器owner／低资产UI，更不合并设计分支或main。

## 2. 正式条款与归档

阅读了DEC-053实际追加段、七份确定载荷、相关实际入口、作者完成报告和T01实现／回归。D1只把当前病程四档纳入公开知识；分段源为既有`health.infection_damage`，不是增长表，不修改HP0制或计算参数。隐藏医疗目标Preview继续unknown。同档非干涉和跨档公开正控需要后续实现，旧394f59d的unknown状态没有被倒改成实现通过。

D2仅为显式DEV／独立命名空间的封闭首玩范围；旧医院入口／槽、O3、迁移、清档及永久双产品不随之获准。基础→浏览器owner→UI各自停审；真实浏览器保存／独占和Owner体验仍保留。

从本会话实际原ZIP字节独立重算19件输入的Git blob及完整归档tree，匹配远端：
`3bd8b5115180931291bf5ef7608dda6216769b5f`。

五份preplay目标的完整目录tree匹配：
`a0a40e664fb1888677e88e9de62b1da3cc1931a3`。
字段v1.1目标blob匹配：`d4b50e78ca6c0503676d48cb70b9a523fb487b8f`。

因此六个新正式目标与原包载荷一致。DEC载荷本身摘要／blob一致，实际追加正文和diff已阅读；主线没有在容器重建275KB旧DEC完整前缀＋载荷的整个文件。全文前缀、23份附记的全部原字节、1472保护对象以及79链接／26锚点的全量执行仍归作者审计，不冒称全部独立复跑。

本地实际运行原包只读校验器的package-only模式：**94项PASS**。这不是作者222项仓库核验的完整复跑，也不与字节核验累计为互不重叠的新测试数。

受审根目录`src` tree为`9d8807ee1ff1353f5e8d80baec2f4326364455cd`，与20b833a／394f59d相同；package、lock、CI、scripts和AGENTS对象保持。未发现夹带生产、参数或入口修改。

## 3. T01：原样代码与独立实际执行

使用Git指纹匹配的三份原样文件：

| 文件 | Git blob |
| --- | --- |
| output-path-guard.mjs | 3f74e327a3fa40fd2388161da16356d2a202f1c6 |
| check-output-path-guard.mjs | 1a1598800c7c6e6e8fac918435a14d9422d402e0 |
| run-native-probes.mjs | 097e0f13b2d7994e402122d7b3156486152c696f |

修复按路径分量判断，不把`..probe`当父目录。实际仓库及输出现存祖先做真实链接解析；缺失尾部拼接在已解析祖先上，悬空链接和解析错误不默认放行。默认临时路径也先检查再创建；创建后写入前再次核对落点。词法仓库内路径保守拒绝。

主线Linux／Node v22.16.0原样执行独立检查器：**35/35 PASS、0失败、0跳过**，包括该平台实际symlink。Windows项目路径只是win32计算；作者Windows junction证据仍单独记账，不把本机Linux运行说成Windows OS实测。

三文件`node --check`均退出0。runner从`const posix=`开始的游戏探针生成／Vitest／结果处理后缀，与原runner逐字节一致。

另用外部假仓库执行runner入口：仓库内`..probe`、外部别名回仓库的缺失子目录均以`UNSAFE_PROBE_OUTPUT`退出1，未创建目标目录，未进入游戏探针。

两类仓库外语义负控使用同一35项检查：
- 还原旧字符前缀判断：3个业务断言失败，exit1。
- 去掉真实落点前置检查：3个业务断言失败，exit1。

没有把导入／语法／权限程序错误当作检出。权限故障仍为明确注入；不承诺恶意并发替换链接、OS级沙箱或真实ACL覆盖。上述两次35项负控不是新增70条实现通过。

## 4. 批准记录来源澄清

作者报告称`OWNER-approval`“是助手确认回执而非Owner逐字原话”。本次主线对照本WebGPT会话：**该完整文本由Owner以用户消息发出，且明确写明“确认本条为Owner批准记录”**；归档573字节文本与该用户消息内容相符。

必须区分：谁最初起草某种措辞，与Owner是否已明确采纳／授权。不能仅凭“收到”等措辞将明确用户批准降格为未授权；同样也不声称已验证该措辞在其他会话中的最初作者。有效批准范围仍只是D1／D2和已确认顺序，不能扩大。

此处为来源解释澄清，不需要Owner重复批准、不改变原件或哈希、不重写作者历史报告。下一任务允许在作者完成记录末尾附加本澄清的定位；原错误判断和原件均保留历史。正式规则内容本次没有因此改变。

## 5. CI162与维护观察

独立核对运行39630631079及job119327605386，head为本次准确SHA，最终`completed/success`。主线读取完整job日志：
- 架构：53 DEC／341 core production files。
- typecheck成功。
- 252个测试文件／4369项测试全部通过，测试duration 261.39s。
- build成功；既有大chunk警告保持。

这是GitHub远端实际执行，非主线容器或作者文档任务的本机重跑。作者本机NOT RUN记录继续保持，不追改为作者已执行。

npm ci日志同时报告6项审计告警（2 moderate／4 high），并有Actions运行时告警。本轮只核验日志摘要，没有取得完整advisory／可达性分析，不能称全为dev或证明生产可利用／不可利用。作为独立发布维护事项保留；不运行audit fix、不顺手升级依赖、不让该摘要替代后续风险分析。

## 6. 未执行、已知限制和停止点

主线容器尝试取得完整仓库时发生DNS解析失败；本轮没有本地全量npm、架构脚本、作者222项仓库校验、历史10项游戏probe、72路线样本或浏览器／Owner体验复跑。已独立执行的35项是实际Node文件系统工具检查，不是替代游戏内核的模型。

W01累计仍只保留原两文件七处硬换行；作者增量exit0、累计exit2分别记录。本轮不扩大例外。

文档／T01范围内未发现需返修的阻塞。允许主线据已批准基础契约下发独立基础工程；浏览器owner、低资产UI、公开入口、O3、清档／迁移仍禁止自动进入。

## 7. 可核查定位

- exact commit：`https://github.com/lvlw/elevator-survival/commit/ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`
- CI162：`https://github.com/lvlw/elevator-survival/actions/runs/39630631079`
- 正式依据：`docs/05-design-decisions.md#dec-053`及`docs/engineering/world-integration/preplay/`五合同、player-query-field-contract-v1.1.json。
- 作者报告：`docs/design-drafts/world-infected-001/entry-006/adoption/DOC-WORLD-ENTRY-006-completion.md`。
- 主线证据附件：source/三份原样工具；evidence/字节核验、35项原跑、两类负控、CLI拒绝、94项包校验及CI摘记。CI摘记是从连接器日志整理，不冒充完整原始日志文件。
