import { safeAdd } from '../../core/residence-config/validation'
import { carriedItems } from '../../core/residence-location/validation'
import type { SupplyDependencies, SupplyValue } from '../../core/residence-supply/types'
import { same } from '../../core/residence-terminal/validation'
import { SupplyResidenceSaveError } from './supply-types'

function check(ok: unknown, reason: string): asserts ok {
  if (!ok) throw new SupplyResidenceSaveError('INVALID_STATE', reason)
}
/** Stored relationships only. E01-P remains owner of provenance and settlement math. */
export function validateSupplyResidenceHistory(v: SupplyValue, deps: SupplyDependencies): void {
  const { character: c } = v, clock = c.clock
  const executions = v.missions.flatMap(m => m.status === 'unaccepted' ? [] : [m.execution.runId])
  check(new Set(executions).size === executions.length, 'Execution reused across declarations')
  if (v.phase === 'first-hub') {
    check(c.revision === 0 && c.cycle === 1 && v.missions.every(m => m.status === 'unaccepted') &&
      v.archives.length === 0, 'Not a genuine first boundary')
    return
  }
  check(clock.kind !== 'first-ready', 'Noninitial state has initial clock')
  const current = clock.kind === 'active' ? clock : clock.source
  let nextStart = 1
  for (const [i, r] of v.receipts.entries()) {
    const a = v.archives[i], prior = v.receipts[i - 1]
    check(r.startCycle === nextStart && (!prior || prior.outcome !== 'death') &&
      r.endCycle <= c.cycle && r.before <= deps.terminal.config.balance_max - deps.terminal.config.success_reward,
    'Closure history cycle/capacity contradiction')
    if (r.outcome !== 'death') nextStart = safeAdd(r.endCycle, 1)
    check(r.outcome === 'death' ? ['supply-death', 'location-death', 'deadline'].includes(r.source) :
      r.source === (r.outcome === 'deadline-failure' ? 'deadline' : 'normal-return'), 'Wrong closure source')
    if (r.source === 'normal-return' || r.source === 'deadline') check(a.site.pending.kind === 'none', 'Unsettled return archive')
    if (r.source === 'deadline') check(a.site.nodeId !== deps.tasks.data.goal.return, 'Deadline at return node')
    let previousHealth: number | undefined
    const action = r.steps[0]?.kind === 'primary'
    const order = action ? ['primary', 'action-bleeding'] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle']
    const fields = { primary: ['healthLoss', 'exposuresAdded'], 'action-bleeding': ['damage'], 'cycle-bleeding': ['damage'],
      infection: ['progressBefore', 'progressAfter', 'exposuresConverted', 'suppression', 'damage'],
      hunger: ['satietyBefore', 'satietyAfter', 'damage'], 'end-cycle': ['energyBefore', 'energyAfter'] }
    check(r.source !== 'deadline' || !action, 'Deadline has action trace')
    for (const [n, s] of r.steps.entries()) {
      check(s.kind === order[n] && s.healthBefore > 0 && s.healthBefore <= deps.residence.configuration.config.limits.hp &&
        s.healthAfter <= s.healthBefore && (previousHealth === undefined || s.healthBefore === previousHealth) &&
        (s.healthAfter !== 0 || n === r.steps.length - 1), 'Invalid historical checkpoint order')
      check(same(Object.keys(s.facts).sort(), [...fields[s.kind]].sort()) &&
        Object.values(s.facts).every(x => typeof x === 'number'), 'Invalid historical checkpoint fields')
      check(s.kind === 'end-cycle' ? s.healthBefore === s.healthAfter :
        s.healthBefore - s.healthAfter === s.facts[s.kind === 'primary' ? 'healthLoss' : 'damage'], 'Checkpoint damage contradiction')
      if (s.kind === 'infection') check(Number(s.facts.progressAfter) >= Number(s.facts.progressBefore), 'Infection trace decreases progress')
      if (s.kind === 'hunger') check(Number(s.facts.satietyAfter) <= Number(s.facts.satietyBefore) &&
        Number(s.facts.satietyBefore) <= deps.residence.configuration.config.limits.satiety, 'Hunger trace increases satiety')
      if (s.kind === 'end-cycle') check(Number(s.facts.energyBefore) <= deps.residence.configuration.config.limits.energy &&
        s.facts.energyAfter === deps.residence.configuration.config.rest.A, 'Deadline reset trace differs')
      previousHealth = s.healthAfter
    }
    if (r.source !== 'normal-return') check(r.outcome === 'death'
      ? r.steps.at(-1)?.healthAfter === 0 && r.steps.at(-1)?.kind !== 'end-cycle'
      : r.steps.length === 4 && r.steps.at(-1)!.healthAfter > 0, 'Wrong final checkpoint')
    const dispositions = v.dispositions.filter(d => r.dispositionIds.includes(d.id))
    for (const d of dispositions) {
      const descriptor = deps.tasks.data.items.find(item => item.id === d.item.definitionId)
      check(d.reason === 'terminal' && d.cycle === r.endCycle && d.revision === r.revision &&
        (r.outcome === 'death' ? d.kind === 'death-unavailable' :
          descriptor?.alias === 'sample' ? d.kind === (r.outcome === 'success' ? 'delivered' : 'partial-delivery') :
            descriptor?.alias === 'card' ? d.kind === 'revoked-permission' : descriptor && !descriptor.ordinary && d.kind === 'returned-special'),
      'Terminal disposition classification differs')
    }
    if (r.outcome === 'voluntary-failure') check(!(dispositions.some(d => d.kind === 'partial-delivery') &&
      deps.tasks.data.goal.facts.every(id => a.site.facts.some(f => f.id === id && f.value))), 'Qualified success cannot be failure')
  }
  if (v.phase === 'active-world') {
    check(c.body.condition.currentHealth > 0 && clock.kind === 'active' &&
      v.receipts.at(-1)?.outcome !== 'death' && clock.startCycle === nextStart &&
      c.revision > (v.receipts.at(-1)?.revision ?? 0), 'Active chronology differs')
  } else {
    const r = v.receipts.at(-1)
    check(r && same(current.mission, r.binding.mission) && same(current.execution, r.binding.execution) &&
      current.startCycle === r.startCycle && current.taskDay === r.taskDay, 'Latest closure/clock binding differs')
    check(v.phase === 'dead' ? clock.kind === 'active' && c.cycle === r.endCycle :
      clock.kind !== 'active' && clock.source.outcome === r.outcome && clock.source.endCycle === r.endCycle &&
      clock.kind === (r.source === 'deadline' ? 'deadline-ready' : 'return-due') &&
      c.cycle === (r.source === 'deadline' ? safeAdd(r.endCycle, 1) : r.endCycle), 'Latest cycle continuation differs')
    if (r.steps.length) {
      check(r.steps.at(-1)!.healthAfter === c.body.condition.currentHealth, 'Latest body HP differs')
      const infection = r.steps.find(s => s.kind === 'infection'), hunger = r.steps.find(s => s.kind === 'hunger')
      const bleeding = r.steps.find(s => s.kind === 'action-bleeding' || s.kind === 'cycle-bleeding')
      if (bleeding && (bleeding.kind === 'action-bleeding' || Number(bleeding.facts.damage) > 0))
        check(c.body.condition.bleeding, 'Latest bleeding lacks body qualification')
      const primary = r.steps.find(s => s.kind === 'primary')
      if (primary) check(Number(primary.facts.exposuresAdded) <= c.body.condition.pendingInfectionExposures, 'Latest primary exposure is absent')
      if (infection && !r.steps.some(s => s.kind === 'end-cycle'))
        check(c.body.suppression === infection.facts.suppression, 'Death changed suppression before reset')
      if (infection) check(c.body.infectionProgress === infection.facts.progressAfter &&
        c.body.condition.pendingInfectionExposures === 0, 'Latest infection differs')
      if (hunger) check(c.body.satiety === hunger.facts.satietyAfter, 'Latest satiety differs')
      const end = r.steps.find(s => s.kind === 'end-cycle')
      if (end) check(c.body.energy === end.facts.energyAfter &&
        end.facts.energyAfter === deps.residence.configuration.config.rest.A &&
        !c.body.condition.painkillerActive && c.body.suppression === 0 &&
        same(c.body.quotasRemaining, deps.residence.configuration.config.quota), 'Latest completed reset differs')
    }
  }
  for (const d of v.dispositions) {
    const r = v.receipts.find(r => same(r.binding, d.binding))
    check(r ? d.cycle >= r.startCycle && d.cycle <= r.endCycle && d.revision <= r.revision :
      same(d.binding.execution, current.execution) && d.cycle >= current.startCycle, 'Disposition outside execution')
    check(d.kind === 'consumed' ? ['medical', 'recipe'].includes(d.reason) :
      d.kind === 'installed' ? d.reason === 'recipe' : d.reason === 'terminal', 'Disposition reason differs')
  }
  const ordinary = (id: string) => deps.catalog.data.items.some(i => i.physical.id === id && i.ordinary)
  check(v.warehouse.items.every(i => ordinary(i.definitionId)), 'Task object in warehouse')
  if (v.phase === 'living-hub') check(carriedItems(v.carried).every(i => ordinary(i.definitionId)), 'Closed task object remains usable')
  const owners = [
    ...carriedItems(v.carried).map(item => ({ item, execution: current.execution })),
    ...v.warehouse.items.map(item => ({ item, execution: current.execution })),
    ...[...v.archives.map(a => a.site), ...(v.site ? [v.site] : [])].flatMap(site =>
      site.ground.flatMap(g => g.items.map(item => ({ item, execution: site.binding.execution })))),
  ]
  const order = new Map(v.missions.filter(m => m.status !== 'unaccepted').map((m, i) => [m.execution.runId, i]))
  const units = [...owners.map(owner => ({ ...owner, ranges: v.allocations.find(a => a.instanceId === owner.item.instanceId)!.ranges })),
    ...v.dispositions.map(d => ({ item: d.item, execution: d.binding.execution, ranges: d.ranges }))]
  for (const { item, execution, ranges } of units) for (const range of ranges) {
    const origin = v.origins.find(o => o.id === range.originId)!
    check(order.has(origin.binding.execution.runId) && order.has(execution.runId) &&
      order.get(origin.binding.execution.runId)! <= order.get(execution.runId)!, 'Unit predates its originating execution')
    if (!ordinary(item.definitionId)) check(same(origin.binding.execution, execution), 'Task object moved between executions')
  }
}
