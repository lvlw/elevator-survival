import type { BrowserSnapshot } from './types'
export function browserSnapshot(status: BrowserSnapshot['status'], preplay: BrowserSnapshot['preplay'] = null): BrowserSnapshot {
  return Object.freeze({ status, preplay, setup: status === 'setup' ? Object.freeze({
    tools: Object.freeze(['crow', 'lamp', 'toolbox']), specialties: Object.freeze(['scout', 'engineer', 'survival']) }) : null,
    message: ({ occupied: '另一个页面正在使用此试玩存档。', unsupported: '当前环境不支持所需的安全独占能力。',
      blocked: '试玩存档无法恢复，已保留原记录。', 'read-error': '读取失败，可显式重试。',
      'reservation-failed': '初始化占用未能保存，未发放初始物品。', suspended: '此页面已停止写入，须重新获取独占并恢复。' } as Partial<Record<BrowserSnapshot['status'], string>>)[status] ?? null })
}
