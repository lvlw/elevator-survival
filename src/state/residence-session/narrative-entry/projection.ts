import type { CombatValue, CombatDependencies } from '../../../core/residence-combat/types'
import type { NarrativeKnowledge, StoryKey } from './types'

/** Trusted, finite facts only. Reading marks are deliberately not an input. */
export function narrativeKnowledge(v: CombatValue, deps: CombatDependencies): NarrativeKnowledge {
  const site = v.site ?? v.archives.at(-1)?.site
  const fact = (id: string) => site?.facts.some(f => f.id === id && f.value) === true
  const visited = (id: string) => site?.knowledge.visitedNodeIds.includes(id) === true
  const produced = (id: string) => v.productions.some(p => p.producerId === id && p.binding.execution.runId === site?.binding.execution.runId)
  const known: StoryKey[] = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06']
  if (visited('H0')) known.push('H01')
  if (visited('H1')) known.push('H02')
  if (produced('H1-search') || produced('H2-search')) known.push('H03')
  // A pickup cannot be inferred from visiting, reading, or seeing something on the ground.
  if (v.carried.backpack.items.some(i => v.allocations.find(a => a.instanceId === i.instanceId)?.ranges.some(r =>
    v.origins.some(o => o.id === r.originId && o.kind === 'ordinary')))) known.push('H04')
  if (fact('fire-door')) known.push('H05')
  if (v.battle?.entry.definitionId === 'infected-world-orderly' || v.battles.some(b => b.entry.definitionId === 'infected-world-orderly')) known.push('H06')
  if (fact('workorder')) known.push('H07')
  return Object.freeze({ known: Object.freeze(known), workorder: fact('workorder'), powerSurvey: fact('power-survey'),
    doorParts: v.productions.some(p => p.producerId === 'fire-door' && p.method === 'toolbox' && p.binding.execution.runId === site?.binding.execution.runId),
    brief: Object.freeze({ days: deps.supply.residence.configuration.config.limits.days,
      reward: deps.supply.terminal.config.success_reward, penalty: deps.supply.terminal.config.failure_penalty }) })
}
