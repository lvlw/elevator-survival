import { z } from 'zod'
import { deepFreeze, type DeepReadonly } from '../config'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
const keys = [
  "move.local",
  "move.cross",
  "move.side",
  "search.dark",
  "search.lit",
  "search.fixed",
  "door.crow",
  "door.manual",
  "door.toolbox",
  "door.card",
  "survey",
  "restore.power",
  "investigate",
  "verify.full",
  "verify.fast",
  "verify.scout.full",
  "verify.scout.fast",
  "fix.method",
  "extract.part",
  "extract.sample.cautious",
  "extract.sample.direct",
  "install",
  "bypass.crow",
  "exchange",
  "maintenance.mechanical",
  "maintenance.coat",
  "maintenance.toolbox",
  "recharge",
  "medical.free",
  "load.bands",
  "load.contusion_percent",
  "grid",
  "quick.slots",
  "capacity.pipe",
  "capacity.coat",
  "capacity.crow",
  "capacity.lamp",
  "capacity.toolbox",
  "restore.metal_pool",
  "restore.coat",
  "restore.lamp",
  "restore.toolbox",
  "wear.tool",
  "wear.lamp",
  "wear.pipe.basic",
  "wear.pipe.signature",
  "bandage.hp",
  "survival.hp",
  "firstaid.hp",
  "ration.satiety",
  "disinfect.exposure",
  "unit",
  "bandage.ctb",
  "painkiller.ctb",
  "retreat.normal",
  "retreat.overloaded",
  "retreat.wound",
  "retreat.wound_cap",
  "painkiller.retreat",
  "combat.minimum",
  "combat.ctb_step",
  "combat.energy_step",
  "reentry.enemy",
  "reentry.player",
  "sample.exposure",
  "sample.risks",
  "sample.coat_risks",
  "physical.food",
  "physical.bandage",
  "physical.disinfect",
  "physical.suppressant",
  "physical.painkiller",
  "physical.firstaid",
  "physical.metal",
  "physical.electronic",
  "physical.cloth",
  "physical.battery",
  "physical.card",
  "physical.sample",
  "physical.component",
  "physical.module",
  "grant.H1-search",
  "grant.H2-search",
  "grant.H3-search",
  "grant.L1-cabinet",
  "grant.L2-search",
  "grant.L3-rack",
  "grant.C4-cabinet",
  "grant.C4-food",
  "grant.H1-toolbox",
  "grant.T1-exchange",
  "exchange.inputs",
  "install.inputs",
  "enemy.orderly",
  "enemy.porter",
  "enemy.technician",
  "maintenance.inputs",
  "pipe.basic.damage",
  "pipe.basic.ctb",
  "pipe.signature.damage",
  "pipe.signature.ctb",
  "random.H1",
  "random.H2"
]
type Value = number | readonly Value[] | Readonly<{ [key: string]: Value }>
export type SupplyConfig = DeepReadonly<{ configurationId: string; values: Record<string, Value> }>
export function tableFieldValue(c: SupplyConfig, key: string, field: string): Readonly<Record<string, number>> {
  requireSupplyConfig(c)
  const parent = c.values[key]
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) throw new Error('UNKNOWN_TABLE_FIELD')
  const value = (parent as Readonly<Record<string, Value>>)[field]
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(v => typeof v !== 'number')) throw new Error('INVALID_TABLE_FIELD')
  const result: Record<string, number> = {}
  for (const [key, number] of Object.entries(value)) {
    if (typeof number !== 'number') throw new Error('INVALID_TABLE_FIELD')
    result[key] = number
  }
  return Object.freeze(result)
}
const valuesSchema = z.strictObject({
"move.local": countSchema,
"move.cross": countSchema,
"move.side": countSchema,
"search.dark": countSchema,
"search.lit": countSchema,
"search.fixed": countSchema,
"door.crow": countSchema,
"door.manual": countSchema,
"door.toolbox": countSchema,
"door.card": countSchema,
"survey": countSchema,
"restore.power": countSchema,
"investigate": countSchema,
"verify.full": countSchema,
"verify.fast": countSchema,
"verify.scout.full": countSchema,
"verify.scout.fast": countSchema,
"fix.method": countSchema,
"extract.part": countSchema,
"extract.sample.cautious": countSchema,
"extract.sample.direct": countSchema,
"install": countSchema,
"bypass.crow": countSchema,
"exchange": countSchema,
"maintenance.mechanical": countSchema,
"maintenance.coat": countSchema,
"maintenance.toolbox": countSchema,
"recharge": countSchema,
"medical.free": countSchema,
"load.bands": z.tuple([z.tuple([countSchema, countSchema, countSchema]), z.tuple([countSchema, countSchema, countSchema]), z.tuple([countSchema, countSchema, countSchema])]),
"load.contusion_percent": countSchema,
"grid": z.tuple([countSchema, countSchema]),
"quick.slots": countSchema,
"capacity.pipe": countSchema,
"capacity.coat": countSchema,
"capacity.crow": countSchema,
"capacity.lamp": countSchema,
"capacity.toolbox": countSchema,
"restore.metal_pool": countSchema,
"restore.coat": countSchema,
"restore.lamp": countSchema,
"restore.toolbox": countSchema,
"wear.tool": countSchema,
"wear.lamp": countSchema,
"wear.pipe.basic": countSchema,
"wear.pipe.signature": countSchema,
"bandage.hp": countSchema,
"survival.hp": countSchema,
"firstaid.hp": countSchema,
"ration.satiety": countSchema,
"disinfect.exposure": countSchema,
"unit": countSchema,
"bandage.ctb": countSchema,
"painkiller.ctb": countSchema,
"retreat.normal": countSchema,
"retreat.overloaded": countSchema,
"retreat.wound": countSchema,
"retreat.wound_cap": countSchema,
"painkiller.retreat": countSchema,
"combat.minimum": countSchema,
"combat.ctb_step": countSchema,
"combat.energy_step": countSchema,
"reentry.enemy": countSchema,
"reentry.player": countSchema,
"sample.exposure": countSchema,
"sample.risks": z.tuple([countSchema, countSchema]),
"sample.coat_risks": z.tuple([countSchema, countSchema]),
"physical.food": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.bandage": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.disinfect": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.suppressant": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.painkiller": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.firstaid": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.metal": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.electronic": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.cloth": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.battery": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.card": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.sample": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.component": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"physical.module": z.tuple([countSchema, countSchema, countSchema, countSchema]),
"grant.H1-search": z.strictObject({"metal": countSchema}),
"grant.H2-search": z.strictObject({"bandage": countSchema}),
"grant.H3-search": z.strictObject({"card": countSchema, "battery": countSchema}),
"grant.L1-cabinet": z.strictObject({"food": countSchema, "bandage": countSchema}),
"grant.L2-search": z.strictObject({"food": countSchema, "metal": countSchema, "cloth": countSchema}),
"grant.L3-rack": z.strictObject({"metal": countSchema, "electronic": countSchema, "battery": countSchema}),
"grant.C4-cabinet": z.strictObject({"metal": countSchema, "electronic": countSchema, "battery": countSchema}),
"grant.C4-food": z.strictObject({"food": countSchema}),
"grant.H1-toolbox": z.strictObject({"electronic": countSchema}),
"grant.T1-exchange": z.strictObject({"food": countSchema}),
"exchange.inputs": z.strictObject({"bandage": countSchema, "disinfect": countSchema}),
"install.inputs": z.strictObject({"component": countSchema, "module": countSchema, "metal": countSchema, "electronic": countSchema}),
"enemy.orderly": z.strictObject({"hp": countSchema, "first": countSchema, "damages": z.tuple([countSchema, countSchema]), "waits": z.tuple([countSchema, countSchema])}),
"enemy.porter": z.strictObject({"hp": countSchema, "first": countSchema, "damages": z.tuple([countSchema, countSchema]), "waits": z.tuple([countSchema, countSchema])}),
"enemy.technician": z.strictObject({"hp": countSchema, "first": countSchema, "damages": z.tuple([countSchema, countSchema]), "waits": z.tuple([countSchema, countSchema])}),
"maintenance.inputs": z.strictObject({"pipe": z.strictObject({"metal": countSchema}), "crow": z.strictObject({"metal": countSchema}), "coat": z.strictObject({"cloth": countSchema}), "toolbox": z.strictObject({"metal": countSchema, "electronic": countSchema}), "lamp": z.strictObject({"battery": countSchema})}),
"pipe.basic.damage": countSchema,
"pipe.basic.ctb": countSchema,
"pipe.signature.damage": countSchema,
"pipe.signature.ctb": countSchema,
"random.H1": z.strictObject({"battery": countSchema, "cloth": countSchema, "electronic": countSchema}),
"random.H2": z.strictObject({"disinfect": countSchema, "painkiller": countSchema, "firstaid": countSchema, "suppressant": countSchema}),
})
const handles = new WeakSet<object>()
export function createSupplyConfig(input: unknown): SupplyConfig {
  const parsed = parseResidence(z.strictObject({ configurationId: idSchema, values: valuesSchema }), input)
  if (JSON.stringify(Object.keys(parsed.values).sort()) !== JSON.stringify([...keys].sort())) throw new Error('SUPPLY_CONFIGURATION_KEYS')
  const result = deepFreeze(parsed); handles.add(result); return result
}
export function requireSupplyConfig(input: SupplyConfig): SupplyConfig {
  if (!handles.has(input)) throw new Error('UNCONTROLLED_SUPPLY_CONFIG')
  return input
}
export function numberValue(config: SupplyConfig, key: string): number {
  const v = config.values[key]
  if (typeof v !== 'number') throw new Error('SUPPLY_NOT_NUMERIC: ' + key)
  return v
}
export function tableValue(config: SupplyConfig, key: string): Readonly<Record<string, number>> {
  const v = config.values[key]
  if (!v || Array.isArray(v) || typeof v !== 'object' || Object.values(v).some(n => typeof n !== 'number')) throw new Error('SUPPLY_NOT_TABLE')
  return v as Readonly<Record<string, number>>
}
export function vectorValue(config: SupplyConfig, key: string, length: number): readonly number[] {
  const v = config.values[key]
  if (!Array.isArray(v) || v.length !== length || v.some(n => typeof n !== 'number')) throw new Error('SUPPLY_NOT_VECTOR')
  return v as readonly number[]
}
export function numberField(config: SupplyConfig, key: string, field: string): number {
  const v = config.values[key]
  if (!v || Array.isArray(v) || typeof v !== 'object') throw new Error('SUPPLY_NOT_OBJECT')
  const n = (v as Readonly<Record<string, Value>>)[field]
  if (typeof n !== 'number') throw new Error('SUPPLY_NOT_FIELD')
  return n
}
