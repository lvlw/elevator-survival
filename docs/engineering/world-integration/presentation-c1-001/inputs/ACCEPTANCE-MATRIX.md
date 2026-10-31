# C1验收矩阵

不能把表格行数当测试数；每项列实际文件/用例/命令/证据层和未覆盖项。

| ID | 要求 | 证据层 |
| --- | --- | --- |
| C01 | 包、准确base/tree、分支/本地保全、实际test基线和保护对象清单 | RAW/GIT/TEST |
| C02 | A三组中文名/unknown来自当前安全query；旧场/地点不回填；失能不判死亡 | NATIVE+DOM |
| C03 | 六类真实combat通过原controls提交，单条玩家回执；非combat入战不伪演 | NATIVE+DOM |
| C04 | 同token最多一次；重复通知/订阅/React重绘不产生回执；先消费后副作用 | UNIT+DOM |
| C05 | 同owner跨动作/退却再入保留scope高水位；旧scope/复制token不可重置；缺号不补播 | UNIT+NATIVE |
| C06 | 正常busy→stable不误丢本次返回；真正失权/dispose在提交后通知发生时丢弃迟到呈现 | DETERMINISTIC+DOM |
| C07 | save-failed反馈一次，retry纯保存且无回放；旧保存载荷不覆盖当前banner | NATIVE+DOM+BROWSER |
| C08 | 五停点真实冷恢复无新反馈/写入/初配；新owner首条B1scope独立 | NATIVE |
| C09 | 拒绝/取消/过期保护确认/草稿/读/同步零新回执、零额外规则调用 | DOM+COUNTERS |
| C10 | 真实胜利/退却/敌仍活死亡/双方归零即时显示最新view；不等timer判胜/死 | NATIVE+DOM |
| C11 | 跳过/减少动态/OS偏好变化仅清/落稳；下一合法行动不因动画被锁；旧回调无写入 | FAKE_CLOCK+DOM+BROWSER |
| C12 | 卸载/StrictMode/切换owner/页面失权清理监听与timer，旧控制引用不复用 | DOM+BROWSER |
| C13 | 同公开状态不同隐藏HP/病程/seed/实例比较整DOM/aria/反馈形态；无隐藏响应数长度差 | NATIVE_PRIVACY |
| C14 | 原L0—L3、singleFlight、目标选择/支付/first-fit/原Feed与保存保持；旧测试不弱化 | REGRESSION |
| C15 | 四项外部语义负控业务检出，原始失败/正控/修订分别保留 | NEGATIVE |
| C16 | 真实生产React浏览器动作与代表视口/键盘/动态证据；模拟与未跑清楚标记 | BROWSER |
| C17 | 原B1/query/controller/owner/UI/E03与最终默认check，准确最终CI独立回读 | TEST+CI |
| C18 | 所有变更白名单/原输入字节/受保护对象/旧refs保持，轻包源码/patch绑定准确SHA | GIT+PACKAGE |
