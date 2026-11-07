import type { BrowserControls } from '../../../app/infected-browser/types'
import { BrowserOwnerError } from '../../../app/infected-browser/errors'
import { isPlayerBusinessError } from '../../../state/residence-session/player-errors'
import type { PlayerAction, PlayerItem } from '../../../state/residence-session/player-types'

export type ReadAction = Pick<BrowserControls, 'describeAction' | 'preview'>
export type MethodLimitation = { kind: 'missing' | 'unavailable'; text: string }
const tools: Readonly<Record<string, string>> = { crow: '撬棍', toolbox: '工具箱', lit: '手电筒', card: '隔离区门禁卡' }

/** A presentation filter for public physical methods only. It does not resolve or execute an action. */
export function physicalMethodLimitation(action: PlayerAction, carried: readonly PlayerItem[], read: ReadAction): MethodLimitation | null {
  if ((action.family !== 'source' && action.family !== 'task') || !action.method ||
    !Object.hasOwn(tools, action.method) || action.availability === 'unknown') return null
  const name = tools[action.method]
  try {
    const inputs = read.describeAction(action.selector)
    if (!inputs.fields.includes('item')) return null
    if (inputs.items.length === 0) {
      return { kind: 'missing', text: carried.some(item => item.name === name)
        ? `此办法需要当前可用的${name}。` : `缺少${name}。` }
    }
    // An item alone is not a complete request when the action also needs materials or placement.
    if (inputs.fields.length !== 1) return null
    const previews = inputs.items.map(item => read.preview({ action: action.selector, item: item.selector }))
    if (!previews.every(result => result.qualification.kind === 'unavailable')) return null
    const depleted = inputs.items.every(input => {
      const item = carried.find(candidate => candidate.selector === input.selector)
      return item && item.resource.kind !== 'none' && item.resource.current === 0
    })
    return { kind: 'unavailable', text: depleted && action.method !== 'card'
      ? action.method === 'lit' ? '手电筒电量已耗尽。' : `${name}耐久已耗尽。`
      : '当前条件不足。可查看精力和现场要求。' }
  } catch (error) {
    if (error instanceof BrowserOwnerError || isPlayerBusinessError(error)) {
      return { kind: 'unavailable', text: '此选择已失效，请重新查看现场。' }
    }
    throw error
  }
}
