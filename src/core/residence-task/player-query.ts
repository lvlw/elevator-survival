import { deepFreeze } from '../config'
import type { SupplyDomain } from '../residence-supply/shared-types'
import type { SupplyDependencies } from '../residence-supply/types'
import { taskAlreadyProduced, taskFact } from './plans'
import type { TaskOpportunity, TaskMethod } from './player-query-types'
import { taskMethodChoices } from './qualification'
import { supplySourceMethodChoices } from './shared-sources'

/** Observed local opportunities only. No output table, random choice, cursor or origin. */
export function playerTaskOpportunities(v: SupplyDomain, deps: SupplyDependencies): readonly TaskOpportunity[] {
  if (v.phase !== 'active-world' || !v.site || v.site.pending.kind !== 'none') return deepFreeze([])
  const rows: TaskOpportunity[] = []
  for (const a of deps.tasks.data.actions.filter(a => a.node === v.site!.nodeId)) {
    const completed = !!taskAlreadyProduced(v, a.id) || !!(a.fact && taskFact(v, a.fact))
    if (!a.requires.every(id => taskFact(v, id))) continue
    const choices = taskMethodChoices(a.id)
    const methods: readonly (TaskMethod | undefined)[] = choices.length ? choices : [undefined]
    for (const method of methods) rows.push({ key: a.id, family: 'task', ...(method ? { method } : {}), completed })
  }
  for (const s of deps.tasks.data.sources.filter(s => s.node === v.site!.nodeId && s.mode !== 'only-with-first-toolbox-door' && !s.mode.startsWith('paired-'))) {
    if (!s.requires.every(id => taskFact(v, id))) continue
    const completed = !!taskAlreadyProduced(v, s.id)
    const choices = supplySourceMethodChoices(s.id), methods = choices.length ? choices : [undefined]
    for (const method of methods) rows.push({ key: s.id, family: 'source', ...(method ? { method } : {}), completed })
  }
  return deepFreeze(rows)
}
