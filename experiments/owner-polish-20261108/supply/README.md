# 隔离物资审计

在任务工作树根目录运行下列命令。仅此独立配置收集实验，不进入默认测试。可选的 `E03_REPORT_DIR` 必须位于仓库外，才会写出 JSON。

```powershell
npm exec -- vitest run --config experiments/owner-polish-20261108/supply/vitest.config.mts --maxWorkers=1 --no-cache
```

[供需、急救包、定向对照](SUPPLY-REVIEW.md) · [治疗候选](TREATMENT-CANDIDATES.md)

`evidence/` 含当次原始定向运行及脱离日常存档的审计结果。独立候选试验使用正式构造、真实生产计划和明确的 TEST roll。报告的 React 测试在 jsdom 运行。
