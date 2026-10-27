/* Every record is a named design sample, not a runtime fixture or a saved game. */
const SCREENS=[];
function add(f,variants,kind,node='H0'){for(const [id,title,extra] of variants)SCREENS.push({id:`${f}-${id}`,family:f,title,kind,node,...(extra||{})});}
add('P01',[['unselected','出发前 · 独立选择']], 'setup');
for(const tool of ['crow','lamp','toolbox'])for(const specialty of ['scout','engineer','survival'])SCREENS.push({id:`P01-${tool}-${specialty}`,family:'P01',title:'出发前 · 配装就绪',kind:'setup',node:'H0',tool,specialty});
add('P02',[['first-hub','初次中枢 · 配装已锁定']], 'hub');
add('P03',[['hospital','医院 · 大厅',{node:'H1'}],['hotel','酒店 · 入口',{node:'T0'}],['power','供电所 · 配线廊',{node:'P0'}],['logistics','物流 · 岗亭',{node:'L0'}],['communication','通信 · 入口',{node:'C0'}]],'explore');
add('P04',[['before','跨区前 · 医院电梯前室',{node:'H0'}],['after','已到达 · 酒店入口',{node:'T0'}]],'explore');
add('P05',[['unsearched','大厅搜索 · 尚未搜索'],['revealed','大厅搜索 · 已揭示'],['empty','物资来源 · 已取空'],['reopen','重新查看 · 保留已知结果']], 'search','H1');
add('P06',[['door','消防门 · 处理方案',{art:'event_isolation_fire_door_v02.png',node:'H1'}],['power','转运支路 · 供电恢复',{node:'P1'}],['records','档案 · 记录核对',{node:'C1'}],['component','装卸场 · 解除固定与取件',{node:'L2'}],['sample-cautious','冷藏室 · 谨慎提样',{node:'H5',method:'cautious'}],['sample-direct','冷藏室 · 直接提样',{node:'H5',method:'direct'}],['install','转运平台 · 真实安装',{node:'H8'}]], 'node');
add('P07',[['lin','林岑 · 已有现场交换',{node:'T1',person:'lin'}],['zhou','周衡 · 作业方法',{node:'L5',person:'zhou'}]], 'npc');
add('P08',[['acquired','指定样本 · 已取得'],['carried','指定样本 · 正在携带'],['ground','指定样本 · 留在原地'],['delivered','指定样本 · 已交付']], 'mission');
add('P09',[['normal','已知区域 · 详情'],['max','已知区域 · 放大',{max:true}],['last-observed','远端地点 · 上次观察'],['blocked','相邻道路 · 已知受阻'],['unknown-passability','已知相邻地点 · 通行尚不确定']], 'map','H1');
add('P10',[['inventory','携带区 · 真实占格'],['equipment','装备 · 实际剩余资源'],['rotated','旋转物件 · 3×1轮廓',{rotated:true}]],'inventory','H3');
add('P11',[['move','移动 · 明确目标位置'],['split','拆分 · 明确数量'],['merge','合并 · 明确目标实例'],['quick','快捷迁移 · 明确槽位'],['task-pickup','取回样本 · 明确2×2格位'],['drop','留置任务物 · 当前地点'],['no-space','没有合法位置 · 不领取不扣物']], 'organize','H5');
add('P12',[['bandage','绷带 · 选择一处伤口',{item:'bandage'}],['firstaid','急救包 · 选择处理目标',{item:'firstaid'}],['ration','口粮 · 饱食未满',{item:'ration'}],['painkiller','止痛药 · 当前挫伤',{item:'painkiller'}],['disinfectant','消毒剂 · 隐藏目标尚不能判断',{item:'disinfectant',unknown:true}],['suppressant','感染抑制剂 · 隐藏目标尚不能判断',{item:'suppressant',unknown:true}],['invalid','药食无效 · 当前无合格目标',{item:'bandage',invalid:true}],['battle','战斗快捷药物 · 限绷带与镇痛',{item:'bandage',battle:true,node:'H4'}]], 'medical','H6');
add('P13',[['mechanical','机械维护 · 一次总池15',{tool:'crow'}],['coat','护具维护 · 真实织物'],['toolbox','工具箱维护 · 金属与电子'],['charge','手电充电 · 兼容电池',{tool:'lamp'}]], 'maintenance','H6');
add('P14',[['A','休整 · A类地点',{node:'H6'}],['C','休整 · C类地点',{node:'H0'}],['consequences','日级后果 · 生还后推进'],['death','日级后果 · HP0短路']], 'rest');
add('P15',[['orderly','隔离走廊 · 感染护工',{node:'H4',enemy:'orderly'}],['porter','装卸场 · 感染装卸工',{node:'L2',enemy:'porter'}],['technician','检修走廊 · 感染技术员',{node:'C2',enemy:'technician'}]], 'battle');
add('P16',[['max','战斗 · 中央放大',{max:true}],['phases','感染护工 · 五公开阶段',{phases:true}],['porter-phases','感染装卸工 · 五公开阶段',{phases:true,enemy:'porter',node:'L2'}],['technician-phases','感染技术员 · 五公开阶段',{phases:true,enemy:'technician',node:'C2'}],['submitted','玩家行动 · 已提交示范'],['enemy-response','敌人响应 · 已结事件示范'],['hit','命中瞬间 · 独立FX',{hit:true}],['stage-change','阶段切换 · 受伤',{stage:1}],['decision','玩家决策 · 稳定暂停'],['retreat','合法退却 · 已提交示范'],['reduced','减少动态 · 静态等价',{reduced:true}]], 'battle','H4');
add('P17',[['victory','战斗胜利 · 回到隔离走廊',{node:'H4'}],['retreat','合法退却 · 回到入场前大厅',{node:'H1'}]],'result');
add('P18',[['success','委托成功 · 静态中枢']], 'terminal');
add('P19',[['voluntary','主动失败生还 · 静态中枢']], 'terminal');
add('P20',[['deadline','期限失败生还 · 静态中枢']], 'terminal');
add('P21',[['enemy-alive','实际死亡 · 敌人仍存活'],['both-zero','实际死亡 · 双方失去能力']], 'terminal','H4');
add('P22',[['return','正式返回 · 关闭本委托'],['critical-drop','留置指定样本 · 关键物'],['certain-death','当前操作必死 · 有其他合法选择'],['cancelled','已取消 · 回到原上下文'],['stale','条件已变化 · 重新选择']], 'confirm','H0');
add('P23',[['saved','已保存'],['not-attempted','当前页面尚无新写入'],['failed','已生效 · 未保存'],['retry','只重试保存 · 不重放玩法']], 'save','H1');
add('P24',[['request','正在取得本页使用权'],['occupied','已由另一页面使用'],['lost','本页已失去使用权'],['corrupt','记录无法校验'],['read-error','读取失败'],['projection','展示暂不可用']], 'error');
add('P25',[['controls','操作说明 · 查看与执行'],['health','身体与药食 · 可知边界'],['quick','快捷位 · 两个真实槽']], 'help');

