# B1 详细实现与验证计划

起点 `12186083a8791e26b4e87f21ab1767d3ae4e4a58` / tree `b2ffbddc453bfd93077359c5434d5a010473b745`。输入包完整验证PASS，原件14文件/63624字节；本次直接用户请求授权执行包内限定工程。旧候选仅在B1同范围被本次定稿合同替代，不采纳候选B2/C生命周期描述。

实际客户端模型/推理/速度档 NOT_INDEPENDENTLY_VERIFIED；工具执行模式Default。不将推荐Sol/xhigh/Standard冒充已核验配置，不切换收费档或新建代理任务。

开工实际默认 `npm run test:run`：323文件/4725测试PASS，exit0，360.55秒。仓库外在任何生产修改前另运行真实基线探针：13场景×facade/controller=26记录。固定公开返回、完整current/合成存档SHA-256和原生计数是前后对照oracle；不输出真实用户存档。此探针1个测试单独计账，不加到游戏基线。

| 合同 | 最小职责及验证 |
| --- | --- |
| T01—03 | facade仅在原dispatch与同步/query正常完成后，从原解析CombatSessionCommand显式映射六枚举到单action；不复调生产者。拒绝/非combat没有属性 |
| T04—05 | controller在executeCaptured内、busy发布之后即将正式执行前纯query捕获前态；run/adopt/Feed原样。返回正常后显式复制A三字段/现有阶段/point/持久化，固定单条sequence，不读取raw commit或历史 |
| T06 | 每controller一个独立冻结空scope，私有ordinal从0；仅实际附加载荷时推进。选择器scope原职责保留。安全整数耗尽固定省略presentation，不阻止或回滚commit；纯边界与真实顺序分层证明 |
| T07 | save-failed仍committed且一份载荷；retry、读取、订阅、同步/冷恢复不签发。旧载荷冻结，不因后续保存改写 |
| T08 | BrowserOwner源码保持，以真实headless locks/storage验证直接forward与现有失效。仅TEST参考消费者用单scope/高水位/单pending与假时钟证明取消、skip/reduced、迟到回调；不用生产consumer或新生命周期 |
| T09 | 原生同阶段敌HP、隐藏病程/暴露、私有种子/身份的完整前后公开事实对齐后，比较全载荷（token引用一对一重命名）；公开敌组/阶段作正控。额外抛错getter检测无越界读取 |
| T10 | 两处旧观察仅逐字键集适配；基线26记录剥离唯一新增字段后逐结构/current/save/随机/提交通知计数对比。其余旧测试不改 |
| T11 | 新定向、原state/session/save/controller/browser/UI/content组合、原E03四路线/72样本、默认check真实执行；仓库外4类语义负控须业务断言失败；保留首次失败与修后结果 |

异常策略：前态缺失、非正常执行/投影或run抛错不补事件、不发token；既有程序Error照原通道暴露。已提交后出现不确定性不包装成可重试原动作，旧selector继续失效。blocked公开后态只映射unavailable，null阶段不推断胜利。没有可信持久化feedback时固定省略载荷，不猜值。正常支持链必须实际产生载荷。

只动四个既有生产宿主及两纯辅助、许可新测试/本任务目录，两旧测试单处替换及治理摘要两字面替换。其余core/S/current/save/expected/owner/UI/素材/依赖/CI/规则/旧refs全部保全。完成普通commit/push仅本新分支并停审，不进入B2/C/O3。

CI178后仅细化TEST oracle可移植性：保留开工前原Windows捕获，另复制准确base的facade/controller函数体（仅导出名改变）在同宿主独立native domain运行，逐字段/顺序/字节/计数与新实现比较；baseline bootstrap不调用新facade。额外en/zh-CN正控，不改原localeCompare运行代码。来源SHA绑定见BASELINE-ORACLE-PROVENANCE.json。
