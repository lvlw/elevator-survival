import { deepFreeze } from '../../core/config'

/** Approved public setup vocabulary only. No identity, composition, initial stock or runtime owner. */
export const infectedWorldUiCatalog = deepFreeze({
  tools: [
    { value: 'crow', label: '撬棍', description: '可用于正式撬开方案；使用会支付工具资源。' },
    { value: 'lamp', label: '手电筒', description: '可用于照明搜索方案；使用会支付照明资源。' },
    { value: 'toolbox', label: '工具箱', description: '可用于正式工具箱方案；使用会支付工具资源。' },
  ],
  specialties: [
    { value: 'scout', label: '侦察', description: '提供已批准的调查与记录比对差异。' },
    { value: 'engineer', label: '工程', description: '提供已批准的修复方案差异。' },
    { value: 'survival', label: '生存', description: '提供已批准的首绷恢复差异。' },
  ],
  methods: { crow: '使用撬棍', lamp: '使用手电筒', toolbox: '使用工具箱', card: '使用门禁卡',
    manual: '手动处理', method: '使用作业方法', full: '完整核对', fast: '快速核对',
    cautious: '谨慎提取', direct: '直接提取', lit: '照明搜索', dark: '无照明搜索' },
} as const)
