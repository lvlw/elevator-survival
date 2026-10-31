# C1技术定稿：现有DEV界面的A/B1只读消费

状态：MAINLINE RATIFIED FOR THIS TASK。基线 `d31828a74fcb1b2e28c0f070ad7f8fd3b3e87cc4`。这是本任务技术边界，不创建DEC/UIR或玩法。

## C01. 唯一事实和可见目标

现有PlayerSession/query、controller、BrowserOwner和S/current均保持。UI只能读取正式安全view，发送原请求；当前敌组/名称来自A `view.combat.opponent`，不得按地点、素材路径或历史对手猜测。已获胜/脱离/死亡时按最新view卸载战斗；`incapacitated`不代表HP0。

已知三组在标题、必要占位文字和可访问性名称中可辨认；unknown固定为“当前对手”。图片保持当前中性占位，不调用assets映射引入未批准敌图。

## C02. 载荷来源

只消费B1生产直接返回的 `PreplayResult.presentation`。现有app的execute与confirm返回处接入同一消费协调器；真实参数表单目前回到execute，不为凑路径改成另一套draft流程。若UI本来没有executeDraft入口，不新增按钮；执行层executeDraft能力继续由原B1测试保护。

不能从React订阅、snapshot/Feed、前后HP差、按钮文本、已缓存命令或动画回调合成载荷。非combat、拒绝、待确认、取消、sync/retry/冷恢复无新载荷就不播放。不能为呈现再执行一次请求或增加玩法preview/resolver调用。

## C03. 有界临时消费者

消费者只持有当前UI owner/controls生命周期身份、B1当前scope引用、已消费ordinal高水位、至多一个待完成短反馈和本地generation。不是Zustand/store/save第二真相，不保存全历史/无界Set/通用事件总线，不公开到window或DOM。

第一次合法载荷可从任意有效ordinal接续；不要求等于0、不补播中间缺失动作。后续同scope仅接受大于已消费高水位的新token；重复、旧序号或已取消条目不重播。按原对象引用认scope，禁止JSON.stringify、哈希、系统时间/UUID或selector scope代替。

换battle/退却再入但仍同owner会话，不清高水位、不接受旧scope复活；真正新owner/controls才建立新消费代。未授权scope在同一owner下突然更换须丢弃/保守降级，不能靠收到任意新对象自动重置。

消费标记先于任何展示副作用。取消/skip/reduced只清待动画或直接落稳，不把token恢复成未消费。缓存的旧载荷再次提交仍忽略。

## C04. 同步命令窗口与迟到返回

执行前捕获本次owner/controls及消费代；只把本次**原操作返回**提交消费者。返回后再次核对：组件仍挂载、owner/controls仍当前且有使用权、BrowserSnapshot仍ready/preplay stable、最新安全view与该返回结果兼容。可直接核对当前view对象与返回snapshot.view；不引入新的canonical revision或内部battle ID。

必须能处理原post-commit监听里suspend/dispose/替换会话：真实动作已提交，但返回晚于失权时**仅丢弃呈现**，不回滚、不重发、不刷新旧内存。

注意原命令自身会发布busy→stable两次。不得把该同步窗口的正常busy通知误当新owner、每次清scope，或一律使合法返回失效。也不得为解决此问题忽略真正的suspended/disposed/blocked/projection-error。详细协调方式由执行者在允许的新hook/consumer内设计并给出确定性测试；不改BrowserOwner或原useBrowserOwner生命周期。

失锁、页面离开/卸载、异常、真正上下文替换取消本地待反馈，撤销计时器/监听；旧回调须凭本地generation判失效。更晚的新正式行动可以取消旧短反馈并立即接新结果，不能因动画而延迟原命令资格或强制玩家等动画。

## C05. UI反馈和动画预算

只呈现“玩家发起的这类行动已执行”。六个闭合文案可采用：攻击已执行、蓄力打击已执行、临时攻击已执行、防御已执行、退却行动已执行、快捷物品行动已执行。可在新public-action-copy内统一精简措辞，但不得将退却行动已执行写成必定成功撤离，不能把quick-use写成隐藏目标治疗必定成功。

在中央现有舞台的有限预留区提供短文字/图形反馈，可对玩家中性占位作轻量CSS强调。优先固定180ms、上限250ms的纯呈现段；所有种类的动效条数和预算不依隐藏数据变化。此时间不是CTB、不推进规则。

禁止敌人“被击中/受伤抖动”、额外反击、血花、伤害数/百分比、私有疗效提示或将阶段差解释为击打次数。阶段、HP、意图、相对先后始终直接显示最新正式view；不得为了动画保留旧HP/阶段、冻结canonical UI或按计时器推进阶段。

已离开战斗/死亡时，最新真实界面立即显示。允许同一主舞台短区给中性“行动已执行”回执，也可直接落稳；不把已关闭战斗继续展示成可操作场次。动作回执不是第二Feed/历史列表，原Feed只读且不追加第二次记录。

## C06. 跳过、减少动态和可访问性

提供只影响当前呈现的“跳过反馈”入口，以及会话本地的减少动态选择；默认尊重 `prefers-reduced-motion`，OS偏好已减少时不得被默认覆盖为完整动作。监听偏好变化并在卸载清理；有本地“进一步减少”选项，不写档/不dispatch。

减少动态或跳过直接进入相同的已结显示，仍消费同token；不重发行动、不丢掉保存失败/终局/正式错误信息。有限静态文字可以保留到下一变化，不作全历史。

按钮可键盘操作，Focus/Hover/切页/跳过/选项切换均零玩法写入。不抢焦点、不弹“知道了”、不新增通用确认。aria-live等仅输出相同公开事实，不暴露scope/ordinal/内部ID。避开高频闪烁及布局跳动，不能遮住原行动、保存重试或真正保护层。

## C07. 保存、冷恢复与错误

save-failed的实际combat结果可消费一次；既有保存提示和retrySave保持。retry只保存、不能触发回放，旧载荷persistence不能成为当前保存状态所有者（当前状态仍看安全view）。保存后新的真实combat可以有新反馈。

五停点冷恢复直接显示最新成功checkpoint，不重放Feed或上次动画。新controller scope与旧scope不等同；旧controls/选择/确认不重新可用。读取/恢复/同步不制造消费条目。

消费/动画错误必须隔离于已提交玩法，清理本地反馈并保留正式当前状态和故障信息，不让用户误以为行动尚未执行而重试原命令。程序错误仍进入现有可观察测试/错误路径，不以静默catch把测试变PASS。

## C08. 交互和兼容

原L0—L3、singleFlight、requestStillVisible、参数/确认绑定、对象身份、保存横幅、旧入口、独立命名空间和浏览器锁均不改。新增消费代码不持有原request用于后续动画重发。

原UI与B1测试保持。唯一旧测试许可：combat.test.tsx中“当前对手中性占位”固定aria查询可替换为对应三组安全名称占位的精确断言（或保留原断言并增加名称可访问性证明），不改任何counts/死亡/无img/保存/恢复/隐私断言。不许排序/删字段让隐私对照变易。

## C09. 素材和后续边界

不读设计原型模拟状态，不复制theme/catalog注册进运行时，不生成图片或把中性占位改成新图。19项元数据风险保持，不借本轮校验通过写PRODUCTION_READY。

本批最终交付必须明确：安全协议B1已审；C1是实际消费接入；完整美术C和逐击B2仍独立。当前中文名及短回执改善可辨认性，不宣称完整战斗视觉目标已完成。
