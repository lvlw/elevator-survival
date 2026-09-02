# 《电梯求生》

> 一款以异常电梯为中枢、进入不同灾难世界完成限时生存任务的网页单人策略 Roguelite 游戏。

## 当前阶段

医院纵向切片的纯 TypeScript 规则核心、稳定 Run phase、最小单槽存档、Headless Application、vanilla StableRunStore、React 一日交互闭环，以及生产浏览器单槽严格加载与恢复入口已实现。生产入口已接入无存档与失败终止来源的医院一日 New Run Setup、实用装备显式三选一、Preview／Confirm、Web Crypto 身份材料、原子创建与首次保存失败提示；现有玩法闭环包括中枢整备、医院探索、战斗、撤离与返回结算、中枢医疗／生存／维护及每日结算。Owner Playability Review Round 1 已完成，首轮玩家信息与交互清晰度修复已完成，等待 Owner Round 2 复测。

## 仍待完成

Profile 持久化、Run Abandon、Day 7 Final Resolver、Success、Crafting、Salvage、完整七日世界及终版视觉尚未实现。无存档时默认入口显示正式 New Run Setup，但不会自动创建或伪造 Run；只有玩家完成显式选择并确认后才会建立 Day 1 中枢并尝试保存。当前状态不代表完整 V1 或完整七日内容已经完成。

## 开发

```bash
npm install
npm run dev
npm run typecheck
npm run test:run
npm run build
```

开发环境默认同样执行真实浏览器存档恢复。仅在需要观察固定内存示例时显式打开 `/?dev-ui-preview=1`；该入口不会读写真实 Run 存档，且不会进入生产构建。

- `src/core`：纯 TypeScript 规则与结算。
- `src/content`：版本化内容配置。
- `src/state`：应用状态与持久化适配。
- `src/ui`：不拥有规则的展示组件。

## 文档入口

- [项目协作规则](AGENTS.md)
- [产品愿景与设计支柱](docs/00-product-vision.md)
- [游戏设计共识 v0.1](docs/01-game-design-v0.1.md)
- [首个纵向切片范围与验收标准](docs/02-vertical-slice.md)
- [技术架构与模块边界](docs/03-architecture.md)
- [数据配置和 Schema 设计](docs/04-content-schema.md)
- [设计决策记录](docs/05-design-decisions.md)
- [设计决策覆盖关系索引](docs/07-decision-supersession-index.md)
- [医院纵向切片冻结快照与实现入口](docs/06-vertical-slice-design-freeze-v0.1.md)
- [规则实现追踪矩阵](docs/08-rule-implementation-traceability.md)

## 游戏设计导航

- [产品定位与长期循环](docs/01-game-design-v0.1.md#1-产品定位)
- [首版范围、单局目标与时长](docs/01-game-design-v0.1.md#3-首版总体范围)
- [每日循环、场景与节点](docs/01-game-design-v0.1.md#6-每日循环)
- [玩家角色、状态与效果](docs/01-game-design-v0.1.md#10-玩家角色与专长)
- [背包、重量与装备](docs/01-game-design-v0.1.md#13-背包与物品容器)
- [资源、战斗、撤退与评级](docs/01-game-design-v0.1.md#18-资源经济原则)
- [存档、中枢与永久成长](docs/01-game-design-v0.1.md#22-自动保存与运行存档)
- [程序生成与技术架构](docs/01-game-design-v0.1.md#25-程序生成与ai生成)
- [首版明确不做](docs/01-game-design-v0.1.md#28-首版明确不做)
- [尚待完成的关键设计](docs/01-game-design-v0.1.md#29-尚待完成的关键设计)
- [开工边界与纵向切片目标](docs/01-game-design-v0.1.md#30-开工边界)

## 内容设计入口

- [物品与装备](docs/content/items.md)
- [场景](docs/content/scenes.md)
- [事件](docs/content/events.md)
- [敌人](docs/content/enemies.md)
