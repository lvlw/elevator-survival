# 《电梯求生》

> 一款以异常电梯为中枢、进入不同灾难世界完成限时生存任务的网页单人策略 Roguelite 游戏。

项目已完成纯 TypeScript 规则内核的基础模块，包括版本化配置、确定性随机、场景事务、节点图、背包、物品资源、装备和玩家条件状态。React UI、完整 Run 编排、战斗、医院完整交互流程和存档仍未完成，当前纵向切片尚不可游玩。

## 开发

```bash
npm install
npm run dev
npm run typecheck
npm run test:run
npm run build
```

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
