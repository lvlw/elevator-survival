import type { PlayerExecution, PlayerView, PlayerReadyView, PlayerOpponentPresentation, PublicCombatAction } from '../../state/residence-session/player-types'

export type ExistingPublicEnemyStage = NonNullable<PlayerReadyView['combat']>['enemyStage']
export type PresentationToken = Readonly<{ scope: Readonly<object>; ordinal: number }>
export type CommittedCombatPresentation = Readonly<{
  version: 1; token: PresentationToken; opponent: PlayerOpponentPresentation
  stageBefore: ExistingPublicEnemyStage | null; stageAfter: ExistingPublicEnemyStage | null
  sequence: readonly [Readonly<{ ordinal: 0; actor: Readonly<{ role: 'player' }>; action: PublicCombatAction }>]
  stop: 'battle-decision' | 'stable-active' | 'living-hub' | 'dead' | 'unavailable'
  persistence: 'saved' | 'save-failed'
}>

function copyOpponent(source: PlayerOpponentPresentation): PlayerOpponentPresentation {
  switch (source.visualKey) {
    case 'infected-orderly': return Object.freeze({ kind: source.kind, visualKey: source.visualKey, name: source.name })
    case 'infected-porter': return Object.freeze({ kind: source.kind, visualKey: source.visualKey, name: source.name })
    case 'infected-technician': return Object.freeze({ kind: source.kind, visualKey: source.visualKey, name: source.name })
    case null: return Object.freeze({ kind: source.kind, visualKey: source.visualKey, name: source.name })
  }
}
function stopAt(view: PlayerView): CommittedCombatPresentation['stop'] {
  if (view.status !== 'ready') return 'unavailable'
  switch (view.point) {
    case 'battle-decision': case 'stable-active': case 'living-hub': case 'dead': return view.point
    default: return 'unavailable'
  }
}
/** Pure whitelist. It never receives a raw command, S/current, trace or resource owner. */
export function projectCommittedCombatFacts(before: PlayerView | null, execution: PlayerExecution) {
  if (execution.kind !== 'committed' || !execution.committedAction || before?.status !== 'ready' ||
      before.point !== 'battle-decision' || !before.combat) return null
  const view = execution.view, persistence = view.persistence.feedback
  if (persistence !== 'saved' && persistence !== 'save-failed') return null
  const combat = before.combat
  return Object.freeze({ opponent: copyOpponent(combat.opponent), stageBefore: combat.enemyStage,
    stageAfter: view.status === 'ready' ? view.combat?.enemyStage ?? null : null,
    sequence: Object.freeze([Object.freeze({ ordinal: 0 as const, actor: Object.freeze({ role: 'player' as const }),
      action: execution.committedAction.action })] as const), stop: stopAt(view), persistence })
}
/** Explicit terminal boundary: no wrap, collision or gameplay error. */
export function nextPresentationOrdinal(ordinal: number): number | null {
  return Number.isSafeInteger(ordinal) && ordinal >= 0 && ordinal < Number.MAX_SAFE_INTEGER ? ordinal + 1 : null
}
/** Exactly one independent, data-free scope per controller; never a selector scope. */
export function createCommittedPresentationIssuer() {
  const scope = Object.freeze({})
  let ordinal: number | null = 0
  return (before: PlayerView | null, execution: PlayerExecution): CommittedCombatPresentation | undefined => {
    if (ordinal === null) return undefined
    const facts = projectCommittedCombatFacts(before, execution)
    if (!facts) return undefined
    const token = Object.freeze({ scope, ordinal })
    const presentation: CommittedCombatPresentation = Object.freeze({ version: 1, token,
      opponent: facts.opponent, stageBefore: facts.stageBefore, stageAfter: facts.stageAfter,
      sequence: facts.sequence, stop: facts.stop, persistence: facts.persistence })
    ordinal = nextPresentationOrdinal(ordinal)
    return presentation
  }
}
