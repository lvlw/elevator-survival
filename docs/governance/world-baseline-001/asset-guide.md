# 既有资产只读复核

[asset-status.json](asset-status.json) 在准确a7上逐文件核对清单、实际检出字节SHA-256、基线Git blob、PNG原生IHDR/CRC/alpha通道能力、SVG引用及代码anchor。64栅格、17注册SVG、5代码组件、15敌人阶段槽数量一致；64PNG的清单/注册原生元信息和15阶段槽引用均匹配。共享底板及对应节点由JSON明列。注册画布和SVG封装尺寸单列，不能当原生高清。

发现19个逻辑条目的元数据风险，未改旧清单或旧素材：

- 15个SVG包装器的catalog摘要匹配本机CRLF检出字节，基线提交为LF；仅行尾不同。清单绑定平台检出字节，跨平台复核会不一致。JSON同时给实际摘要与提交摘要。
- map.known/status.hud/control.action/fx.hit四个逻辑组件共用同一个既有 `prototype/ui.js`；实际文件与a7 Git对象完全一致，但catalog源摘要已滞后。它是一个物理文件的四条逻辑引用，不是四个新改动。

另两个SVG及第五代码组件摘要匹配。所有差异按 PARTIAL_METADATA_DISCREPANCIES 登记，保持基线原件。

未看图像素、未解码观察alpha边缘、未做叠底/浏览器/Owner视觉验收，均 NOT_RUN。PNG具备alpha通道不证明清稿完成。18背景原生2×、最终主体alpha、Owner观感和生产C接线继续开放。作者历史记载的1448×1086背景尝试和playerV3清稿未被采用，按历史记录列出，不重新带入候选包。

本轮无图片生成、编辑、采用或复制进交付包；清单复核不构成正式美术批准。
