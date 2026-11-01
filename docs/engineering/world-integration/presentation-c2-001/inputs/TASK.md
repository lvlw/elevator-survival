# ENG-WORLD-PRESENTATION-C2-001｜正式工程任务书 v1.0

## 目标与准确起点

将获批三敌15张静态图接入**已有独立DEV可玩感染世界**，由A当前公开身份和正式公开阶段选择；在保留阶段文字、玩家中性占位、原动作与B1/C1反馈的前提下，完成加载、回退、生命周期和实际布局验收。不是设计原型换皮，也不新增玩家内容入口。

| 项 | 固定值 |
|---|---|
| 仓库 | `lvlw/elevator-survival` |
| 起始SHA | `4f349d97024151ac79aa099425ce83217ef47b31` |
| 起始Tree | `3ddf6b8097e9dec899dd3e3dc7de7c149672c930` |
| 新分支 | `feature/world-presentation-c2-001` |
| 任务文档目录 | `docs/engineering/world-integration/presentation-c2-001/` |
| 参考历史基线 | 337个测试文件 / 4858项；不是本轮实际结果 |
| 推荐实配 | GPT-6.1 Sol / high / Standard；不能核验实际配置则UNCONFIRMED |

实际基线重新运行 `npm run test:run`。当前package中的默认检查为 `npm run check`（架构→类型→测试→构建）；不得改脚本/依赖/CI来迁就本批。

## 必读与来源

遵循当前 `AGENTS.md`：GDD、Vertical Slice、架构、已确认DEC、相关content文档；涉及当前呈现还读 `docs/09-ui-design-record.md` 的当前有效约定、UIR-012/013/015。不得把旧医院一天一场景带回感染世界。

精读起点的：
- `docs/design-drafts/ui-v1-001/adoption-prep-001/` 中 OWNER-REVIEW、PIXEL-REVIEW、C2-ASSET-APPENDIX、C2-CONTRACT-DRAFT、OPEN-GATES；它们的待批状态是当时历史，不需回写。
- `src/ui/infected-world/components/battle-stage.tsx`、`world-stage.tsx`、`app.tsx`、`styles.css`、`presentation/use-committed-presentation.ts`；两个准许适配的旧测试与现有原生测试fixture。
- A/B1公开类型及相关既有测试；只读，不改协议。

本包15资产清单从GitHub固定blob `08173984f6bd99991c153398f41dfebb60df284c` 的候选表摘取，Owner已对该集合采用确认。开工仍须核对源Git字节及注册blob `cb04a06f5cbd79cf73f790a024bdfefc49d94af0`；不能只信本机未提交检出文件。

## W0｜保全、实读与实际基线

实查本地HEAD/branch/status/worktrees/未推送工作和项目refs；保护其他会话工作，不自动stash、reset或清理。必要时创建独立worktree。只从准确SHA开新分支；若同名分支已有工作或起点发生漂移，报告而不覆盖。读取相关AGENTS，核对manifest并归档小型本包输入，运行实际 `npm run test:run`，保留原始日志路径和退出码。

核对源提交可用；若本地缺对象，只按常规权限获取明确源提交，不更换成main或HEAD中的近似图片。检查15图摘要、长度、尺寸和注册关系，然后才复制。

## W1｜精确资产与封闭映射

逐字节复制 `APPROVED-ASSETS.json` 的15张到列明生产目标目录。保持同名、同摘要、同尺寸；零修图、零重编码、零resize、零新增艺术作品。不得运行旧catalog生成器或应用19项历史纠偏patch。

实现封闭的静态import映射与资产准入测试。把源摘要/注册常量作为只读呈现元数据；CI的摘要检查以本包固定清单和当前提交目标文件为依据，**不能依赖CI有旧提交历史或联网获取8c962f9**。本地W0负责原源对象比较，CI浅克隆负责当前15图与批准清单一致。构建缺源、准入摘要/注册错误必须报错，不与运行时回退混同。

## W2｜真实UI接线与资源生命周期

按 `C2-CONTRACT.md` 完成当前组五图准备、原子可用、错误/超时整组中性回退、同步当前组/阶段防串图与过期回调隔离。只替换敌人图层；动作、名称/阶段、公开意图、相对顺序、玩家占位、现有反馈与存档提示均保持。

有限CSS修正只服务演员图层与实际容器约束，不重构Shell或压缩文字以容纳图片。不挂审阅锚点/网格，不加载旧原型/SVG，不新增动画或FX。

## W3｜测试、原生回归与真实浏览器

按矩阵完成正负例、原生controls链、稳定与异常生命周期、DOM隐私、加载不阻塞动作与真实浏览器证据。旧测试只按精确许可适配，所有原玩法/保存/死亡/冷恢复断言保留。

不为凑15槽原生战斗改HP/伤害/阈值；完整渲染表15槽与原生可达样本分账。真实页面使用原入口 `?dev-infected-world=1` 与原React/BrowserOwner，不拿静态审阅页代替。测试数据可复用既有合规生产者及严格checkpoint，不直接伪造current。

同批发现白名单内普通缺陷可自主修复，不需Owner逐函数确认。外部规则/接口确需改变，停止受影响子项，给最小复现和影响，其他工作继续。

## W4｜收口、默认检查、正常推送与停点

执行定向、原相关组合/E03及完整 `npm run check`；检查最终diff、类型、未授权改动、图片字节和项目refs。负控还原后再做最终默认check，不把修改后的旧通过日志冒充最终结果。允许多个正常提交并只推本分支；核对远端最终SHA及准确CI，失败在本批白名单内修订并保留失败信息。

完成报告记录base/final/parent/tree、修改文件、实际开工基线、新增/适配测试数、组合/E03、默认check、负控、浏览器环境与原图/NOT VERIFIED、已知风险和授权停止点。不能核验的配置/CI/平台不填PASS。

**交付方式已简化**：仓库新任务目录保留一份 `REPORT.md`、必要测试/浏览器记录及可定位来源；聊天给准确SHA、CI链接和报告路径。默认不交源码ZIP、完整patch、原图重复副本、全部保护对象清单。已入仓且主线可读的资料无需重复上传；少量未入仓浏览器原图可单独轻附件，说明运行字节所对应的提交/工作区。无需为普通任务重建整个Git根树或另做打包工具测试项目。

完成后停止。新图的实际游戏观感仍待主线/Owner验收；不自动开启B2、玩家/背景采用、整套C、合并或发布。

## 写入白名单

`SCOPE.json`为精确路径清单。既有生产文件只准改 `components/battle-stage.tsx` 和 `styles.css` 的指定窄段；旧测试只准改 `combat.test.tsx` 和 `current-opponent-presentation.test.tsx` 的呈现适配段。新运行模块3个，另允许1个专用loader辅助文件；新测试5个，另允许专用loader测试及1个test fixture。目标PNG精确15项。除此只准在本任务新文档前缀新增。

禁止改core、state、存档、expected、A/B1/C1、BrowserOwner、controller、app/game-shell/world-stage、bootstrap/入口、旧素材/catalog、依赖、CI或正式DEC/UIR。不删旧文件，不扩大白名单；实际不需的可选文件不要为凑结构创建。
