# WORLD-UI-VISUAL-READINESS-001-R1 完整报告

状态：限定补修候选，等待准确SHA专项复审。`INCOMPLETE_ART` 保持；本轮没有制作或采用新美术。准确最终SHA、父SHA、tree、远端及命令回执由提交后的 MAINLINE-REVIEW 包提供，不在提交内伪造自身SHA。

起点 `8ffe22616c68d806d7bda48d55e0adf6383765c4`；沿用 `feature/design-ui-readiness-001`。开工 HEAD、分支、status、普通及暂存diff核对一致且干净；已重新阅读实际AGENTS、原任务书及相关正式章节。旧R2分支继续停在 `956da8065030ccea15256e49bd927a4e6a71942f`。要求沿用 GPT-6 Astra／极高；实际运行配置无法独立核验，未请求升级。

## F01 玩家动态文字

修前真实浏览器已操作搜索、采样、维护、攻击、防御与保存重试：搜索／采样／维护／攻击／重试仍出现作者工程说明；防御的底部反馈已经玩家化，但决策条仍有示范说明。背包仍有“独立迁移”等文字。来源是本轮实际操作，不把主线静态发现冒称已运行反例。

`presentation.js` 新增明确整句映射；初始HTML、属性和动态文字统一经 `Readiness.text`。`ui.js` 仅增加同一纯呈现委托，反馈原文、动作、上下文和计时器保持。整个文件可逆去除八处限定文字委托后与基线逐字符一致；检查不依赖新解析器。

修后真实浏览器的背包初态、搜索、采样、维护、攻击、防御、保存重试、医疗初态和unknown操作共9项有效观察符合预期。初始和重绘的一致性另外由17项隔离回归覆盖，不能混称原生浏览器检查。支付10／6、外套12/12→11/12、未知暴露、医疗unknown、明确参数、失败保存和原对象均保留。作者模式仍保留工程说明，玩家仍显示整体设计模拟标识。

- [修前动态记录](before/player-flows.json)、[修前攻击](before/player-attack.json)及[实图](before/player-attack.jpg)
- [修后动态记录](after/player-flows.json)、[背包实图](after/player-inventory.jpg)、[攻击实图](after/player-attack.jpg)、[医疗unknown实图](after/player-medical-unknown.jpg)

## F02 浏览器与CLI主题一致

对同一份17例语料（3合法、14非法），修前CLI拒绝14非法而浏览器全部接受。修后两入口逐项同码：根尺寸、内嵌图片尺寸、缺失／重复图片、原PNG摘要、NaN／Infinity／越界／截短／改变alpha的矩阵、非matrix类型、缺失矩阵及DOCTYPE。原三类TEST完整组及baseline回退保持。

真实浏览器使用原 `ThemeLab.validate`、DOMParser、Image解码和 `Readiness.setTheme`。试验页仅将固定夹具响应送入原入口，没有扩大主题路径或创建规则引擎。运行前实际选中绷带与第3列第2行；每例核对原主题、场景、对象、参数和拒绝原子性，回退保持同一上下文。

- [共享夹具](fixtures/cases.json)、[CLI修前](before/cli.json)、[浏览器修前](before/browser-theme.json)
- [CLI修后](after/cli.json)、[真实浏览器修后](after/browser-theme.json)、[选择前提](after/browser-theme-precondition.json)、[回退](after/browser-theme-fallback.json)
- [浏览器语义负控](after/browser-theme-negative.json)：只撤掉内容门禁，14非法再度被接受，未出现程序异常；因此是有效负控检出。

## F03 ZIP实际唯一性

修前实际写出ZIP文件：同名同字节、同名不同字节、重复清单条目均被旧verify接受；缺文件抛KeyError，不能计作语义拒绝。额外文件已明确拒绝。原始输出与退出1保存在修前回执。

现在先检查 `infolist()` 实际条目唯一，再检查清单路径唯一；之后验证缺失／额外条目、字节摘要及artifactId。8例真实ZIP对照通过：合法包、上述三种重复、缺文件、额外文件、载荷篡改、绑定提交篡改。没有扩大格式或路径权限。包制作从准确提交的Git对象读取，再独立比对源文件blob。

两项ZIP语义负控分别撤掉物理条目门禁与清单门禁，分别重新接受重复ZIP和重复清单；无程序异常。候选素材未变，新verify还只读核验了原两包及142文件站点闭包，全部通过，没有重打旧包。

## 实际检查分层

