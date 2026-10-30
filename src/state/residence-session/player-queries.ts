import { deepFreeze } from '../../core/config'
import { playerResidenceKnowledge } from '../../core/residence-location/player-knowledge'
import { playerSupplyFacts } from '../../core/residence-supply/player-query'
import { playerTaskOpportunities } from '../../core/residence-task/player-query'
import { taskFact, taskAlreadyProduced } from '../../core/residence-task/plans'
import { playerCombatFacts } from '../../core/residence-combat/player-query'
import { playerTerminalFacts } from '../../core/residence-terminal/player-query'
import type { CombatDependencies } from '../../core/residence-combat/types'
import type { CombatSessionView } from './combat-types'
import type { PlayerContext, ActionReference } from './player-context'
import type { PlayerView, PlayerReadyView, PlayerAction, PlayerLabels } from './player-types'
import { playerOpponent } from './player-opponent'

export function projectPlayerView(state: CombatSessionView, ctx: PlayerContext | null, deps: CombatDependencies,
  labels: PlayerLabels, busy = false): PlayerView {
  const persistence = { feedback: state.persistence }
  if (busy) return deepFreeze({ status: 'blocked', reason: 'transaction-in-progress', persistence })
  if (!state.current) {
    if (state.status === 'unbootstrapped') return deepFreeze({ status: 'unbootstrapped', reason: 'not-started', persistence })
    if (state.status === 'no-save') return deepFreeze({ status: 'no-current', reason: 'no-save', persistence })
    if (state.status === 'read-error') return deepFreeze({ status: 'read-error', reason: 'read-failed', persistence })
    return deepFreeze({ status: 'blocked', reason: 'load-blocked', persistence })
  }
  if (!ctx || ctx.value !== state.current) return deepFreeze({ status: 'blocked', reason: 'projection-unavailable', persistence })
  const v = state.current, s = deps.supply, supply = playerSupplyFacts(v, s), map = playerResidenceKnowledge(v, s)
  const action = (a: ActionReference, label: string, availability: PlayerAction['availability'] = 'parameters-required', cost: number | null = null): PlayerAction =>
    ({ selector: ctx.action(a), family: a.family, label, method: a.method ?? null, availability, cost })
  const name = (key: string) => { const n = s.catalog.data.nodes.find(n => n.id === key)!; return labels.place(n.placeId) + ' / ' + n.name }
  const item = ({ key, ...facts }: typeof supply.carried[number]) => ({ selector: ctx.item(key), ...facts })
  const terminal = playerTerminalFacts(v, s)
  const combat = playerCombatFacts(v, deps)
  const opportunities = playerTaskOpportunities(v, s)
  const taskChoices = opportunities.filter(o => o.family === 'task' && !o.completed).map(o => action(o, labels.action(o.key)))
  const sources = [...new Set(opportunities.filter(o => o.family === 'source').map(o => o.key))].map(key => {
    const rows = opportunities.filter(o => o.family === 'source' && o.key === key)
    return { label: labels.source(key), completed: rows[0].completed,
      choices: rows.filter(o => !o.completed).map(o => action(o, labels.source(o.key))) }
  })
  const moves = map.moves.filter(m => m.canStart).map(m => action({ family: 'move', key: m.key }, m.destination, 'available', m.cost))
  const actions: PlayerAction[] = []
  if (v.phase === 'first-hub') actions.push(action({ family: 'depart', key: 'depart' }, labels.action('depart'), 'available', 0))
  if (v.phase === 'active-world' && !v.battle) {
    for (const key of ['move', 'split', 'merge', 'to-quick', 'to-backpack', 'pickup', 'drop']) actions.push(action({ family: 'inventory', key }, labels.action(key)))
    for (const key of ['task-pickup', 'task-drop']) actions.push(action({ family: 'task-transfer', key }, labels.action(key)))
    actions.push(action({ family: 'medical', key: 'medical' }, labels.action('medical')))
    for (const key of ['mechanical', 'coat', 'toolbox', 'recharge']) actions.push(action({ family: 'maintenance', key }, labels.action(key)))
    if (v.site && s.catalog.data.nodes.find(n => n.id === v.site!.nodeId)!.rest && v.character.clock.kind === 'active' &&
      v.character.clock.taskDay < s.residence.configuration.config.limits.days) actions.push(action({ family: 'rest', key: 'rest' }, labels.action('rest'), 'available'))
    for (const key of ['deliver', 'withdraw', 'deadline'] as const) if (terminal.eligibility[key]) actions.push(action({ family: 'terminal', key }, labels.action(key), 'available'))
  }
  const sampleAction = s.tasks.data.actions.find(a => a.id === s.tasks.data.goal.carried)!
  const sampleDef = s.tasks.data.items.find(i => i.alias === sampleAction.grant)!.id
  const sampleOrigin = v.site && v.origins.find(o => o.kind === 'task' && o.producerId === sampleAction.id && o.binding.execution.runId === v.site!.binding.execution.runId)
  const ownedSample = sampleOrigin && v.carried.backpack.items.some(i => i.definitionId === sampleDef &&
    v.allocations.find(a => a.instanceId === i.instanceId)?.ranges.some(r => r.originId === sampleOrigin.id))
  const sample: PlayerReadyView['tasks']['sample'] = terminal.result?.items.some(i => i.disposition === 'delivered') ? 'delivered' :
    v.phase === 'dead' || v.phase === 'living-hub' ? 'unavailable' : ownedSample ? 'carried' : sampleOrigin ? 'left-in-world' : 'not-acquired'
  const observedSite = v.site ?? v.archives.at(-1)?.site
  const publicObjectives = s.tasks.data.goal.facts.map(key => {
    const declared = s.tasks.data.actions.find(a => a.fact === key)
    return { label: labels.action(key), state: observedSite?.facts.some(f => f.id === key && f.value) ? 'completed' as const :
      declared && observedSite?.knowledge.visitedNodeIds.includes(declared.node) ? 'observed' as const : 'unobserved' as const }
  })
  const combatActions = combat?.actions.map(({ command: c, resourceCost, quickConsumption, signatureUsesRemaining }) => ({ ...action({ family: 'combat', key: c.kind,
    ...(c.kind === 'use-quick-slot-item' ? { slot: c.quickSlotIndex, ...(c.targetOpenWoundId ? { woundId: c.targetOpenWoundId } : {}) } : {}) },
  c.kind === 'use-quick-slot-item' ? `${labels.action(c.kind)} (${c.quickSlotIndex + 1}${c.targetOpenWoundId ? ', ' + (supply.body.wounds.find(w => w.key === c.targetOpenWoundId)!.ordinal) : ''})` : labels.action(c.kind), 'available'),
    resourceCost, quickConsumption, signatureUsesRemaining })) ?? []
  // Public order does not depend on hidden identity spellings.
  combatActions.sort((a, b) => a.label.localeCompare(b.label))
  const view: PlayerReadyView = { status: 'ready', phase: v.phase,
    point: v.phase === 'active-world' ? v.battle ? 'battle-decision' : 'stable-active' : v.phase,
    first: { toolChoices: [v.choices.tool], specialtyChoices: [v.choices.specialty], locked: true },
    location: v.site ? { name: s.catalog.data.nodes.find(n => n.id === v.site!.nodeId)!.name,
      place: labels.place(s.catalog.data.nodes.find(n => n.id === v.site!.nodeId)!.placeId) } : null,
    taskDay: v.character.clock.kind === 'active' ? v.character.clock.taskDay : v.receipts.at(-1)?.taskDay ?? null,
    map: { nodes: map.nodes.map(n => ({ name: n.name, place: labels.place(n.place), visited: n.visited, current: n.current })),
      routes: map.routes.map(r => ({ from: name(r.from), to: name(r.to), observation: r.observation, passable: r.passable })) },
    move: { options: moves }, sources, ground: supply.ground.map(item), carried: supply.carried.map(item), backpack: supply.backpack,
    tasks: { publicObjectives, sample, choices: taskChoices }, terminal: { eligibility: terminal.eligibility, result: terminal.result },
    combat: combat ? { intent: combat.intent, enemyStage: combat.enemyStage, relativeTimeline: combat.relativeTimeline,
      energySettlement: combat.energySettlement, actions: combatActions, opponent: playerOpponent(v, labels)! } : null,
    body: { ...supply.body, wounds: supply.body.wounds.map(({ key, ...w }) => ({ selector: ctx.wound(key), ...w })) },
    persistence, staticHub: { successors: terminal.successors }, actions }
  return deepFreeze(view)
}
