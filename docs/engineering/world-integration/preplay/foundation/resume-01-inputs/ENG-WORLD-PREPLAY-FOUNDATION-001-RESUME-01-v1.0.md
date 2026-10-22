# ENG-WORLD-PREPLAY-FOUNDATION-001-RESUME-01 v1.0

## 0. 本次处置与权限

本文件由 WebGPT 主线依据 Owner 既有任务下发权限形成，是原基础工程的限定续办补充，不伪装成 Owner 新原话，不改变玩法或验收结论。

**批准保留原任务书第249行这一处原件 EOF 空白，单独记为 W02。W01仍为原两文件七处硬换行，范围不变。** 不提供替换原件，不改原 SHA256SUMS，不把任何原始 diff-check 的 exit 2 写成 exit 0。

该例外仅解除原任务第7节“原件字节必须不变”与“新差异必须 exit 0／累计不加第八处”的单点冲突。其余工程责任、正式合同、保护对象、默认完整检查与准确 SHA 停审继续有效。本条不表示实现已通过主线源码实审。

原工作区实施结果继续保留。不要从头开发、重建分支或撤销现有成果。

## 1. 基线、分支与事实范围

- 仓库：`lvlw/elevator-survival`。
- 本次提交前预期 HEAD／原工程起点：`ff2b79f332c5ea2bec493eb5e166dcee6ba667eb`。
- 沿用分支：`feature/world-preplay-foundation-001`；不新建分支或 worktree。
- 主线只检查了会话中的原 ZIP，未读取 Owner 本地工作区、暂存区或临时 patch。
- 作者报告：55项已暂存，5份作者记录又有未暂存更新；源码保持最终已测字节。**这是需本地重新核对的状态，不是主线独立验证。**

先检查当前 HEAD、branch、status、普通／cached diff、untracked、原任务进程及远端引用。已有测试进程未结束时不得重复启动。保留所有本任务改动及原 BLOCKED 经过，不执行 reset、clean、stash、amend 或强推来整理现场。

如果 HEAD 不同、出现无明确来源改动或实际指纹不符，报告精确差异；不能硬回退以满足本文。

## 2. 独立核对结果及 W02 精确范围

主线从原任务 ZIP 对六条 SHA256SUMS 全部重新计算，一致；原包校验器26项通过。在独立临时 Git 仓库将七份原件按真实归档路径全部作为新增文件暂存，`git diff --cached --check` 实际 exit 2，只有以下告警：

```text
docs/engineering/world-integration/preplay/foundation/inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-task-v1.0.md:249: new blank line at EOF.
```

唯一获批 W02：

| 项目 | 固定值 |
| --- | --- |
| 路径 | `docs/engineering/world-integration/preplay/foundation/inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-task-v1.0.md` |
| 行 | `249` |
| 告警 | `new blank line at EOF.` |
| 大小 | `24083 bytes` |
| SHA-256 | `c8b7fba85afd741b871b4022d9824744938e1f38cfee16bce36bf06dd26f5325` |
| Git blob SHA-1 | `85a39b34c414952cfc30005b4f76b483bb019a42` |

这是输入包自身的格式冲突，不需要修改实现来解决。证据见 `evidence/original-archive-eof-verification.json`，不把隔离输入核验当作实际源码或本机全量检查。

W02不豁免整个文件的其他告警，不豁免整个inputs目录，不允许新增其他末尾空行，也不成为后续任务通用许可。工作树／索引／最终提交blob必须都保持上述原件字节。

## 3. 续办修改范围

允许将原授权范围内已完成的源码／测试／文档继续暂存和正常提交；本次为解阻不得再改实现、测试、参数或配置。

本轮允许继续更新的5份作者记录如下，仅补充阻塞、续办、实际验证与例外说明，保留原结果和历史对象，不借补充改写功能支持结论：

- `docs/engineering/world-integration/preplay/foundation/implementation-notes.md`
- `docs/engineering/world-integration/preplay/foundation/contract-and-support.md`
- `docs/engineering/world-integration/preplay/foundation/metadata-support.json`
- `docs/engineering/world-integration/preplay/foundation/verification-results.json`
- `docs/engineering/world-integration/preplay/foundation/completion.md`

将本补充包四份文件原字节归档到 `docs/engineering/world-integration/preplay/foundation/resume-01-inputs/`，精确新增路径：

- `docs/engineering/world-integration/preplay/foundation/resume-01-inputs/ENG-WORLD-PREPLAY-FOUNDATION-001-RESUME-01-v1.0.md`
- `docs/engineering/world-integration/preplay/foundation/resume-01-inputs/RESUME-01-SCOPE.json`
- `docs/engineering/world-integration/preplay/foundation/resume-01-inputs/evidence/original-archive-eof-verification.json`
- `docs/engineering/world-integration/preplay/foundation/resume-01-inputs/SHA256SUMS.txt`

原67条最大许可仍按原 manifest 解释；仅增加上述4条归档路径，累计最多71条。本次“可编辑范围”为上述9条，不把新增目录或旧67条整体重新开放为任意返工许可。

不得覆盖原inputs七件文件及原manifest；本补充作为后续优先的单点授权与增量路径清单。原7件输入的逐件字节核验值也列在 `RESUME-01-SCOPE.json`。

## 4. 一次完成的续办流程

### W1：确认现场与源码冻结

核对原任务、正式合同和本补充。读取已有最终默认 `npm run check` 原始记录及实测源码指纹；若没有可核实的实测快照，不能仅靠报告声称当前源码与已测一致。

