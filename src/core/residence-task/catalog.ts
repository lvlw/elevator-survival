import { z } from 'zod'
import { deepFreeze, type DeepReadonly } from '../config'
import { idSchema, parseResidence } from '../residence-config/validation'
import { requireSupplyConfig, type SupplyConfig } from '../residence-supply/config'

const ids = z.array(idSchema)
const node = z.strictObject({ id: idSchema, map: idSchema, name: idSchema, rest: z.enum(['A', 'C']),
  enemy: idSchema.nullable(), surfaceEdges: ids })
const edge = z.strictObject({ id: idSchema, ends: z.tuple([idSchema, idSchema]), cost: idSchema,
  fact: idSchema.nullable(), item: idSchema.nullable(), revealBy: idSchema.nullable() })
const item = z.strictObject({ id: idSchema, alias: idSchema, profile: idSchema, ordinary: z.boolean(),
  quickEligible: z.boolean(), resource: z.literal('none'), origin: idSchema })
const source = z.strictObject({ id: idSchema, node: idSchema, grants: idSchema.nullable(), cost: idSchema,
  requires: ids, mode: z.enum(['ground-once', 'only-with-first-toolbox-door', 'atomic-exchange',
    'paired-H2-search-choice', 'paired-H1-search-choice']), inputs: idSchema.optional(),
  choices: ids.optional(), weights: idSchema.optional(), note: idSchema.optional() })
const action = z.strictObject({ id: idSchema, node: idSchema, cost: idSchema, requires: ids,
  fact: idSchema.nullable(), consume: idSchema.nullable(), grant: idSchema.nullable(), outputQuantity: idSchema.optional() })
const enemy = z.strictObject({ id: idSchema, node: idSchema, parameters: idSchema, wounds: ids,
  woundRisk: ids, exposureRisk: ids, bluntWeakness: z.boolean(), persistent: ids })
const schema = z.strictObject({ contentId: idSchema, configurationId: idSchema, data: z.strictObject({
  identity: z.strictObject({ world: idSchema, commission: idSchema, technicalMapping: idSchema }),
  maps: z.record(idSchema, idSchema), nodes: z.array(node), edges: z.array(edge), items: z.array(item),
  sources: z.array(source), actions: z.array(action), enemies: z.array(enemy),
  goal: z.strictObject({ return: idSchema, facts: ids, carried: idSchema, hotelRequired: z.boolean() }),
}) })
export type TaskCatalog = DeepReadonly<z.infer<typeof schema>>
const handles = new WeakSet<object>()
export function createTaskCatalog(input: unknown, config: SupplyConfig): TaskCatalog {
  requireSupplyConfig(config)
  const v = parseResidence(schema, input)
  if (v.configurationId !== config.configurationId) throw new Error('TASK_CONFIG_MISMATCH')
  const d = v.data
  for (const rows of [d.nodes, d.edges, d.items, d.sources, d.actions, d.enemies]) {
    if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('DUPLICATE_TASK_CONTENT')
  }
  const nodes = new Set(d.nodes.map(n => n.id)), facts = new Set(d.actions.flatMap(a => a.fact ? [a.fact] : []))
  const aliases = new Set(d.items.map(i => i.alias))
  if (aliases.size !== d.items.length || new Set(d.actions.flatMap(a => a.fact ? [a.fact] : [])).size !== d.actions.filter(a => a.fact).length)
    throw new Error('DUPLICATE_TASK_ALIAS_OR_FACT')
  for (const e of d.enemies) facts.add('enemy-' + e.id + '-cleared')
  const parameter = (key: string) => { if (!(key in config.values)) throw new Error('UNKNOWN_TASK_PARAMETER') }
  for (const e of d.edges) {
    parameter(e.cost)
    if (e.ends[0] === e.ends[1] || e.ends.some(n => !nodes.has(n)) || (e.fact && !facts.has(e.fact)) ||
      (e.revealBy && !facts.has(e.revealBy)) || (e.item && !d.items.some(i => i.alias === e.item))) throw new Error('INVALID_TASK_EDGE')
  }
  for (const n of d.nodes) {
    if (!(n.map in d.maps) || new Set(n.surfaceEdges).size !== n.surfaceEdges.length ||
      (n.enemy !== null && !d.enemies.some(e => e.id === n.enemy && e.node === n.id)) ||
      n.surfaceEdges.some(id => !d.edges.some(e => e.id === id && e.ends.includes(n.id)))) throw new Error('INVALID_TASK_NODE')
  }
  for (const a of [...d.actions, ...d.sources]) {
    parameter(a.cost)
    if (!nodes.has(a.node) || a.requires.some(f => !facts.has(f))) throw new Error('INVALID_TASK_PREREQUISITE')
  }
  for (const s of d.sources) {
    if (s.grants) parameter(s.grants)
    if (s.inputs) parameter(s.inputs)
    if (s.weights) parameter(s.weights)
    if (s.choices && (!s.weights || new Set(s.choices).size !== s.choices.length || !s.choices.every(alias => aliases.has(alias)))) throw new Error('INVALID_TASK_CHOICES')
  }
  for (const a of d.actions) {
    if (a.consume) parameter(a.consume)
    if (a.outputQuantity) parameter(a.outputQuantity)
    if (a.grant && (!aliases.has(a.grant) || !a.outputQuantity)) throw new Error('INVALID_TASK_OUTPUT')
  }
  for (const e of d.enemies) {
    parameter(e.parameters)
    if (!d.nodes.some(n => n.id === e.node && n.enemy === e.id)) throw new Error('INVALID_TASK_ENEMY')
  }
  if (!nodes.has(d.goal.return) || d.goal.facts.some(f => !facts.has(f)) || !d.actions.some(a => a.id === d.goal.carried && a.grant))
    throw new Error('INVALID_TASK_GOAL')
  for (const i of d.items) parameter(i.profile)
  const result = deepFreeze(v); handles.add(result); return result
}
export function requireTaskCatalog(input: TaskCatalog) {
  if (!handles.has(input)) throw new Error('UNCONTROLLED_TASK_CATALOG')
  return input
}
