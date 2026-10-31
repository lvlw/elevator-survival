import type { PublicCombatAction } from '../../../state/residence-session/player-types'
export const publicActionCopy: Readonly<Record<PublicCombatAction, string>> = Object.freeze({
  'basic-attack': '攻击已执行', signature: '蓄力打击已执行', 'temporary-attack': '临时攻击已执行',
  defend: '防御已执行', retreat: '退却行动已执行', 'quick-use': '快捷物品行动已执行',
})
