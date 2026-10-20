import { infectedSupplyTasks } from './catalog'
const actions: Readonly<Record<string, string>> = Object.freeze({ depart: '进入封锁区', rest: '原位休整',
  move: '移动物品', split: '拆分', merge: '合并', 'to-quick': '放入快捷栏', 'to-backpack': '放入背包', pickup: '拾取', drop: '留置',
  'task-pickup': '拾取任务物', 'task-drop': '留置任务物', medical: '使用药食', mechanical: '机械维护', coat: '外套维护', toolbox: '工具箱维护', recharge: '手电充能',
  deliver: '交付返回', withdraw: '失败止损返回', deadline: '期限结算', 'fire-door': '隔离防火门', 'l1-open': '开启物流柜', 'l3-open': '开启侧室', 'c-gate': '开启通信门',
  verify: '核对转运记录', fix: '修复转运组件', component: '取得转运组件', match: '比对通信记录', module: '取得通信模块', sample: '提取样本',
  install: '安装转运装置', transfer: '急救转运', 'power-survey': '调查供电', power: '恢复供电', 'bypass-survey': '调查旁路', bypass: '开启旁路', method: '取得作业方法',
  'metal-pipe-basic-attack': '金属管攻击', 'metal-pipe-charged-strike': '蓄力打击', 'temporary-attack': '临时攻击', defend: '防御', escape: '退却', 'use-quick-slot-item': '使用快捷物品' })
const sources: Readonly<Record<string, string>> = Object.freeze({ 'H1-search': '大厅搜索', 'H2-search': '药房搜索', 'H3-search': '保安室搜索',
  'L1-cabinet': '物流柜物资', 'L2-search': '物流装卸区搜索', 'L3-rack': '物流侧室物资', 'C4-cabinet': '通信设备柜', 'C4-food': '检修间物资', 'T1-exchange': '酒店交换' })
/** Content names only. Does not grant knowledge or register a new player entry. */
export const infectedWorldPlayerLabels = Object.freeze({
  action: (key: string) => actions[key] ?? (key === 'powered' ? '本地供电' : key === 'installed' ? '急救转运' : '现场互动'),
  source: (key: string) => sources[key] ?? '现场来源',
  place: (key: string) => infectedSupplyTasks.data.maps[key] ?? '当前位置',
})
