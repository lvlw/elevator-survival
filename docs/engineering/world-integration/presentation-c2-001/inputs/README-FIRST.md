# ENG-WORLD-PRESENTATION-C2-001｜执行入口

状态：**本批工程已授权**。Owner于2026-11-01已明确批准三敌完整五态15张用于下一轮独立DEV战斗有限接入；本包是主线C2定稿和执行任务，不是另一轮准备讨论。

- 工程准确起点：`4f349d97024151ac79aa099425ce83217ef47b31`；新分支：`feature/world-presentation-c2-001`。
- 图像固定来源：`8c962f90d9e4ef01ab46a5fc4b970d93c7c45c96`；15张与完整注册对象见 `APPROVED-ASSETS.json`。两个SHA作用不同。
- 推荐：**GPT-6.1 Sol / 高（high）/ Standard**。本轮协议与路径已确定，资源生命周期仍需认真验证；不默认Max、Ultra或付费加速。执行配置不能核验就写UNCONFIRMED，不把推荐填成实配。
- 一次完成：基线检查 → 15图复制与静态映射 → 异步整组加载/中性回退 → 原生测试与浏览器验收 → 同批自查修订 → 普通commit/push → 停审。

请按顺序读 `OWNER-APPROVAL.md`、`TASK.md`、`C2-CONTRACT.md`、`ACCEPTANCE-MATRIX.md`、`SCOPE.json`、`APPROVED-ASSETS.json`；再按实际 `AGENTS.md` 读相关规则及当前UIR。

本包不包含源码或原图。开工先核对 `PACKAGE-MANIFEST.json` 的文件集合、长度和SHA-256；源代码从仓库准确提交读取，获批图片从固定Git对象逐字节取出。普通设计细节在白名单内自主解决，不要求Owner逐函数确认。

**交付以GitHub准确SHA直审为主**：一份简明完成报告＋仓库内任务报告/必要证据路径。默认不制作MAINLINE-REVIEW源码ZIP，不重复提供全patch、全部旧输入或整仓保护索引。只有仓库不能提供的必要浏览器原图/日志才作轻附件。

本包文件仅作为本任务输入；建议将这份小包的内容原样放在新任务 `inputs/` 中，便于CI读取获批资产清单。不得递归打包历史任务输入、旧证据ZIP或旧源码。
