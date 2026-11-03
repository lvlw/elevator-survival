import type { ExplorationReceipt } from '../../../state/residence-session/narrative-entry/types'
export type CommittedExploration = Readonly<{ scope: object; ordinal: number; receipt: ExplorationReceipt }>
export function createExplorationIssuer() {
  const scope = Object.freeze({}); let ordinal = 0
  return (receipt: ExplorationReceipt): CommittedExploration | undefined => ordinal < Number.MAX_SAFE_INTEGER ? Object.freeze({ scope, ordinal: ++ordinal, receipt }) : undefined
}
export function explorationText(r: ExplorationReceipt): string {
  const action = { departure: '已进入医院', move: '移动完成', search: `搜索完成，现场现有 ${r.revealed ?? 0} 件物品`, pickup: '物品已收入背包', door: '防火门已打开，尚未移动', workorder: '已调查停用工单' }[r.kind]
  return action + (r.resource ? `；实际${r.resource.kind === 'charge' ? '电量' : '耐久'}消耗 ${r.resource.spent}` : '') + '。'
}
