# B1验收矩阵——覆盖要求，不是测试数量目标

每行在交付中绑定实际文件、用例名、原生命令、观测/计数、证据层次和结果。单元、原生、headless浏览器协议与TEST消费者分别列出。必须保存失败过程，不能只留末次绿灯。

| ID | 必须证明 | 反例／边界与证据层次 |
| --- | --- | --- |
| K01 | 六类闭合combat动作由原parsed command分类；每次正常提交一个payload/一个单记录 | 翻译label改动、相同label不同选择不得改变分类；未知/非combat无载荷；真实六类路径 |
| K02 | 一次producer/CTB/current/write/批玩法通知；controller原busy/stable通知保持 | 新字段不能第二次dispatch/重演；监听数翻倍仍一份direct result。原生计数 |
| K03 | 来源只用A当前opponent和前后安全阶段 | 三敌、unknown固定降级、相同地点不能猜敌；结束combat=null时stageAfter=null；不保留旧对手为当前。真实链＋纯投影 |
| K04 | 基础/标志/临时攻击、防御、退却、快捷使用各一条“发起动作已提交” | 防御/用药不冒充敌人受击；零实际伤害仍不扩事件；不显示逐击结果 |
| K05 | 一次真实临时攻击含两次内部敌响应，公开sequence仍1条 | 复用既有合法TEST资源前态＋原生8次防御链；不得改内部HP/CTB/伤害。私有trace只测试观察 |
| K06 | 最后不足耐久、最后快捷单位、实际治疗沿原支付/主效果规则 | 支付和来源原生对照，旧选择重发拒绝；不是从payload重新扣物 |
| K07 | 真实胜利、敌仍活死亡、敌HP归零后玩家流血死亡保持真实终态 | 战斗不存在≠胜利；actual HP0优先；不新增“失去能力=死亡”推断；一次终局 |
| K08 | 仅controller新scope/局部ordinal签发，独立于selector scope | 同controller跨revision/同步/退却再入scope不变，ordinal仅combat提交增加；冷new controller引用不同、首条0；安全整数边界不回绕 |
| K09 | 受支持execute/executeDraft/confirm正常返回一致透传 | 需保护的真实确认路径而非人为把metadata设true；取消/过期/stale/rejected无token/载荷/写入 |
| K10 | commit+save-failed仍1载荷；随后继续；retrySave不发或重放 | 最新current identity和disk字节、计数；原载荷persistence不被后续重试改写 |
| K11 | query/preview/describeAction/getSnapshot/sync/订阅/草稿/取消零新载荷 | 重复调用、busy/stable/监听抛错、重入拒绝；无新增S/Feed/cache字段 |
| K12 | 五停点真实v4冷恢复不重播，不补发初配，旧selector不复用 | first-hub、stable-active、battle-decision、living-hub、dead；引用旧合法生成链，不手拼假档 |
| K13 | BrowserControls实际forward；失锁/suspend/dispose后旧controls不能执行 | 现有BrowserOwner headless原生夹具，重新取得独占的新controller作用域；通知中失锁的迟到结果只取消呈现，不撤销commit |
| K14 | TEST消费者同token重复至多1次；取消、跳过、减少动态与旧回调隔离 | 从真实返回取载荷，确定性假时钟；消费不dispatch/write/算CTB；只证明协议，不宣称React/浏览器动画已验收 |
| K15 | 全载荷同公开事实非干涉 | 同阶段隐藏HP、感染/暴露、seed/私有身份变化，token重命名后结构/长度/空值/错误一致；公开敌组/阶段变化作正控 |
| K16 | 显式字段复制与隐藏字段不读取 | 带额外字段和抛错getter的安全输入负例；不spread raw对象、不序列化整个witness；检出侧信道不只regex |
| K17 | 兼容旧结果和未扩支持域 | 剥离唯一新增属性后，对准确基线旧返回/正式当前/存档字节/随机计数对等；非combat（含移动开战）原keys完整不变 |
| K18 | 旧测试有边界地继承 | 仅两处T10键集适配；原A39/B观察14、查询/源/恢复/选择器/保存断言实际回归，不删skip或动保护oracle |
| K19 | 仓库外语义负控真实失败 | 至少分别破坏：retry/notify错误发token；按响应数扩sequence；误复用selector scope；额外私有字段透出。必须业务断言失败，不以SyntaxError/加载失败算检出 |
| K20 | 交付/范围/包与git证明 | 起始真实基线、全部修改/新增、旧对象保全、输入原件、default check、完整SHA/parent/tree、仅新分支push，精确source/manifest/patch和停止点 |

`living-hub`等schema分支可用纯公开投影测试；不得为填表制造实际combat命令直接回中枢。真正原生不可达组合明确标NOT_REACHABLE/NOT_SUPPORTED，与类型/投影覆盖分列。不能把无法支持的相关项略掉后宣布全部PASS。

默认组合回归路径：新测试；src/state/residence-session；src/state/residence-save；src/app/infected-preplay；src/app/infected-browser；src/ui/infected-world；src/content/infected-world-v0.1。E03实际测试目录在开工从现有工程文档和源码定位，执行原四路线/72样本，不把同一批测试重复相加。最终 `npm run check` 保持实际package脚本及默认参数。
