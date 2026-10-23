# R1 文案、同源与测试映射

作者补修，不是新规则、DEC/UIR、Owner体验或O3批准。起点 `2e3d13a52ada1fdcd9848574e918b97db43cb0c2`，沿用同名分支。

| 项 | 修前真实DOM | 修后 | 新测试／U映射 |
| --- | --- | --- | --- |
| R01/UI-01 | 无照明搜索、无输入调查无独立L0，2项AssertionError | ActionInformationProvider/ActionButton/DetailsPopover；完整无参数只读preview，未齐只describeAction；L1仍一次点击 | review-action-information 2项、review-information-purity 7项；U03/05/06/09 |
| R02/UI-02 | 六能力与中文物品断言失败，7项 | 公开catalog＋publicItemName，原opaque不变 | review-public-copy 7项；U02/04/05 |
| R03/UI-03 | 金属／模块继承medical，2项 | 当前carried及describeAction.items exact opaque；choose再检查membership | review-context-menu 5项；U04/05/09 |
| R04/V01 | 真写入后remount含混not-attempted，1项 | 本页面尚未执行新的保存操作，不改枚举／IO | review-persistence-copy 1项及旧faults；U07/08 |

## 六条公开说明来源

| 展示 | 批准依据与实际核对 | 限定 |
| --- | --- | --- |
| 撬棍 | DEC-052 D02/D03/D07/D09，residence-task/qualification.ts crow方法及现资源资格 | 适用门、柜、解除固定，付耐久，不保证所有障碍 |
| 手电 | 已采纳试用数据、D07/D09；唯一config search.dark/lit、wear.lamp及source查询 | 照明搜索付电量降该次精力，仍可无照明，不送未知产出 |
| 工具箱 | D03/D07/D09；taskMethodChoices仅fire-door支持toolbox | 适用防火门，不声称柜门或任意设施均可维修 |
| 侦察 | D09；taskMethodCost仅match，verify.full/fast与scout对应键 | 通信记录完整6→4、已有匹配条件快核4→3；不泛化所有核对，不揭示隐藏知识 |
| 工程 | D09；fix的manual工程条件复用fix.method | 转运组件手工10精力，方法优惠不叠加 |
| 生存 | D06/D09；唯一survival.hp/bandage.hp及正式medical | 首次合格绷带总恢复2而非1+2，后续1；目标不变，休整／读取不刷新 |

数字只读导入 `infectedWorldSupplyValues`。component→转运组件、module→通信模块取自既有正式任务动作称呼，覆盖地面、携带、菜单、参数、格位aria、材料、结果、title/aria。仅Presentation映射，不改领域name/definition/instance或保存，不按中文重找第一件。

## 安全与次数

Hover／Focus／ⓘ只读，可关闭、Escape返回入口。完整请求的费用／支付／机制直接SafeFacts；参数未齐只说明缺项／声明材料产物，不擅填工具或格位。无producer/resolver试算、raw current、Storage、隐藏HP／未来roll或metadata第二缓存。新current／冷恢复／失锁关闭旧L0；same-current retrySave保持opaque。

源搜索／调查L0：0 dispatch/current/native notice/read/write/draw/签发/消费；主点击1次→1 dispatch/current/notice/checkpoint。合法快捷绷带上下文绑定原candidate，一次消费，无refill。retry仅1 encode/write，0 dispatch/current/native notice/draw；未知程序异常重抛。

隐藏消毒／抑制菜单分别用真实P＋严格codec TEST前态：同当前公开病程，隐藏进度61/89、暴露0/2，菜单／参数／unknown预览完全相同、0写入。不是空档主链，也不保证药房默认产出两药。原opposite-sample默认RNG及敌HP隐私回归不变。金属／模块无medical，模块移动／留置保持；通用药食仍可另选合法药。

## 两份旧测试／driver的授权更新

- accessibility.test.tsx：原全局dialog定位改为精确modal定位，增加返回焦点引发的L0非模态断言；原焦点和0 IO/dispatch/current/notice/draw/medical断言全部保留。
- route-test-fixtures.ts：仅材料input aria、tile aria和拾取button可访问名映射；原A/B策略正文逐字节相同，seed、顺序、数量／格位、资源／金额／身份／保存断言不变。browser-cases与E03/helper只读。

新增5文件22项，替换0、删除0、净增22；仅新模块长链用例局部30000ms，旧／全局预算、worker、CI、依赖不变。原12项修前均真实语义失败；类型／缺物TEST适配及后续定位失败分账，见implementation-notes。原E03四route ID／72默认样本在实际完整套件中回归，不宣称全部样本通关。

U01旧入口隔离、U07/08保存／锁、U09隐私及U10责任继续原矩阵。实际结果见[核验](verification-results.json)、[浏览器](browser-results.json)、[视觉](visual-review.md)。准确SHA复审、Owner体验及O3未关闭。
