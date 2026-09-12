# 《电梯求生》Early Visual Direction Brainstorm Record v0.1

> 本文件是 Early Art Direction Brainstorm / Production Reference。它不是 gameplay rule source，不是 DEC，不是 UIR，也不是最终 Art Direction Freeze；不覆盖 Vertical Slice、Architecture、Content Docs、Visual Asset Slot Audit 或任何后续正式设计决策。

## 1. 文档定位

**状态：Early Brainstorm / Production Reference**

本文件用于记录医院一日 Playable Game Shell 阶段实际生成、筛选和整理视觉素材后形成的早期美术倾向。

它：

- 不是 gameplay rule source；
- 不是 DEC；
- 不是 UIR；
- 不是最终 Art Direction Freeze；
- 不覆盖 Vertical Slice、Architecture、正式 Content Docs 或 Visual Asset Slot Audit；
- 主要服务于后续正式 UI 美术设计、资产扩展和 Presentation 集成。

当前 Playable Game Shell 本身仍是可替换展示层，背景、贴图、图标、Skin、动画与 Renderer 都不是 gameplay truth。

与相邻文档的职责区分：

- `docs/10-visual-asset-slot-audit.md`：Production geometry / slot / source-size / safe-zone specification；
- `docs/11-presentation-audio-cue-audit.md`：Presentation audio production audit；
- 本文件：Early visual preference / art exploration record，不覆盖前两者。

---

## 2. 当前视觉探索的总体结论

目前最适合《电梯求生》的方向，不是：

- 纯照片级写实恐怖；
- 纯丧尸片；
- 纯赛博朋克；
- 卡通化；
- 极简纯 UI；
- 普通“废弃医院网页背景”。

当前更合适的范围是：

> **半写实、低饱和、冷暗、现实材质基础上的轻异常感。**

核心目标是：

```text
现实世界的可信材质
+
异常世界的未知感
+
清晰的游戏信息层级
```

恐怖感存在，但不作为唯一视觉支柱。

这样可以兼容未来不同任务世界，而不会让整个产品永久绑定在“医院 + 丧尸”美术语言上。

---

## 3. 电梯中枢

### 当前采用方向

> **旧工业异常中枢 + 黑雾虚空 + 多世界目的地显示装置**

### 视觉结构

中央主体：

- 一台异常电梯；
- 电梯是唯一稳定、清楚的人造核心；
- 有明显旧工业和长期使用痕迹；
- 不做豪华电梯，也不做纯科幻传送门。

外围：

- 没有窗户；
- 没有自然光；
- 不强调完整建筑墙体；
- 四周逐渐进入黑暗、黑雾和无法判断边界的虚空空间。

地面：

- 有一块有限、安全感相对较高的人工平台；
- 平台与虚空形成“安全核心 / 未知外围”的反差。

电梯上方：

- 预留世界目的地显示结构；
- 当前可展示废弃医院缩略画面；
- 未来理论上可切换其他任务世界。

### 视觉公式

```text
约 70% 旧工业现实基础
约 20% 异常 / 超现实空间
约 10% 多世界显示机制
```

不是规则比例，只是当前视觉感受描述。

### 设计意图

玩家第一眼应该理解：

> “这是异常电梯中枢。”

第二眼才理解：

> “它现在通向医院。”

而不是让医院主题覆盖整个 Hub。

Visual Audit 当前仍把 Hub 背景定义为可替换 Presentation asset，推荐 16:9 master，并要求主要视觉集中于中央安全区域，以适应实际 Game Shell 裁切。

---

## 4. 医院世界环境语言

目前医院视觉倾向为：

> **功能明确的现代医疗设施，在封锁、停摆和长期无人维护后形成的冷暗废弃状态。**

不是：

- 古典精神病院；
- 哥特医院；
- 极端血浆丧尸片；
- 完全坍塌废墟；
- 未来实验基地。

### 当前共同特征

- 冷白荧光；
- 暗青灰、铁灰、脏白；
- 少量红色警示灯；
- 潮湿或反光地面；
- 功能标识仍能辨识；
- 设备与建筑结构仍然具有真实用途；
- 污损、老化和封锁痕迹明显；
- 场景仍然让人看得懂“这里原本是干什么的”。

---

## 5. 急诊大厅

急诊大厅当前视觉探索得到一个重要原则：

> **环境导视最好服务正式 Player Navigation Knowledge。**

当前大厅表层正式可见的是：

- 药房；
- 保安值班室；
- 隔离区方向。

而不是由背景画面随意出现住院部、手术室、影像科等可能让玩家理解为“可探索路线”的内容。医院正式表层导航知识也明确由内容配置决定，未知路线不能由美术反向泄漏。

因此未来 Scene Art：

```text
环境美术
≠
自由添加地图信息
```

背景中的明显路标、门、箭头和目的地名称都应接受 Player Knowledge 检查。

---

## 6. 隔离走廊 / Battle Plate

当前隔离走廊采用：

