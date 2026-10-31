# ENG-WORLD-PRESENTATION-C1-001 完整工程任务

## 目标与推荐配置

将已审A/B1接入现有可玩的独立DEV界面，一次交付生产临时消费者、真实交互/故障边界、自动与浏览器证据。不是再研究候选接口，不是全面美术换皮。
推荐沿用GPT-6.1 Sol／极高（xhigh）／普通Standard，不要求Max/Ultra。理由是本批新增React副作用生命周期、同步提交与失锁竞态，需仔细做同源计数/隐私/回归；并非官方能力排名。实际菜单/执行档位不能独立核验时写NOT_INDEPENDENTLY_VERIFIED，不虚报已设定、不另开计费API或加速模式。

## W0 开工保全与基线

核验包、实际AGENTS、正式DEC及现行UIR；读取实际文件及本包SOURCE-REFERENCES。先查本地HEAD/branch/status/普通与暂存diff、所有worktree、未推送提交及远端refs；如用户改动存在，用非破坏性独立worktree隔离，不stash/reset/clean覆盖。
从完整 `d31828a74fcb1b2e28c0f070ad7f8fd3b3e87cc4` 新建 `feature/world-presentation-c1-001`，确认tree `85ac8131fd81c106b781667b9db60d21fd6298e0`；旧main/baseline/其他分支保持。记录原有Git对象与refs，后续核对保护范围。
实际运行 `npm run test:run` 建立本轮基线。历史4799仅预期参考，不能复制为本轮成绩；失败按真实原因记录，不改旧全局配置压过。
在改实现前用原生API/实际DOM确认：现UI只收状态与直接结果，A名称尚未接入、B1结果未消费，尤其execute/confirm和busy/失权边界。保存简短实现计划与source索引，不等待逐函数批准。

## W1 纯消费协议和A名称

依C1合同实现单pending、高水位、scope引用、owner/controls代、取消/过期callback的纯消费者。无玩法端口、无存储、无隐藏数据。用确定性时钟与真实B1返回分别验证，不用人工mock载荷替代全部原生证据。
在当前battle组件接A名称与可访问性，unknown不按地点回填。仅改必要UI代码及新模块；相对阶段/意图/支付/原正式按钮保持。三敌五阶段规则与不可达原生组合分账。

## W2 实际React接线

通过现app原execute/confirm返回喂唯一消费入口；保持原preview、单次提交、错误与保护。新hook仅在UI持有展示状态，复用原owner，不建立另一个BrowserOwner或生产事件通道。
把短回执/有限CSS动效置于舞台内预留区；必要时通过game-shell/world-stage传只读呈现props，不重写三栏布局。最新view即时落稳。补跳过/本地减少动态/OS偏好，以及卸载、失权、异常、晚到返回、下一命令打断。
不得为了动画更改原请求、组件中重算规则、锁住原可执行选择或在timer回调dispatch。

## W3 自测、负控和真实浏览器

完成ACCEPTANCE-MATRIX逐行证据。新纯测试之外，至少有真实PlayerSession→controller→BrowserOwner→React DOM的实际六类动作、失败保存→retry、退却再入和终局链。特殊条件checkpoint必须由原生产者和严格codec形成，标明TEST边界，不能称read-null自然首玩。
完成四项仓库外语义负控，正控先过，主要判据为业务/计数/DOM断言而非加载异常：重复通知回放、失权后仍显示旧反馈、回调二次dispatch、按私有响应数扩展反馈。可以用等价最小变异，但逐项列来源和检出断言，不改仓库保护源码。
运行原UI、B1新旧相关、query/controller/BrowserOwner及原E03回归；最后执行默认 `npm run check`。长链测试用既有任务局部预算，不改全局配置/CI/worker。最后改了可执行代码或断言，重跑受影响定向及默认check；提交后核对准确最终SHA CI，不把前提交CI算最终。
按BROWSER-AND-EVIDENCE做真实浏览器。任何未跑项如实保留，浏览器不可用不伪造截图/原生通过；其他独立工作完成后交付，准确注明门槛未关闭。

## W4 自审、提交与轻包

逐项检查C01—C09，特别检查busy正常通知与失权不同、StrictMode重装不重复owner/动作、scope不按battle重置、冷恢复无回放、null阶段不当胜利。更新本任务目录的支持矩阵/完成记录/测试清单、来源及保护对象回执；不重写正式规则或历史审查。
许可路径内普通commit/push仅限指定新分支；多个必要检查点可普通追加提交，保留失败与修复，不amend/force。实际新生命周期在本C1范围交付后即停审，不能以长Goal顺带启动B2/完整换皮/美术。

## 交付文件

新文档目录为 `docs/engineering/world-integration/presentation-c1-001/`。至少含 README.md、IMPLEMENTATION-PLAN.md、CONTRACT-AND-SUPPORT.md、TEST-INVENTORY.json、VERIFICATION-RESULTS.json、SOURCE-REFERENCES-ACTUAL.json、BROWSER-REVIEW.md、OPEN-GATES.md、completion.md；输入归档到inputs/保持原字节。可在本目录增加限定测试辅助/校验脚本/必要证据，不准把通用生产框架藏在docs里供UI导入。

仓库外单个MAINLINE-REVIEW.zip含：外层FINAL-REPORT、git-receipt、准确Git字节的全部改动源文件、base→final patch、每文件长度/Git blob/SHA-256清单、原输入保全、原始命令/退出码/失败/负控/CI、少量原生截图与其环境/动作上下文。依赖原仓库即可复跑；不重复整个旧图库、node_modules、profile或真实存档。

最终报告完整base/final/parent/tree、全部中间提交、真实基线/新增与组合/默认检查、变动路径、Browser实际能力/未跑、冲突及范围外检查、push与远端回读、包大小与SHA-256。回执外置避免自身commit循环绑定。输出路径给Owner一个包即可。

停止点：等待主线C1精确SHA、实际浏览器/视觉证据审查；不自动把Owner试玩或最终美术门槛标PASS。
