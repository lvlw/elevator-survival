import type { PreplayError } from './types'
export { isPlayerBusinessError } from '../../state/residence-session/player-errors'

export function publicPreplayError(kind: PreplayError['kind']): PreplayError {
  return Object.freeze({ kind, message: kind === 'projection' ? '当前展示暂不可用；请同步当前状态，不要重复行动。' :
    kind === 'execution-uncertain' ? '行动反馈不确定；请核对当前状态，不要自动重试行动。' : '当前选择不可执行，请重新检查明确输入。' })
}