- 深长走廊；
- 冷暗；
- 生物隔离设施；
- 零散红色告警灯；
- 医院功能结构仍清楚；
- 中央空间相对空，适合 Battle Stage 叠加角色。

这张图的角色是：

> **Combat atmosphere plate**

而不是一张必须精确展示完整 Scene topology 的地图。

因此：

- 不承担路线 truth；
- 不提前出现隐藏敌人；
- 不展示未知出口；
- 不展示战利品；
- 不决定战斗状态。

Visual Audit 当前正式将 Combat background 定义为 Presentation plate，并要求关键背景信息集中在中央安全范围内，以适应桌面和 768 堆叠布局。

---

## 7. 感染护工

### 当前角色方向

最终选择：

> **女性医院勤务 / 护工人员，而不是典型“女护士僵尸”。**

### 当前特征

- 约成年中年段；
- 实用型体格；
- 深色中长发；
- 无经典护士帽；
- 灰绿 / 灰白工作制服；
- 工牌、口袋等勤务身份细节；
- 仍保持明显人形；
- 感染使姿态、肤色、目光和动作变得异常；
- 不做巨大怪物化；
- 不依赖大量血腥细节。

正式内容当前只确认其为“感染护工”、单体近战感染者，基础行动为抓挠、特殊行动为扑咬；性别、脸型、制服等均属于本轮美术探索，而不是 gameplay rule。

---

## 8. 感染护工五阶段视觉语言

当前五个公开生命阶段：

```text
完好
受伤
重伤
濒危
失去能力
```

视觉差异主要通过：

> **身体支撑能力 + 重心 + 行动姿态**

表达。

不是通过：

> **伤口数量 = 当前 HP**

表达。

### 完好

- 保持稳定站立；
- 身体明显前压；
- 双手仍有攻击准备；
- 仍具有完整向玩家推进的能力。

### 受伤

- 一侧失衡；
- 肩部下沉；
- 步态开始不稳定；
- 仍然具备明确攻击能力。

### 重伤

- 躯干明显弯曲；
- 重心偏移；
- 一只手明显下垂；
- 行动力显著下降。

### 濒危

- 几乎无法保持站立；
- 腰背和双腿支撑明显不足；
- 头部下垂；
- 仍勉强具有向前行动趋势。

### 失去能力

- 跪倒 / 失去支撑；
- 双手不再构成攻击姿态；
- 没有向前推进感。

五阶段已统一到相同 `1024×1280 RGBA` canvas、统一底部 anchor 与统一人体比例，没有使用逐阶段 bbox-fit 放大，因此跪姿保持自然变矮。

该做法符合 Visual Audit 要求：阶段图共享 framing / anchor / scale，并只表达公开阶段，不泄漏精确敌人 HP。

---

## 9. Item Icon Style v0.1

当前物品 icon 方向：

> **半写实游戏道具展示 + 现实材质 + 适度旧化 + 高轮廓识别度**

### 技术倾向

- 1:1；
- 最终 production output 512×512；
- 透明背景；
- 主体约占画布 70%～75%；
- 四边保留约 12.5% 安全区；
- 同一 source 跨装备栏、快捷栏、背包、仓库、列表和 Info Card 使用。

该方向与当前 Visual Asset Slot Audit 一致。

### 镜头

默认：

- 轻微俯视；
- 3/4 视角；
- 长物体可以沿对角线展示；
- 不做强透视和夸张广角。

### 光照

- 左上或左前上主光；
- 中性偏冷；
- 适度轮廓光；
- 不使用场景化彩色灯光。

### 旧化原则

允许：

- 划痕；
- 使用污渍；
- 轻度锈蚀；
- 布料磨损；
- 长期使用质感。

但：

> **旧化只是 definition-level 外观，不等于当前 ItemState。**

例如：

- 金属管图片不表示当前耐久；
- 外套不表示完整度；
- 手电筒不表示电量；
- 绷带不表示当前数量；
- 样本箱不表示任务完成。

---

## 10. 当前首批六个物品 Icon

已经形成统一方向：

- 金属管；
- 厚实外套；
- 手电筒；
- 绷带；
- 隔离区门禁卡；
- 密封病原样本箱。

这六项也是 Visual Audit 当前 NOW 级的首批 Item Icon。

---

## 11. 门禁卡与样本箱的图形语言

这轮生成暴露了一个重要问题：

> AI 很容易自动创造机构名、等级、编号、医院 lore 和权限系统。

例如曾出现：

- 虚构医院名称；
- Staff Level；
- BSL 等级；
- 未确认温度；
- 未确认实验室编号。

这些均已从最终 v0.2 素材中清理。

当前原则：

### 可以使用

- 泛化医院十字标志；
- 泛化 biohazard；
- 条带；
- 色块；
- 图形编码；
- 模糊/非语义性身份视觉。

### 不应自动生成

- 正式医院名称；
- 部门编号；
- 实验室等级；
- 病原名称；
- 世界组织名；
- 权限等级；
- 未确认数值。

Final Audit 已确认当前门禁卡和样本箱 icon 已移除上述未确认设定。

