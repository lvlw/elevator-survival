# WORLD-UI-VISUAL-READINESS-001-R2 / F04

限定补修已完成，等待准确SHA专项复审；不代表主线已运行、Owner已批准或生产UI通过。起点 `8bd50890be44d8ab0921e3bc4b1fabab1a8e1203`，分支 `feature/design-ui-readiness-001`。最终SHA、父SHA、tree及推送／远端回执见包根 FINAL-REPORT 与 DELIVERY-RECEIPTS。原 `INCOMPLETE_ART` 保持。

## 修前实际确认

[开工Git回执](before/git.json)记录准确HEAD、分支、干净工作区和空的普通／暂存diff。重新读取实际AGENTS以及相关GDD、切片、架构、DEC-052、UIR快查／UIR-012和敌人内容边界。没有改规则、另开分支或重建场次来修显示。

本执行会话用真实IAB浏览器打开原装卸工样例、选择porter TEST，再键盘激活普通攻击并等待原700ms回调完成。独立只读观察按钮仅将当前getter及DOM属性记到页面，不触发动作或改状态。

| 时点 | 实际themeId | 实际阶段与资源 |
|---|---|---|
| 启用后 | porter-cyan-test | 完好；`enemy-porter-pristine-cyan-test.svg` |
| 原回调后 | porter-cyan-test | 受伤；退回 `editable/assets/enemy-porter-wounded-v1.png`，新节点无baseline标记 |

[完整修前地址记录](before/native.json)、[启用实图](before/01-theme-enabled.jpg)、[丢失主题实图](before/02-stage-lost-theme.jpg)。这才是本轮修前复现，不把主线源码推导写成主线浏览器验证。

## 最小修正与修后

唯一既有运行代码改动：`prototype/ui.js` 在新敌人节点插入之后，调用 `Readiness.assetPass($('.actor.enemy'))`，保留可选Readiness判断。完全复用既有已校验映射与 `data-readiness-base`；`presentation.js` 本轮未改。每次阶段更新不重新请求主题清单、不重新校验或发布主题、不render场次，也不重跑动作；新图片的正常资源加载不等于重新请求主题。

修后普通攻击受伤图是 `enemy-porter-wounded-cyan-test.svg`，baseline标记仍是原受伤PNG；回退恢复同阶段PNG。标志行动推进重伤，防御仍重伤；减少动态后到濒危，主题与玩家文案保留。五阶段用既有 `P16-porter-phases` 作者独立样例核对，失能不通过提高动作上限制造。

- [修后实际地址](after/native.json)
- [主题启用](after/01-theme-enabled.jpg) → [下一阶段仍有主题](after/02-next-stage-themed.jpg) → [回退原图](after/03-baseline-fallback.jpg)
- [五阶段及baseline实际地址](after/native-five-stages.json)、[原生结果断言](after/native-audit.json)、[图像解码／摘要](after/image-audit.json)

## 回归与负控

| 实际执行 | 结果／证明边界 |
|---|---|
| 新增受控回调回归 | 13/13通过：普通／标志行动、连续1→2→3→3、防御不换节点、五阶段及回退、0ms减少动态、动画中启用／回退／换其他主题、非法主题保持、旧回调隔离和无Readiness兼容 |
| 新语义负控 | 仅撤掉新增动态映射，9个断言失败；主要判据是受伤节点**实际src错误**，不是themeId或清单数量；无程序异常充当检出 |
| 原UI R2回归 | 未改的原30项隔离语义回归通过 |
| R1文案 | 原8项＋R1新增17项通过；原文案负控仍检出 |
| 现有theme／delivery | 16项主题、17个打包外层检查通过；外层含资源套件，不简单累加 |
| F02／F03 | 原共享17例CLI主题及8个真实ZIP对照通过；真实IAB另复跑F02同一17例全部通过 |
| 架构 | `npm run validate:architecture`退出0，53 DEC、347 core生产文件 |
| R2范围／UTF-8／链接／diff | 使用本轮起点的新增脚本；证明删掉唯一资源委托后整个ui.js与起点字节相同，其余动作、回调保护、700/0ms、阶段上限及上下文均未改 |

[修前隔离记录](before/isolated.json)、[第一次修后隔离结果](after/isolated.json)、[修正测试设置后的13项及负控](after/isolated-final.json)、[原套件复跑命令与退出码](after/regressions.json)、[F02/F03 CLI结果](after/r1-theme-zip.json)、[本会话F02原生复跑](after/f02-native.json)、[最终范围与封包检查](after/final-checks.json)。

新增隔离测试首次将重伤key误写为`severe`，并在玩家模式读取已隐藏的作者阶段册：出现TypeError和0/5断言，均保留且不算语义检出。随后按未改动的catalog读取真实基线路径、用既有作者阶段册，13项通过；没有修改主题夹具、生产者或动作上限去凑通过。

隔离测试用实际原型源与可控计时器，主题validator边界使用从既有清单构造的已校验映射替身；不是另一套主题校验器／CTB或原生浏览器。真正SVG校验由既有CLI和原生F02套件另证。动画中切换及旧回调竞争的确定性证明来自隔离回归，不冒称主线或浏览器完成这些竞态测试。

## 保留与未运行

旧R1精确字节范围脚本 **NOT RUN**：它限定上一批文字改动，已原字节保留，不为本轮改断言。F01/F02/F03代码、旧输入、旧失败、旧验证、所有CSS、清单和原图均未修改。源码范围检查与 [60项基线复用清单](baseline-reuse.json)提供准确起点及SHA-256；旧素材和夹具只引用，不重新装包。

原生截图为完整1280×720 CSS视口、DPR1、JPEG实际像素，保留1688浮标和只读观察按钮，未重绘／缩放／压缩。主要截图是作者审阅模式；另有减少动态的玩家模式文字观察。没有重测全视口、125%/150%、离线入口或177图，也没有声称这些历史结果本轮通过。

生产test/typecheck/build起始与最终均 **NOT RUN**，新增生产测试0。未生成新美术、未关闭18背景2×／透明清稿门槛、未改生产源码／参数／存档／依赖／CI／正式规则、未部署或进入下一工程。

## 复跑与交付

仓库根：`node docs/design-drafts/ui-v1-001/readiness-001/r2/theme-stage-check.cjs`；R2范围：`python -B docs/design-drafts/ui-v1-001/readiness-001/r2/scope.py`。使用现有依赖，不安装新环境。

真实浏览器：原只读serve的root设为设计根，打开 `readiness-001/r2/native-observer.html?screen=P15-porter&view=review`；启用porter，记录，普通攻击完成后记录，再回退记录。观察器只读，原型加载原 `ui.js`／presentation／theme-lab；不是截图换壳或动作替身。

只交一个小型 MAINLINE-REVIEW增量包：3份既有文件的最终提交版本、r2新增源码／回执、2张修前＋3张修后实图。包依赖准确起点仓库，不声称完整站点自包含；不重复CANDIDATE-ASSETS和旧夹具。普通commit／push后独立核验远端与工作区，停止等待主线准确SHA专项复审。