| 检查 | 结果与边界 |
|---|---|
| 原R2隔离回归 | 原30项复跑通过；不改旧脚本和旧回执 |
| 原theme | 原16例通过 |
| 原presentation | 原8例通过，原两项语义负控仍检出 |
| 原delivery | 原17个外层检查通过，其中包含资源套件，不与16简单相加 |
| R1呈现 | 17项通过；撤掉动态整句入口后9个断言失败，检出负控 |
| R1主题 | 同一17例在CLI、真实浏览器均通过；浏览器撤门禁负控检出14例 |
| R1真实ZIP | 8项通过；两个独立去门禁负控均检出 |
| 浏览器 | 9项有效页面／操作观察、主题拒绝／合法／回退；IAB 1280×720、DPR1 |
| 原包兼容 | 原两个ZIP及142文件只读站校验通过 |
| 架构 | `npm run validate:architecture` 退出0；53 DEC、347 core生产文件 |
| 范围／历史／链接／UTF-8／资源／diff | 最终实际回执见下方；原W01/W02历史例外不扩到本轮增量 |
| 生产 test/typecheck/build | 起始与最终均 NOT RUN；新增生产测试0 |

[首轮完整回执](after/checks-round1.json)、[修正后检查回执](after/checks-round2.json)、[范围与diff回执](after/checks-final.json)、[封包前复核](after/checks-release.json)。浏览器另见 [实际环境](after/browser-environment.json)。所有数字分层报告，不用检查总数宣告美术或生产COMPLETE。

## 保留的失败与未完成项

首轮新jsdom测试用独立eval导致 `SCREENS is not defined`，改为同一VM上下文后通过；错误未计语义检出。额外源码AST审计因当前TypeScript包仅暴露版本API而TypeError，改为完整源码的精确可逆比较；不声称做过AST检查。一次浏览器支付断言误用简写“外套12→11”，更正为实际完整度文字后通过，原失败行保留；一次不存在的控件选择器超时和工具未暴露navigator也单独记录，不算产品反例。

截图是工具实际返回的原生完整视口JPEG，保留1688扩展浮标，未修图。封包前解码发现采集时误用.png后缀，已原字节改名.jpg；四张均为1280×720，摘要与未转换证明见 [图像审计](after/image-audit.json)。未重测125%／150%、file入口、全25族和177张图；只验证本轮影响点。工具限制未用隔离测试冒称浏览器通过。

18背景真实2×、透明清稿及Owner视觉验收仍OPEN；旧方法失败、旧素材、R2截图、输入和验证记录保持。C契约仅澄清异常降级不能代替美术验收。未修改src/public、正式DEC/UIR、规则、保存、依赖或CI；未部署、未操作Wiki、未决定O3、未进入任何工程。

## 复跑与交付

从仓库根目录（使用现有Python/Node环境，不安装依赖）：

```text
python -B docs/design-drafts/ui-v1-001/readiness-001/r1/checks.py --output <仓库外结果.json>
node docs/design-drafts/ui-v1-001/readiness-001/tools/presentation-check.cjs
python -B docs/design-drafts/ui-v1-001/readiness-001/r1/negative-controls.py
node docs/design-drafts/ui-v1-001/readiness-001/r1/semantics-scope.cjs
python -B docs/design-drafts/ui-v1-001/readiness-001/r1/scope.py
```

浏览器复跑：原只读serve入口根设为 `docs/design-drafts/ui-v1-001`，打开 `readiness-001/r1/browser-theme.html?screen=P11-move&view=review`；选择绷带及空格后运行夹具，回退原主题。负控页为同目录 `browser-theme-negative.html`，应有14个预期拒绝被变异版本接受。其文件明确隔离在r1，没有接入原型正式入口。CLI运行不能代替这个浏览器步骤。

本轮只交新版 `MAINLINE-REVIEW.zip`，内含完整报告、变更源码、夹具、检查回执和4张必要实图。包是相对准确起点的增量，不是独立运行整站；依赖基线仓库原素材与既有包，不重新打177图。

候选素材引用原 `CANDIDATE-ASSETS.zip`：11,968,658字节；SHA-256 `e711af0efea9792efb937cdc570a0753cd7d55b7d19706e9aa6360f6e1dd185a`。本次重新核对摘要，未改动、未重打、无需重新上传。

提交及普通push完成后停止，等待主线准确SHA复审；不自动进入生产实现或美术批量制作。

封包复核追加：首次包的根目录 FINAL-REPORT 相对链接仍指向源目录位置；已修正打包器重定位这些链接，并增加ZIP内实际目标检查。首次包和回执只作交付过程记录，最终仅交修正后的新版包；源码与玩法没有因此改变。