---

## 12. 防火门 Event Art

当前隔离区防火门采用：

- 厚重金属门；
- 生物危险与隔离警告；
- 门禁装置；
- 红色告警灯；
- 工业医院材质。

重要原则：

> Event Art 可以强化“这是一个隔离防火门”，但不能创造新的导航事实。

因此此前 AI 自动生成的：

- ICU；
- Pathology；
- Morgue；

等额外路线已经清理。

Final Audit 已确认 v0.2 防火门不再包含这些误导性方向信息。

---

## 13. 样本箱 Objective Art

最终将两个用途拆开：

### Objective Illustration

- 1:1；
- 1024×1024 RGBA；
- 样本箱为唯一核心主体；
- 只用于任务目标表达；
- 不暗示“已安全带回”或“任务完成”。

### Cold Room Reference Art

原先生成的冷藏室环境图被保留为：

> Scene Node Art / Reference

而不是 Objective Illustration。

这样既保留环境资产，又保持“任务物本身”和“场景环境”职责分开。

Final Audit 已确认正式 1:1 objective 已存在，原 16:9 图只作为 reference 保留。

---

## 14. 当前 17 个视觉资产 / 参考资产

目前整理后的视觉包包括：

### Hub

- 异常电梯中枢 ×1

### Scene / Environment

- 急诊大厅 ×1
- 隔离走廊 Battle plate ×1
- 标本冷藏室 reference ×1

### Enemy

- 感染护工五阶段 ×5

### Item Icon

- 六个首批物品 icon ×6

### Event

- 隔离区防火门 ×1

### Objective

- 密封病原样本箱 ×1

合计：

```text
17 visual assets / references
```

另有 QA contact sheet 等 review artifact。

---

## 15. 当前暂未确定的 Art Direction

本轮没有确认：

- 正式 Player 角色外观；
- 最终 UI Skin；
- 最终字体；
- 最终色彩系统；
- 最终世界 logo；
- 医院正式机构名称；
- 完整医院节点插图体系；
- Day 2–7 视觉内容；
- 其他世界美术；
- 正式动画风格；
- 最终粒子系统；
- 最终镜头语言；
- 完整状态 icon 系统。

这些仍应保持开放。

---

## 16. 本轮不应被误解为 Art Direction Freeze

当前成果说明：

> “这套方向现在看起来比较合适。”

不是：

> “以后必须永久这么画。”

未来正式 Art Direction Goal 仍应：

```text
当前 Early Visual Direction
↓
代表页面真实 Game Shell 集成
↓
Owner 试玩
↓
必要时比较候选方向
↓
Style Bible
↓
Visual Freeze
```

在实际 Game Shell 中验证仍然是必要步骤。

---

## 17. 当前建议保留的核心视觉支柱

如果未来正式 Art Direction 需要从本记录提炼核心，可以优先保留：

### A. 现实基础

物件、医院设施、服装和空间结构都应该“看起来有实际用途”。

### B. 克制异常

异常感来自：

- 黑雾；
- 空间边界；
- 灯光；
- 不自然姿态；
- 世界切换结构；

而不是所有东西都长成怪物。

### C. 信息优先

视觉资产不得：

- 覆盖 UI 信息；
- 暗示不存在路线；
- 泄漏隐藏情报；
- 表达内部精确状态；
- 成为第二份 gameplay truth。

### D. 可扩展多世界

医院只是第一个任务世界。

Hub 和整体 UI 美术必须能够自然承载未来完全不同的世界类型。

---

## 18. 本轮阶段结论

```text
Visual Asset Exploration           ✅
Visual Owner Pack v0.1             ✅
Technical Asset Consolidation      ✅
Enemy Phase Visual Language        ✅
Item Icon Style v0.1               ✅
AI Lore Cleanup Practice           ✅

Final Art Direction                ❌
Final UI Skin                       ❌
Full World Art                      ❌
Production Runtime Integration      ❌
```

当前视觉素材已经足够进入下一阶段的声音验证与后续 Game Shell 集成实验。

---

## 19. 2026-09-12 Owner 一屏 UI 草图后续记录

Owner 认可草图表达的一屏主次布局和交互方向，下一步仍须在真实浏览器 Game Shell 中实现、试玩与复测；草图不是玩法规则、像素级合同、已交付资产或最终 Art Direction Freeze。草图中的头部槽、四快捷位、统一大小的背包卡片、错误负重、额外行动／状态／房间／路线、连续敌人血条、虚构医院文字与新增物品等不能照搬，正式 DEC、内容与玩家知识边界优先。

感染护工优先复用当前五阶段素材并在新舞台检查缩放、清晰度和统一落地锚点，草图另画角色不授权重做。玩家背身方向已确认用于战斗主舞台，不要求在角色／装备栏重复出现；合成示意图不是已交付透明角色贴图，最终形象、服装、武器变体及新舞台具体尺寸仍未冻结。本早期探索记录仍只是 production reference，不覆盖视觉槽位审计或未来正式 Style Bible。