const ITEMS={
pipe:['金属管','icon_metal_pipe_v01.png',1,3],coat:['厚实外套','icon_heavy_coat_v01.png',2,2],crow:['撬棍','item-crowbar-v1.png',1,3],lamp:['手电筒','icon_flashlight_v01.png',1,2],toolbox:['工具箱','item-toolbox-v1.png',2,2],
bandage:['绷带','icon_bandage_v02.png',1,1],ration:['压缩口粮','item-ration-v1.png',1,1],disinfectant:['消毒剂','item-disinfectant-v1.png',1,1],suppressant:['感染抑制剂','item-suppressant-v1.png',1,1],painkiller:['止痛药','item-painkiller-v1.png',1,1],firstaid:['急救包','item-firstaid-v1.png',1,2],metal:['金属零件','item-metal-v1.png',1,1],electronic:['电子元件','item-electronic-v1.png',1,1],cloth:['织物材料','item-cloth-v1.png',1,1],battery:['通用电池','item-battery-v1.png',1,1],card:['隔离区门禁卡','icon_isolation_access_card_v02.png',1,1],sample:['密封病原样本箱','icon_sealed_pathogen_case_v02.png',2,2],component:['转运组件','item-component-v1.png',2,2],module:['通信模块','item-module-v1.png',1,2]};
const NODES={H0:['医院','电梯前室','bg-h0-v1.png'],H1:['医院','大厅','bg_emergency_hall_v01.png'],H2:['医院','药房','bg-h2-v1.png'],H3:['医院','保安室','bg-hospital-control-v1.png'],H4:['医院','隔离走廊','bg_isolation_corridor_v01.png'],H5:['医院','冷藏室','bg-h5-v1.png'],H6:['医院','值班休息室','bg-h6-v1.png'],H7:['医院','后勤控制间','bg-hospital-control-v1.png'],H8:['医院','转运平台','bg-h8-v1.png'],T0:['酒店','酒店入口','bg-hotel-v1.png'],T1:['酒店','林岑安置点','bg-hotel-v1.png'],P0:['供电所','配线廊','bg-power-v1.png'],P1:['供电所','转运支路柜','bg-power-v1.png'],L0:['物流','岗亭','bg-l0-v1.png'],L1:['物流','登记室','bg-logistics-office-v1.png'],L2:['物流','装卸场','bg-logistics-v1.png'],L3:['物流','维修库','bg-workshop-v1.png'],L5:['物流','周衡休息室','bg-logistics-office-v1.png'],C0:['通信','入口','bg-communication-v1.png'],C1:['通信','档案室','bg-c1-v1.png'],C2:['通信','检修走廊','bg-power-v1.png'],C3:['通信','机房','bg-c3-v1.png'],C4:['通信','检修间','bg-workshop-v1.png'],C5:['通信','播控侧门','bg-communication-v1.png']};
const SPECIALTIES={scout:['侦察','记录核对更省精力；不揭示隐藏知识。'],engineer:['工程','装卸场手工作业采用10精力；不与方法优惠叠加。'],survival:['生存','本委托首次合格绷带恢复2生命；休整不刷新。']};
const STAGES=['完好','受伤','重伤','濒危','失去能力'];

add('P06',[['door-result','消防门 · 通路已处理',{outcome:'通路已打开',node:'H1'}],['power-result','转运支路 · 已恢复供电',{outcome:'当地供电已恢复',node:'P1'}],['records-result','记录 · 比对已完成',{outcome:'记录比对已完成',node:'C1'}],['component-result','组件 · 已真实取件',{outcome:'转运组件已进入明确格位',node:'L2'}],['sample-result','样本 · 已实际携带',{outcome:'指定样本已进入背包',node:'H5'}],['install-result','平台 · 安装已完成',{outcome:'转运设施已安装',node:'H8'}]],'node');

add('P10',[['detail-sample','样本详情 · 只读',{item:'sample'}],['detail-pipe','金属管详情 · 只读',{item:'pipe'}]],'item-detail','H5');
