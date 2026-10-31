# ENG-WORLD-PRESENTATION-C1-001 审查入口

本批仅把已审 A 当前对手名称和 B1 单条已提交玩家动作回执接入现有独立 DEV React 界面。输入包、主线 B1 审查原件完整保存在 inputs/；用户本轮明确授权 C1，历史文件中的旧停止点不作为新的授权。

准确起点 d31828a74fcb1b2e28c0f070ad7f8fd3b3e87cc4，起点 tree 85ac8131fd81c106b781667b9db60d21fd6298e0；工作分支 feature/world-presentation-c1-001。最终 SHA、parent、tree、全部中间提交、push 回读与准确 SHA CI 在交付 ZIP 外层 git-receipt.json / FINAL-REPORT.md，避免提交自身 SHA 的循环绑定。

阅读顺序：IMPLEMENTATION-PLAN.md → CONTRACT-AND-SUPPORT.md → TEST-INVENTORY.json → VERIFICATION-RESULTS.json → BROWSER-REVIEW.md → completion.md。SOURCE-REFERENCES-ACTUAL.json 是准确 base 源码与实际阅读索引；OPEN-GATES.md 保留原门槛。

本轮新增 7 个测试文件、59 项测试；实际基线 330 文件/4799 项通过，定向 7/59、相关组合及 E03 169/1781、最终默认 check 337/4858 通过。组合执行时尚为 57 项新增；其后两项生命周期回归已进入最终定向与默认 check。四项外部语义负控业务检出，原正控 3 文件/34 项通过；负控不计入游戏测试数。

真实浏览器使用现有生产 React DEV 入口和原 BrowserOwner；合法 checkpoint、故障注入、DOM 计数均为明确标注的 TEST 工具。交付六张未经编辑的原生 JPEG 和环境/动作/源码对象绑定。C16 为部分覆盖：实际 OS reduced-motion=true、真实 125%/150% 缩放、完整 1920 视口像素与 390 全页截图未验证；不能称浏览器矩阵全通过。细节见 BROWSER-REVIEW.md。

复查工具（不属于生产框架，不被 UI 导入）：scope_check.py 校验暂存/工作区白名单、唯一旧断言、保护对象和原输入；negative-controls.py 仅作用于仓库外副本；build_review.py build <外部工作目录> 从最终 Git 字节创建唯一 MAINLINE-REVIEW.zip，verify 可独立复核摘要、CRC、源码 blob 和清单；test_review_tools.py 单独验证交付工具。原始检查、负控、截图和 Git/CI 回执只进入轻包，未重打旧图库、依赖、profile 或存档。

完成后等待主线 C1 准确 SHA 及实际 UI 证据审查。没有 Owner 人工体验通过、B2、完整 C、美术采用、合并或发布授权。
