# 授权与停止点

依据Owner要求主线评审产物并安排下一轮；当前素材采用仍未批准，本包只开展此前允许的设计准备/技术核查。不得创造或改写DEC/UIR、玩法、战略空间或发布承诺。

Repository：lvlw/elevator-survival
Base：8c962f90d9e4ef01ab46a5fc4b970d93c7c45c96
Tree：d4d653f170159ca6f467b7590f0ea8d1dbdc3eeb
New branch：chore/world-asset-adoption-prep-001
唯一允许新文件前缀：docs/design-drafts/ui-v1-001/adoption-prep-001/

允许在此前缀编写实际资产核对、候选纠偏清单、静态只读对照页、像素审查记录、测试工具、采用提案和C2合同草案；允许仓库外保存派生对照图、浏览器原图与完整日志。可只读现有素材与源码，可使用已安装库处理已有图像，但不改变原件。允许本任务回环只读预览服务及独立测试profile，遵循实际工具权限。

允许普通commit/push，仅本新分支。开工先查本地HEAD/status/diff/worktrees/未推送工作和远端；任何真实本地工作不得覆盖。原项目heads、remotes、tags必须保留；新分支及其tracking ref例外。refs/codex等宿主内部命名空间仅记录差异，不主动删除/更新/重建，变化原因不明不猜定。

禁止改所有既有文件，包括原catalog、生成器、素材、生产src、旧测试、样式、规则、协议、保存、expected、依赖/lock、CI及旧审查记录。元数据纠偏在本任务候选清单与未应用patch提案中表达，不原地重写历史，也不把候选清单接成第二个运行时真相。

禁止生成/重绘/清稿/放大新美术、正式采用素材、B2或生产C2、主题SDK、商业插件、部署/隧道/公网、main合并、删除分支、强推、改历史。对照页不得调用游戏入口、PlayerSession/controls、存档或任何玩法命令；不得扩展玩家知识。

上一任务“现有Edge新标签”的Owner许可不自动继承。只能用本任务已获准的浏览器表面；涉及现有日常profile先取得当次许可。能力不足记NOT RUN，不绕过URL/工具限制，不安装扩展，不反复尝试原生媒体true，不要求Owner逐项改OS设置。

完成可视审阅包与草案后停止。主线实审、Owner首批美术采用批准及后续C2开工是分开的步骤。没有Owner明确采用就不进入生产。
