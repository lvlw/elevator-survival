# 19 项候选纠偏与生成器边界

固定 sourceCommit 为 `8c962f90d9e4ef01ab46a5fc4b970d93c7c45c96`。旧 catalog 的历史 `metadata.baselineSHA=956da8065030ccea15256e49bd927a4e6a71942f` 原样保留；A 关联表的历史来源提交与治理账的 a7f0f15 也不改写为当前来源。当前采用候选准确绑定 sourceCommit，不等于这些历史文件获得重新批准。

实际仍有 19 个逻辑差异，没有凑数：

- 15 个注册 SVG 的旧摘要绑定 CRLF 工作区字节，Git blob 保存 LF 字节。本候选采用 Git 原始字节 SHA-256/bytes 与真实 blob ID，工作区摘要另列。它们引用的 PNG 没有因此变化；不是 15 个新画布或新增高清。
- `map.known/status.hud/control.action/fx.hit` 共用同一个 `prototype/ui.js` 物理文件。旧摘要为 `de0ada131263f21fb4275800b0a394fa798db20672c54282bc38c7fcf28a2626`，本起点实际 Git 源摘要为 `3415acd09ef42b78d299315c2b93f539742a1de4c83db0f2779be5d24b4b0be4`。这是4个逻辑登记、1个过期源文件引用；第5组件 `frame.nine` 的独立源没有该差异。

`catalog-rebind-proposal.patch` 只有 19 行旧 sha256→新 sha256 替换，未应用。已执行只读 `git apply --check`；没有执行 apply、旧目录生成或批量行尾转换。原 catalog、生成器、17 SVG 及64 PNG都受3185对象保护。

实际阅读旧 `readiness-001/tools/catalog.py`：其 `build()` 对 PNG、SVG 和 prototype 组件使用工作区 `read_bytes()` 摘要，`save()` 写回历史目录；还会写 TEST 染色 SVG/主题清单。本任务没有运行它。在 CRLF checkout 上直接重跑仍可能把工作区换行摘要重新写进 catalog，不能以“重新生成一次”解决来源语义。

若以后专门授权修生成器，建议仅增加显式固定 `sourceCommit` 输入并从 `git cat-file blob <commit>:<path>` 读取源字节；同一路径的4逻辑键复用同一份 canonical bytes；输出分列 Git 源 bytes/hash/blob 与 checkout bytes/hash，不悄悄规范化所有文本。继续保留历史R2 baselineSHA身份，给来源选择/CRLF-LF/共享源加入小型反例。精确输出位置、是否更新旧schema/catalog及其审查须另批；本任务不重写生成流水线。

这些纠偏不关闭透明清稿、原生2×、Owner观感或生产采用门槛。
