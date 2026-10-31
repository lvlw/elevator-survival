import type { ActionCue } from '../presentation/presentation-types'
import { publicActionCopy } from '../presentation/public-action-copy'

export function CommittedActionCue({ cue, reduced, localReduced, onReduce, onSkip }: {
  cue: ActionCue | null; reduced: boolean; localReduced: boolean; onReduce(value: boolean): void; onSkip(): void
}) {
  return <section className="iw-committed-feedback" aria-label="行动反馈">
    <div className={'iw-committed-cue' + (cue?.phase === 'active' && !reduced ? ' iw-committed-cue--active' : '')}
      role="status" aria-live="polite" aria-atomic="true"><span key={cue?.epoch ?? 'empty'}>{cue ? publicActionCopy[cue.action] : ''}</span></div>
    <div className="iw-committed-options"><button type="button" disabled={!cue} onClick={onSkip}>跳过反馈</button>
      <label><input type="checkbox" checked={localReduced} onChange={event => onReduce(event.target.checked)} />进一步减少动态</label>
      {reduced && <small>减少动态已生效</small>}
    </div>
  </section>
}
