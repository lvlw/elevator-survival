# Core

纯 TypeScript 规则、状态转移、Effect、确定性随机与结算逻辑的边界。

- 配置契约和运行时校验属于核心，具体医院配置不属于核心。
- 最小 Run 身份在创建时绑定已注册的规则版本。
- 核心不依赖 React、React DOM、Zustand、DOM 或浏览器 API。
- 本阶段仍不实现场景、战斗、库存、维修或日结算规则。
