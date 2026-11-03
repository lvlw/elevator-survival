import { deepFreeze } from '../../core/config'
import { infectedWorldSupplyValues as values } from './config'

/** Approved public setup vocabulary only. No identity, composition, initial stock or runtime owner. */
export const infectedWorldUiCatalog = deepFreeze({
  itemDescriptions: {
    '绷带': `基础恢复${values['bandage.hp']}点生命并止血；有未处理开放伤口时须明确选择一处。生存专长在本委托第一次合格使用时总共恢复${values['survival.hp']}点，之后为基础值。是否适用由正式预览决定。`,
    '急救包': `用于受伤或合格轻伤，按明确选择处理一处伤口或挫伤；恢复量${values['firstaid.hp']}，实际恢复受生命上限约束。`,
    '压缩口粮': `补充${values['ration.satiety']}点饱食并封顶，不恢复生命；只在合法战外使用。`,
    '手电筒': '照明搜索可降低本次搜索的精力成本，支付实际电量；不改变未知产出。',
    '撬棍': '用于适用门柜的撬动方法，支付实际耐久；不是任意障碍的通用钥匙。',
    '工具箱': '可处理隔离防火门；该次作业可产生真实电子材料，物品仍须拾取。',
    '金属管': '近战武器，可普通攻击或使用蓄力打击；消耗武器真实耐久，破损后行动资格由原规则决定。',
    '外套': '提供当前装备声明的防护；不会因为读取、休整或换页恢复完整度。',
    '金属零件': '用于适用的机械维护和转运安装；同一份材料只能实际消费一次。',
    '电子元件': '用于适用的工具箱维护和转运安装；使用后不能再用于另一项作业。',
    '消毒剂': '处理真实待暴露，受日额与正式资格约束；不减少已经形成的感染。',
    '抑制剂': '设置声明的抑制效果，受日额与正式资格约束；不直接治愈感染。',
    '镇痛剂': '用于适用挫伤或未处理伤口的时间与退却惩罚，不治疗伤口。',
  },
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
