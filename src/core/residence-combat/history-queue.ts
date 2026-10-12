import { safeAdd } from '../residence-config/validation'
import { ensure } from '../residence-supply/shared-validation'
import { decisionFacts, responseAction } from './history-context'
import type { CombatDependencies, CombatValue, DecisionWitness, EntryWitness } from './types'

/** Verify the recorded transitions, not a new CTB simulation or hidden result. */
export function verifyDecisionQueue(d: DecisionWitness, e: EntryWitness, v: CombatValue, deps: CombatDependencies) {
  const { profile, completion, enemyStart } = decisionFacts(d, e, v, deps)
  const escape = d.command.kind === 'escape'
  if (d.baseRevision === e.revision) ensure(d.ctbBefore === 0 &&
    d.context.enemyNext === (e.previouslyEncountered ? profile.reentryEnemyCtb : profile.firstEnemyCtb) &&
    d.actionCountBefore === e.actionCount && d.riskBefore === e.riskIndex &&
    d.enemyHealthBefore === e.enemyHealth, 'First decision does not bind entry')
  ensure(d.actionCountBefore >= e.actionCount && d.riskBefore >= e.riskIndex, 'Decision predates entry')
  ensure(d.actionCountBefore - e.actionCount <=
    Math.floor(d.ctbBefore / Math.min(...profile.actions.map(a => a.ctb))) + 1,
    'Impossible response count for elapsed battle time')
  let current = d.ctbBefore, enemy = enemyStart, resolved = 0, responses = 0, risk = 0
  const first = d.queue[0]
  if (!first) {
    ensure(!escape && (d.healthAfter === 0 || d.enemyHealthAfter === 0) &&
      d.ctbAfter === current && d.playerNext === current && d.enemyNext === enemy, 'Invalid immediate terminal queue')
  } else {
    ensure(d.enemyHealthAfter > 0 && first.reason === (escape ? 'escape-preparation-scheduled' : 'player-action-scheduled') &&
      first.currentBefore === current && first.currentAfter === current &&
      first.playerBefore === current && first.playerAfter === completion &&
      first.enemyBefore === enemy && first.enemyAfter === enemy, 'Scheduled queue differs from formal action duration/delay')
    ensure(d.queue.length >= 2, 'Missing queue completion')
    for (let i = 1; i < d.queue.length; i++) {
      const q = d.queue[i], last = i === d.queue.length - 1
      ensure(q.currentBefore === current && q.playerBefore === completion && q.playerAfter === completion &&
        q.enemyBefore === enemy, 'Queue source continuity differs')
      if (q.reason === 'enemy-action-resolved' || q.reason === 'enemy-action-terminal') {
        ensure(enemy < completion && q.currentAfter === enemy, 'Enemy response is not strictly earlier')
        const action = responseAction(d, e, deps, resolved)
        responses++
        if (q.reason === 'enemy-action-terminal') {
          ensure(last && d.healthAfter === 0 && q.enemyAfter === enemy, 'Invalid terminal enemy queue')
        } else {
          ensure(!last && q.enemyAfter === safeAdd(enemy, action.ctb), 'Enemy interval differs from bound profile')
          resolved++
          risk += action.exposureRiskTier === 'none' ? 1 : 2
        }
      } else {
        ensure(last && q.reason === (escape ? 'escape-completed' : 'player-decision-point') &&
          enemy >= completion && q.currentAfter === completion && q.enemyAfter === enemy &&
          (escape || d.healthAfter > 0), 'Invalid completion checkpoint')
      }
      current = q.currentAfter; enemy = q.enemyAfter
    }
    ensure(d.ctbAfter === current && d.playerNext === completion && d.enemyNext === enemy, 'Formal queue result differs')
  }
  ensure(d.enemyResponses === responses && d.actionCountAfter === safeAdd(d.actionCountBefore, resolved) &&
    d.riskAfter === safeAdd(d.riskBefore, risk), 'Queue response/count/risk interval differs')
}