保留作者真实原始基线252文件／4369测试，以及此前最终267文件／4444测试的各自身份。本轮不把前一轮测试重新累计为新增。继承源码先固定新指纹，与索引及待交付工作树逐件比较。

### W2：归档、更新记录并消除工作树／索引分叉

验证本补充 SHA256SUMS，归档四份文件。五份作者记录中保留原 BLOCKED 段；追加本次 W02 明确授权、检查原始输出与最终状态。JSON采用新增续办对象或保留既有历史字段，不用新的PASS覆盖旧exit2。

检查报告中的新增 Markdown／JSON 自身不存在行尾空白或EOF空行。逐路径重新暂存五份记录及四份补充原件，确认工作树、索引和最终待提交报告一致。不得用全仓 `git add .` 混入无关文件。

### W3：最终检查与精确告警审计

提交前实际再执行一次默认 `npm run check`。这次复跑记录为续办验证，不新增／替换／删除生产测试；实际数量以本次输出为准。不再强制重复已通过的全部独立负控或另跑两次路线，除非出现需要定位的新问题。若检查失败，保留失败，不擅改源码、超时、worker或配置换绿；准确报告并停在提交前。

`npm audit` 镜像404继续记为最新风险未确认；本轮不要求为解空白阻塞再次联网审计或升级依赖，更不能称“无风险”。原未知安全分支、浏览器／UI／Owner未执行项照实保留。

空白审计必须完整执行、保存 stdout/stderr及真实退出码，**不排除原件路径后就称全量通过**：

```text
git diff --check
git diff --cached --check
git diff ff2b79f332c5ea2bec493eb5e166dcee6ba667eb --check
git diff --cached ff2b79f332c5ea2bec493eb5e166dcee6ba667eb --check
git diff 8c19ca0d28058cf743b41c8547cc2629c8eac767 --check
git diff --cached 8c19ca0d28058cf743b41c8547cc2629c8eac767 --check
```

阶段判定：

| 范围 | 原始结果要求 | 明确例外判定 |
| --- | --- | --- |
| 全部暂存完成后的普通diff | exit0，无输出 | 工作树与索引一致 |
| cached与本工程起点增量，工作树和索引分别检查 | **exit2** | 仅W02一个告警；路径／249行／信息／原件指纹全部匹配 |
| W01累计起点，工作树和索引分别检查 | **exit2** | 旧W01七处＋W02一处，共八处；不得写成“只有七处” |
| 不属于W01/W02的任何差异 | 不得存在空白告警 | 任何新诊断均阻塞，不自动续增例外 |

对原W01两份文件核对与本工程起点blob一致，其告警仍只允许旧review第3—6行及旧task第7—9行；具体路径见scope JSON。不能仅按总数量八处放行而漏掉替换位置或改变原件。

补充判定可记 `PASS_WITH_APPROVED_W01_W02_ARCHIVE_EXCEPTIONS`，但这只表示“核准例外精确匹配的交付检查”，**不是原始Git检查exit0，也不是主线工程PASS**。禁止改 `core.whitespace`、全局git配置、`.gitattributes`、hooks、工作流，禁止静默忽略退出码或整目录排除。

### W4：正常提交、推送及停止

全部功能检查通过且空白诊断精确匹配后，允许把原工程实现与本补充一起普通commit／push到同名工程分支。沿用原工程提交语义，建议信息：`feat(app): add preplay condition and presentation foundation`。

先验证最终索引与刚刚实测的源码／测试逐字节相等；只补实际日志／报告时不强制为报告时间戳再跑整套测试，但报告必须重新暂存并重做范围／原件／空白审计。保持初始实现失败和本次BLOCKED经过，不amend追写自身SHA。

提交后核对完整SHA、父SHA及tree、所有交付blob和两段完整diff：

```text
git diff ff2b79f332c5ea2bec493eb5e166dcee6ba667eb HEAD --check
git diff 8c19ca0d28058cf743b41c8547cc2629c8eac767 HEAD --check
git status --short
git diff --check
git diff --cached --check
```

前两项仍须记录真实exit2以及W02／W01+W02的精确诊断。工作区与暂存区应干净；原件blob仍匹配。仅普通push `origin feature/world-preplay-foundation-001`，记录远端引用和其他分支未主动改变；不推main、设计或旧分支，不合并、不强推。

准确新SHA的CI若可读，记录实际状态；未结束或查询失败仍标queued／in_progress／UNCONFIRMED，不拿旧CI162替代。本轮不创建第二工程或后继任务。

## 5. 交付报告与停止点

返回当前WebGPT的报告至少包括：原工程及续办任务名；原始起点／最终完整SHA／父SHA／tree；实际基线与最终check；原工程测试净增与本次续办净增分开；重新暂存五份记录情况；本次允许范围及输入字节；完整空白命令真实exit／告警匹配；实际commit／push／CI；未完成及NOT RUN。

原本+75项为作者本轮实现的报告数，提交前须依实际测试记录核对。本次若仅归档和记录续办，新增／替换／删除／净增生产测试均为0，不能把同一75项又记为续办新增。

**停止在最终准确SHA待主线源码／安全／应用更新实审。** 当前不宣称F01—F10主线验收通过，不进入浏览器owner、UI、真实存储、跨标签、O3或其他后继工程；不得用W02作为放宽任何功能／权限边界的理由。
