import { deepFreeze } from '../../core/config'
import { infectedWorldSupplyValues as values } from './config'

/** Approved public setup vocabulary only. No identity, composition, initial stock or runtime owner. */
export const infectedWorldUiCatalog = deepFreeze({
  tools: [
    { value: 'crow', label: '撬棍', description: '可撬开适用的门、柜或解除固定；使用消耗撬棍耐久，不等于自动通过所有障碍。' },
    { value: 'lamp', label: '手电筒', description: '可选择照明搜索，消耗电量以降低该次搜索的精力成本；也可不照明搜索，不改变未知产出。' },
    { value: 'toolbox', label: '工具箱', description: '可对适用的防火门使用工具作业，消耗工具箱耐久；不通用于其他柜门或任意设施维修。' },
  ],
  specialties: [
    { value: 'scout', label: '侦察', description: `通信记录完整核对由${values['verify.full']}降为${values['verify.scout.full']}精力；已有匹配条件的快速核对由${values['verify.fast']}降为${values['verify.scout.fast']}。仅限此类比对，不直接揭示未知信息。` },
    { value: 'engineer', label: '工程', description: `转运组件手工作业使用${values['fix.method']}精力；仅对该作业生效，不与作业方法优惠叠加。` },
    { value: 'survival', label: '生存', description: `本委托第一次合格使用绷带总共恢复${values['survival.hp']}生命，后续为基础${values['bandage.hp']}；仍需满足用药条件，休整或读档不刷新首次机会。` },
  ],
  methods: { crow: '使用撬棍', lamp: '使用手电筒', toolbox: '使用工具箱', card: '使用门禁卡',
    manual: '手动处理', method: '使用作业方法', full: '完整核对', fast: '快速核对',
    cautious: '谨慎提取', direct: '直接提取', lit: '照明搜索', dark: '无照明搜索' },
  itemNames: { component: '转运组件', module: '通信模块' },
} as const)
