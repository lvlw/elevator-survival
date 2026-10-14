# 本轮执行与证据边界

- 当前主线通过 GitHub connector 读取准确提交、文件、原件目录、CI run/jobs 及完整 job log。
- 容器尝试下载完整仓库时 codeload 域名 DNS 解析失败；没有在此容器运行完整仓库原生测试、72种子实验或四路线。原生模板尚未执行。
- 主线实际执行的是 Git 指纹一致的完整 e03-test-routes.ts 中，按 AST 原样选出的 executeRoute 与 RouteConditionMissing；routePrefix、finishRoute、state、expect 是明确的隔离适配器。它证明异常分类控制流，不证明真实游戏路线或全部新测试一定误报。
- 16项隔离检查：10符合、6不符；预期向外抛出的异常以同一对象比较，不把它们算程序崩溃；额外非预期异常0，脚本真实exit1。
- Node v22.16.0，全局 TypeScript只用于转译，不安装／升级项目依赖。
- 完整原生复现由本包模板要求 Codex 在仓库中先执行；结果不得为匹配主线隔离数字而制造。
- CI156真实结果是11个新增长链测试5000ms超时、4295项通过，build skipped。主线没有触发／重跑／取消任何远端工作流。
- 原任务包5份输入的 Git blob 与完整目录指纹独立匹配；不是重跑作者全部范围、链接和1353对象审计。
- 浏览器、玩家界面、多标签、Owner试玩NOT RUN。
