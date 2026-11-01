# C2 首批敌人静态美术接入合同草案

**DRAFT / NOT APPROVED / NOT IMPLEMENTED。** 本任务止于素材准入准备。主线必须先审本次准确 final SHA，Owner 必须集中批准 [主推荐](OWNER-REVIEW.md) 的准确 15 图摘要、整组边界与已展示彩边例外，再另发 C2 精确工程授权。玩家 v2 延期，现有中性玩家保持。以下路径和验收只是可审草案，不能自动开工。

## 精确候选改动路径

| 拟操作 | 路径 | 唯一用途 |
| --- | --- | --- |
| 新增 | `src/ui/infected-world/presentation/approved-enemy-art.ts` | 三个封闭五态组、固定静态 import、原生尺寸/注册变换/原路径与摘要；不是通用主题总线 |
| 新增 | `src/ui/infected-world/presentation/use-enemy-art.ts` | 仅呈现层的整组 preload/decode 和取消/过期返回隔离，不接会话提交或保存 |
| 新增 | `src/ui/infected-world/components/enemy-art.tsx` | 已知当前对手的静态注册画布与中性回退；保留可读阶段与名称 |
| 局部修改 | `src/ui/infected-world/components/battle-stage.tsx` | 仅替换当前 enemy 中性图层；原玩家、意图、相对顺序和 ActionButton 请求绑定保持 |
| 局部修改 | `src/ui/infected-world/styles.css` | 仅演员图层/注册画布 containment；不换三栏、字体、弹层或整体壳布局 |
| 新增 | `src/ui/infected-world/presentation/approved-enemy-art.test.ts` | 三组五态固定表/整组缺失/未知键/源摘要构建检查 |
| 新增 | `src/ui/infected-world/presentation/use-enemy-art.test.tsx` | 加载失败、取消、迟到 onload/decode、跨组/阶段切换，不发玩法请求 |
| 新增 | `src/ui/infected-world/components/enemy-art.test.tsx` | 真 DOM 安全投影、名称/阶段、unknown/null、遮挡与语义 |
| 新增 | `src/assets/presentation/world-battle-v1/` 下本草案附录的准确 15 个同名 PNG | 从已获 Owner 批准的源 Git 字节逐字节复制；零修图、零重编码、无新图 |

不拟修改 `assets.ts`（当前仅物品和已知大厅/走廊图）、`app.tsx`、`game-shell.tsx`、`use-browser-owner.ts`、`use-committed-presentation.ts`、A/B1 协议、BrowserOwner、controller、规则/S/current/保存、expected、依赖、CI。若实际实现需要扩出此表，停止受影响子项并另审范围；不能顺手改 owner 或容器生命周期。

## 输入与安全选择

实际 `player-types.ts` 已有：`view.combat` 为 null 或当前战斗；`opponent` 仅为 `kind:'known'` 配三种 `visualKey` 与对应已批名称，或 `kind:'unknown',visualKey:null,name:'当前对手'`；阶段直接用 `combat.enemyStage`。React 只读这几个正式公开事实，不导入 core 全量快照、S、定义/实例 ID、精确 HP、raw trace、Feed 或 B1 动作推算姿态。图片路径/注册元数据只能在呈现层封闭表中，不加进 A/query、command 或存档。

`infected-orderly`、`infected-porter`、`infected-technician` 各严格对应附录五槽。阶段 `healthy/wounded/severely-wounded/critical/incapacitated` 直接查对应项；历史文件名 `pristine/heavy_wounded/disabled` 只是资产后缀，不改变公开语义。不得按地点、上一战、label 或 HP 差猜身份。

`unknown`、未知组/阶段、资产未批准、加载中或整组失败均显示明确中性敌占位，名称/阶段文字仍只取公开事实；不借另一敌人、不回看旧战斗、不用玩家旧 v1 填空。`combat=null` 或页面不再展示战斗时立即清旧敌人，旧资源加载回调无权复现旧组。玩家继续中性，不显示持管 v2；未来解决玩家素材须另有准确批准。

## 整组资源与几何

构建前核对 15 个源 Git bytes/SHA-256、真实 PNG 尺寸、透明通道及注册对象；只认可明确批准的精确字节。生产资源为 Vite 静态 import，不能接受任意运行时 URL、外链 SVG、远端 catalog 或 prototype JS。1536×1920 只是共同注册坐标，不是新原生高清。整张源图按原 `scale/translate/imageCss` 放入固定 4:5 容器，不逐阶段 trim、拉伸或改锚；保留主体 `containment`，对五态的脚点支撑中心逐个检查。命中锚保留出处但本 C2 **不启用 FX、位移、逐击、时间轴或新动画**。

当正式当前 `known` 组被选择才在局部呈现 hook 中预解码该组全部五图；任一成员失败，整个组不可发布，只留中性占位。没有获批的旧成员显式保留表，因此不能“其余四张新图＋一张旧图”混用。两个敌组不得交叉拼接。组准备完成才原子发布该组，阶段只能从已批准组读；玩家候选不参与此组。

每次对手组/展示挂载变化，用组件本地只读资源 generation/取消标记隔离迟到 onload、decode promise 和错误回调。该 generation 只控制图层归属，**不是 selector scope、B1 scope 或第二个 gameplay/current owner**。卸载/失权/非稳定视图不保留可交互旧画布；过期回调不写另一个组、不触发 controls、不保存、不派发 token。资源等待不得阻塞原动作、修改 singleFlight、重提请求或延迟核心稳定提交。

## DOM、生命周期与回归验收

图片 `alt` 只用公开名称/公开阶段；不得把原始定义/实例键、精确 HP、内部队列、完整存档或 raw trace 塞入 text/title/data-*/aria/调试隐藏节点。静态 import 资源 URL 属于构建资源，不作为 gameplay 身份。错误提示不输出内部路径/存档内容。A 公开键仍只属于呈现选择。

15 槽表完整验证与真实三敌活动四态分别记账；失能槽用 renderer TEST-only 明确公共输入验证，不创建活动 HP0 快照，不将跪姿判为死亡/胜利。`combat=null`、实际死亡、退却和返回都按正式 view 清旧图。B1/C1 保持直接返回消费、scope 按引用/高水位、取消/跳过/减少动态及异步过期回调行为；图像加载不新建/重发 token，retrySave/冷恢复仍不重放。保存失败保持“已生效、未保存”，不回滚。

新测试须覆盖：三组×五态和 unknown/null；缺文件/坏摘要/解码失败整组降级；跨组/阶段、busy→stable、失权、卸载/晚返回；DOM 不泄露；文字/行动的 request/opaque 绑定、L0—L3 与单 writer 原测试不放宽。真实生产 React 页在 1920/1600/1440/1366/1280 核验完整 actor containment、名称/阶段/意图与按钮触达，正常/最大层保持原布局；补 C16 能力不足项必须获得实际能力证据，不能静态页代验。实际 `test:run` 基线、定向/组合/E03、默认 `npm run check`、精确 final CI、源图/范围保护和少量原生 UI 证据后停审，不自动 B2、整套 C、背景采用或发布。

## 固定源附录

准确逐槽表见同目录 `C2-ASSET-APPENDIX.md`。唯一源提交为 `8c962f90d9e4ef01ab46a5fc4b970d93c7c45c96`；源目录 `docs/design-drafts/ui-v1-001/editable/assets/`，目标目录仅为上述 `src/assets/presentation/world-battle-v1/`。每个文件保持同名、同字节、同 SHA-256。注册来自同提交 `spec/registered-art.json`，由候选清单携带原完整对象。此附录仍不是采用批准。
