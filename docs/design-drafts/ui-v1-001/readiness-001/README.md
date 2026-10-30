# WORLD-UI-VISUAL-READINESS-001

状态：DESIGN REVIEW CANDIDATE / DELIVERED_WITH_FINDINGS。R2 仍为 INCOMPLETE_ART；本目录不是正式 UI、素材采用或生产开工授权。

起点：`956da8065030ccea15256e49bd927a4e6a71942f`。工作分支：`feature/design-ui-readiness-001`，R2 原分支引用保留。最终提交、父提交、tree、推送与包摘要在仓库外 `FINAL-REPORT.md`，不循环写入自身提交。

- [玩家文案表](copy-table.md)：25 页面族、保留事实、确认等级与作者说明。
- [主题规范与替换指南](theme/GUIDE.md)、[完整目录](theme/catalog.json)、[覆盖审计](theme/coverage.json)。
- [方法验证](art-methods.md)：两次内置生成试验均未采用；不扩展生产。
- [本地审阅入口](review/index.html)、[部署准备](deployment-preflight.md)。
- [工程合同候选 A](contracts/A-public-visual-key.md)、[B](contracts/B-committed-motion.md)、[C](contracts/C-staged-ui.md)。均须准确 SHA 实审和另行下发。

原件、历史与验证分层：`inputs/` 是本包10份原件；`validation/baseline.json` 为实际开工回执；`validation/browser/` 是本轮应用内浏览器观察，未冒称 Edge；旧 validation 和 R2 177 张图均只读。工具／临时路径错误不算语义拒绝。

命令（仓库根执行，使用现有 Python/Pillow 与 Node，不安装依赖）：

```text
python -B docs/design-drafts/ui-v1-001/readiness-001/tools/theme_check.py
node docs/design-drafts/ui-v1-001/readiness-001/tools/presentation-check.cjs
python -B docs/design-drafts/ui-v1-001/readiness-001/tools/delivery.py test
python -B docs/design-drafts/ui-v1-001/readiness-001/tools/delivery.py build --out ABSOLUTE_EXTERNAL_DIRECTORY --target FULL_SHA --art ABSOLUTE_METHOD_ORIGINALS_DIRECTORY
python -B docs/design-drafts/ui-v1-001/readiness-001/tools/delivery.py verify --out ABSOLUTE_EXTERNAL_DIRECTORY
python -B docs/design-drafts/ui-v1-001/readiness-001/tools/serve.py --root ABSOLUTE_REVIEW_SITE --port 8768
```

统一入口为 `tools/readiness.py validate`、`test`、`build-review`、`verify-artifact`。后两者分别接受上面的 `--out --target --art`、`--out` 参数。`--art` 内须有候选包 `method-proofs/` 中两份原件，摘要必须匹配已提交方法回执；不可用旧R2图代替。使用新的仓库外输出目录，避免把其他任务文件混入制品。

发布判断不由检查数量替代。生产 test/typecheck/build 起始与最终均 NOT RUN；新增生产测试0。没有服务器登录、部署、旧Wiki修改、O3决定、音频或关机操作。


## R1 限定补修续办

起点 `8ffe22616c68d806d7bda48d55e0adf6383765c4`，沿用 `feature/design-ui-readiness-001`。仅补玩家动态文案、浏览器 SVG 内容校验及 ZIP 实际条目唯一性；旧报告与失败记录保持原字节。

[R1 完整报告与复跑入口](r1/report.md)；[修前 CLI](r1/before/cli.json)、[修前浏览器主题](r1/before/browser-theme.json)、[修后 CLI](r1/after/cli.json)、[修后浏览器主题](r1/after/browser-theme.json)。本次只交新版 MAINLINE-REVIEW；原候选素材未变，不重复打包。INCOMPLETE_ART 仍未关闭。


## R2：动态战损主题保持

起点 `8bd50890be44d8ab0921e3bc4b1fabab1a8e1203`。仅在新敌人节点插入后复用当前主题映射；不改动作、阶段上限或演出时长。修前原生反例、修后实图及检查见 [R2报告](r2/report.md)。原R1报告、范围脚本和证据均保持；INCOMPLETE_ART不变。
