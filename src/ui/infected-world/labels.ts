import type { PlayerAction } from '../../state/residence-session/player-types'
import { infectedWorldUiCatalog } from '../../content/infected-world-v0.1/player-ui-catalog'

const methods: Readonly<Record<string, string>> = infectedWorldUiCatalog.methods
const itemNames: Readonly<Record<string, string>> = infectedWorldUiCatalog.itemNames
/** Translate already-public labels only; never use display text to resolve an entity. */
export function publicItemName(name: string): string { return itemNames[name] ?? name }
export function actionName(action: PlayerAction): string {
  return action.label + (action.method ? ' · ' + (methods[action.method] ?? '指定方案') : '')
}
export function toolName(value: string): string {
  return infectedWorldUiCatalog.tools.find(tool => tool.value === value)?.label ?? '实用工具'
}
export function specialtyName(value: string): string {
  return infectedWorldUiCatalog.specialties.find(specialty => specialty.value === value)?.label ?? '专长'
}
export function loadName(value: string): string {
  return ({ normal: '正常', loaded: '负载', overloaded: '超载', 'cannot-carry': '无法携带' } as Record<string, string>)[value] ?? '当前负重'
}
export function resourceName(value: string): string {
  return ({ durability: '耐久', integrity: '完整度', battery: '电量' } as Record<string, string>)[value] ?? '资源'
}
export const phaseNames: Readonly<Record<string, string>> = {
  'first-hub': '准备出发', 'stable-active': '探索', 'battle-decision': '战斗', 'living-hub': '返回中枢', dead: '死亡',
}
