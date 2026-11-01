# ART-WORLD-ASSET-ADOPTION-PREP-001

从 [OWNER-REVIEW.md](OWNER-REVIEW.md) 的一份主推荐开始：三敌完整五态 15 张先行候选，当前玩家 v2 延期。然后打开实际只读评审入口；本页不是生产 C2，也不承接第三轮 C16。

仓库根目录，在已有 Python/Pillow 环境执行：

```powershell
python -B -X utf8 docs/design-drafts/ui-v1-001/adoption-prep-001/preview_server.py
```

打开 `http://127.0.0.1:8871/`。无新依赖，不写存档，只绑定回环。服务只暴露显式列明的本任务页/派生图，以及固定提交下 64 PNG 与 17 个安全注册 SVG；不暴露仓库根、旧原型 JS、.git、环境、用户文件或存档。退出用该任务终端 Ctrl+C。

本机实际已有 Python 为 `C:\Users\zjl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`。若解压交付 ZIP 后使用 `source/.../preview_server.py`，加 `--repo E:\projects\elevator-survival` 指向保有准确 sourceCommit 的仓库。ZIP 没有复制整套 64 源图；四张派生总览和重点对照可以直接打开，原图入口需要该固定源仓库。

## 文件入口

- `candidate-bindings.json`：86 个逻辑项、83 个物理文件；64 栅格、17 SVG、5 代码组件，另列 15 槽引用，不重复加算资产。
- `metadata-discrepancies.json`、`catalog-rebind-proposal.patch`：19 项旧值到 Git 源字节的候选纠偏，**未应用**。旧 catalog、生成器、SVG 均冻结。
- `PIXEL-REVIEW.md`、`pixel-review.json`、`pixel-measurements.json`、`background-audit.json`：实际观感与测量分列，64 总览/16 重点，不将脚本 PASS 当美术批准。
- `derived-manifest.json`：24 张标明 DERIVED 的对照；16 个边缘裁片为无损 PNG，其余为带标签的 JPEG 缩略/叠底。不是原图、高清资产或浏览器截图。
- `index.html`、`review.css`、`review.js`、`preview_server.py`：实际静态只读入口，没有游戏 main、PlayerSession、controls、存储或虚构动作动画。
- `C2-CONTRACT-DRAFT.md`、`C2-ASSET-APPENDIX.md`：仅未来精确候选，不授权实现。
- `OPEN-GATES.md`：C16、Owner体验、历史原件缺口、最终清稿、背景 2×等保持独立。
- `inputs/`：本任务完整 12 文件输入逐字节归档；主线 AUD 仍是本次收到的原件，不改写历史身份。

工具复核：

```powershell
python -B -X utf8 docs/design-drafts/ui-v1-001/adoption-prep-001/asset_review.py validate
python -B -X utf8 docs/design-drafts/ui-v1-001/adoption-prep-001/test_review_tools.py
```

`asset_review.py build/derive` 仅用于重算本前缀的候选元数据/派生证据，不运行旧生成器；`build` 会把主推荐重置为待像素审阅初稿，不能拿重算结果覆盖已完成的逐项视觉审看结论。`derive` 只写派生件与 `pixel-measurements.json`，不产生/修改源美术。

实际执行记录、原生静态页截图、保护回执、准确 final/parent/tree 与精确 CI 放在唯一交付 ZIP 根报告及 `evidence/`/`git/`。准确 final SHA 不写入自身提交以避免自指；不要拿本文件的 sourceCommit 冒充工程 final。

推荐配置来自用户：GPT-6.1 Sol / high / Standard。宿主没有提供可独立核验的实际模型、reasoning effort 或计费模式；如实记为 UNCONFIRMED，不把推荐当实配。工具协作模式为 Default，未新建子代理。
