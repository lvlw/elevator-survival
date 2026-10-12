import { deepFreeze } from '../../core/config'
import { restoreMissionCandidate } from '../../core/mission-lifecycle'
import { readExecution, readExpectation, validateBinding } from '../../core/mission-lifecycle/validation'
import { parseResidence } from '../../core/residence-config/validation'
import { readCombatValue } from '../../core/residence-combat/validation'
import { same } from '../../core/residence-terminal/validation'
import { combatDataBoundary } from './combat-body-history'
import { validateCombatResidenceHistory } from './combat-history'
import { requireCombatResidencePolicy } from './combat-policy'
import { combatExpectationSchema } from './combat-schema'
import { CombatResidenceSaveError, type CombatResidenceExpectation, type CombatResidencePolicy } from './combat-types'

function match(ok: unknown, reason: string): asserts ok {
  if (!ok) throw new CombatResidenceSaveError('EXPECTED_MISMATCH', reason)
}
export function readCombatResidenceExpectation(input: CombatResidenceExpectation, policy: CombatResidencePolicy) {
  const h = requireCombatResidencePolicy(policy), scope = h.scope, s = h.dependencies.supply
  return combatDataBoundary('EXPECTED_MISMATCH', () => {
    const e = parseResidence(combatExpectationSchema, input)
    match(same(e.versions, h.versions) && same(e.identity, { characterId: scope.characterId,
      rulesVersion: s.residence.rulesVersion, configurationId: s.residence.configuration.configurationId }), 'Expected version/identity differs')
    match(e.missions.length === scope.declarations.length, 'Expected declaration count differs')
    e.missions.forEach((m, i) => {
      readExpectation(m, scope)
      match(same(m.binding.mission, scope.declarations[i]), 'Expected declaration order differs')
    })
    validateBinding(e.initial.binding, scope); readExecution(e.initial.execution, e.initial.binding)
    match(same(e.initial.binding.mission, scope.declarations[0]), 'Initial declaration differs')
    match(e.battle === null || e.phase === 'active-world', 'Battle expected outside active world')
    match(e.phase !== 'first-hub' || (e.revision === 0 && e.cycle === 1 && e.battle === null && e.closure === null &&
      e.missions.every(m => m.status === 'unaccepted')), 'Invalid first-hub expected')
    match(!['living-hub', 'dead'].includes(e.phase) || e.closure !== null, 'Missing closure expected')
    if (e.closure) match((e.closure.source === 'combat-death') === (e.closure.combat !== null) &&
      (e.closure.source !== 'combat-death' || e.closure.outcome === 'death'), 'Missing or false typed death expected')
    for (const b of [e.battle?.binding, e.closure?.binding].filter(x => x !== undefined)) {
      validateBinding({ characterId: b.identity.characterId, mission: b.mission }, scope)
      readExecution(b.execution, { characterId: b.identity.characterId, mission: b.mission })
      match(same(b.identity, e.identity) && h.versions.catalogs.some(c => c.catalogId === b.catalogId &&
        c.catalogVersion === b.catalogVersion && same(c.mission, b.mission)), 'Expected site scope differs')
    }
    return deepFreeze(e)
  })
}
/** No P resolver, RNG, installation or permission issuance is performed here. */
export function validateCombatResidenceAggregate(input: unknown, expectedInput: CombatResidenceExpectation, policy: CombatResidencePolicy) {
  const h = requireCombatResidencePolicy(policy)
  const e = readCombatResidenceExpectation(expectedInput, policy)
  return combatDataBoundary('INVALID_STATE', () => {
    const v = readCombatValue(input, h.dependencies)
    match(v.phase === e.phase && same(v.character.identity, e.identity) && v.character.revision === e.revision &&
      v.character.cycle === e.cycle, 'Phase/identity/progress differs from independent expected')
    v.missions.forEach((m, i) => combatDataBoundary('EXPECTED_MISMATCH', () => restoreMissionCandidate(m, e.missions[i], h.scope)))
    match(v.choices.tool === e.initial.choices.tool && v.choices.specialty === e.initial.choices.specialty,
      'Initial choices differ from independent bootstrap material')
    for (const o of v.origins.filter(o => o.kind === 'initial')) match(same(o.binding.identity, e.identity) &&
      same(o.binding.mission, e.initial.binding.mission) && same(o.binding.execution, e.initial.execution),
    'Initial execution differs from independent bootstrap material')
    let battle = null
    if (v.battle) {
      const b = v.battle, a = b.entry, enemy = v.site!.enemies.find(x => x.id === a.enemyId)!
      battle = { binding: a.binding, battleId: a.id, entryRevision: a.revision, from: a.from, to: a.to, edgeId: a.edgeId,
        enemyId: a.enemyId, enemyInstanceId: a.enemyInstanceId, definitionId: a.definitionId,
        currentCtb: b.currentCtb, playerNext: b.playerNext, enemyNext: b.enemyNext,
        intent: enemy.state.currentIntentActionId, nextCycleIndex: enemy.state.nextCycleIndex,
        actionCount: enemy.state.resolvedActionCount, riskIndex: enemy.riskDrawIndex }
    }
    match(same(battle, e.battle), 'Actual battle/queue/intent differs from independent expected')
    const r = v.receipts.at(-1)
    let closure = null
    if (r) {
      const death = r.source === 'combat-death' ? v.combatDeaths.find(d => d.id === r.combatDeathReceiptId)! : null
      const a = death?.entry
      closure = { binding: r.binding, outcome: r.outcome, source: r.source, revision: r.revision,
        startCycle: r.startCycle, endCycle: r.endCycle, taskDay: r.taskDay,
        combat: a && death ? { battleId: a.id, entryRevision: a.revision, edgeId: a.edgeId, from: a.from, to: a.to,
          enemyId: a.enemyId, enemyInstanceId: a.enemyInstanceId, definitionId: a.definitionId, trace: death.decision.trace } : null }
    }
    match(same(closure, e.closure), 'Latest closure/source/typed death differs from independent expected')
    validateCombatResidenceHistory(v, h.dependencies)
    return deepFreeze(v)
  })
}
