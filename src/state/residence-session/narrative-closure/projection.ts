import { deepFreeze } from '../../../core/config'
import type { CombatValue, CombatDependencies } from '../../../core/residence-combat/types'
import type { ClosureKey, ClosureKnowledge } from './types'

/** Finite trusted knowledge. No reading marks or UI history participate in qualification. */
export function closureKnowledge(v: CombatValue, deps: CombatDependencies): ClosureKnowledge {
  const site = v.site ?? v.archives.at(-1)?.site
  const fact = (key: string) => site?.facts.some(f => f.id === key && f.value) === true
  const stable = v.phase === 'active-world' && !v.battle && v.character.body.condition.currentHealth > 0
  const known: ClosureKey[] = []
  if (site?.knowledge.visitedNodeIds.includes('L5')) known.push('HC06', 'HC07', 'HC08B')
  if (fact('method')) known.push('HC09')
  if (fact('transfer')) known.push('HC19')
  const result = v.receipts.at(-1)
  if (v.phase === 'living-hub' || v.phase === 'dead') {
    const key = result && ({ success: 'HC25', 'voluntary-failure': 'HC26', 'deadline-failure': 'HC28', death: 'HC29' } as const)[result.outcome]
    if (key) known.push(key)
  }
  const definition = deps.supply.tasks.data.items.find(i => i.alias === 'component')?.id
  const componentCarried = v.carried.backpack.items.some(i => i.definitionId === definition &&
    v.allocations.find(a => a.instanceId === i.instanceId)?.ranges.some(r => v.origins.some(o =>
      o.id === r.originId && o.kind === 'task' && o.producerId === 'component' && o.binding.execution.runId === site?.binding.execution.runId)))
  return deepFreeze({ known, zhou: stable && v.site?.nodeId === 'L5', platform: stable && v.site?.nodeId === 'H8',
    returnPoint: stable && v.site?.nodeId === 'H0', workorder: fact('workorder'), method: fact('method'),
    transfer: fact('transfer'), power: fact('power'), componentCarried })
}
