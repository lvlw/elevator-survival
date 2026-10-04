import type { ItemInstance } from '../../core/inventory'
import { carriedItems } from '../../core/residence-location/validation'
import { sourceItemId } from '../../core/residence-location/identity'
import { safeAdd } from '../../core/residence-config/validation'
import { policyFor } from '../../core/residence-terminal/validation'
import type { TerminalDependencies, TerminalSnapshot } from '../../core/residence-terminal'
import { TerminalResidenceSaveError } from './terminal-types'

function invalid(message: string): never { throw new TerminalResidenceSaveError('INVALID_STATE', message) }
/** Decode the existing length-prefixed identity representation, not random outcomes. */
function segments(value: string): string[] | null {
  const result: string[] = []
  let offset = 0
  while (offset < value.length) {
    const colon = value.indexOf(':', offset)
    if (colon < 0) return null
    const size = value.slice(offset, colon)
    if (!/^(0|[1-9][0-9]*)$/.test(size)) return null
    const length = Number(size)
    if (!Number.isSafeInteger(length) || length > value.length - colon - 1) return null
    offset = colon + 1
    result.push(value.slice(offset, offset + length))
    offset += length
    if (offset === value.length) return result
    if (value[offset++] !== '|' || offset === value.length) return null
  }
  return null
}
export function isSourceEntityId(id: string): boolean {
  const outer = segments(id)
  return !!outer && segments(outer[1] ?? '')?.[0] === 'residence-location-v1'
}

/** All source output survives as a whole instance, including explicit past dispositions. */
export function validateTerminalEntityHistory(value: TerminalSnapshot, deps: TerminalDependencies): void {
  // These are relationships between stored facts, not a replay of body/cycle rules.
  // Both normal-return departure and deadline-ready departure start at prior end + 1.
  let expectedStart = 1
  for (const receipt of value.receipts) {
    if (receipt.startCycle !== expectedStart) invalid('Execution history skips or repeats a character cycle')
    if (receipt.outcome !== 'death') expectedStart = safeAdd(receipt.endCycle, 1)
    const end = receipt.steps.find((s) => s.kind === 'end-cycle')
    if (end && receipt.source === 'deadline' && end.facts.energyAfter !== deps.residence.configuration.config.rest.A) {
      invalid('Deadline recovery trace contradicts the controlled G1 target')
    }
  }
  if (value.phase === 'active-world' && value.character.clock.kind === 'active' && value.character.clock.startCycle !== expectedStart) {
    invalid('Active execution is not the next real departure boundary')
  }
  if (value.phase !== 'active-world') {
    const steps = value.receipts.at(-1)!.steps
    const body = value.character.body
    const bleeding = steps.find((s) => s.kind === 'action-bleeding' || s.kind === 'cycle-bleeding')
    if (bleeding && !body.condition.bleeding && (bleeding.kind === 'action-bleeding' || Number(bleeding.facts.damage) > 0)) {
      invalid('Latest bleeding checkpoint lacks its unchanged body qualification')
    }
    const primary = steps.find((s) => s.kind === 'primary')
    if (primary && Number(primary.facts.exposuresAdded) > body.condition.pendingInfectionExposures) {
      invalid('Latest primary exposure is absent from the resulting body')
    }
    const infection = steps.find((s) => s.kind === 'infection')
    if (infection && !steps.some((s) => s.kind === 'end-cycle') && infection.facts.suppression !== body.suppression) {
      invalid('Death before reset changed infection suppression')
    }
  }
  const sites = [...value.archives.map((a) => a.site), ...(value.site ? [value.site] : [])]
  const executionOrder = new Map(value.receipts.map((r, i) => [r.binding.execution.runId, i]))
  if (value.site) executionOrder.set(value.site.binding.execution.runId, value.receipts.length)
  const latest = value.site?.binding.execution.runId ?? value.receipts.at(-1)!.binding.execution.runId
  type Entity = { item: ItemInstance; owner: string; usable: boolean }
  const entities: Entity[] = [
    ...carriedItems(value.carried).map((item) => ({ item, owner: latest, usable: true })),
    ...value.warehouse.items.map((item) => ({ item, owner: latest, usable: true })),
    ...sites.flatMap((site) => site.ground.flatMap((g) => g.items.map((item) => ({ item, owner: site.binding.execution.runId, usable: false })))),
    ...value.dispositions.map((d) => ({ item: d.item, owner: d.binding.execution.runId, usable: false })),
  ]
  const byId = new Map(entities.map((e) => [e.item.instanceId, e]))
  const recognized = new Set<string>()
  for (const site of sites) {
    const catalog = policyFor(site.binding, deps).catalog
    for (const source of catalog.data.sources) {
      const node = catalog.data.nodes.find((n) => n.id === source.nodeId)!
      const choices = source.contents.kind === 'fixed' ? [source.contents.grants] : source.contents.choices
      const count = Math.max(...choices.map((g) => g.length))
      const outputs = Array.from({ length: count }, (_, n) => {
        const id = sourceItemId(site.binding, node.placeId, node.id, source.id, n)
        recognized.add(id)
        return byId.get(id)
      })
      if (!site.sources.find((s) => s.id === source.id)!.claimed) {
        if (outputs.some(Boolean)) invalid('Unclaimed source has output in an ownership domain')
        continue
      }
      if (!choices.some((grants) => outputs.every((entity, n) => grants[n]
        ? !!entity && entity.item.definitionId === grants[n].definitionId && entity.item.quantity === grants[n].quantity
        : !entity))) invalid('Claimed source outputs do not match one complete declared choice')
      for (const entity of outputs) {
        if (!entity) continue
        const origin = executionOrder.get(site.binding.execution.runId)!
        const owner = executionOrder.get(entity.owner)!
        if (owner < origin) invalid('Source output cannot predate its producing execution')
        const ordinary = catalog.data.items.find((i) => i.physical.id === entity.item.definitionId)!.ordinary
        const closed = value.receipts.some((r) => r.binding.execution.runId === site.binding.execution.runId)
        if (!ordinary && closed && (owner !== origin || entity.usable)) invalid('Closed task output leaked into usable or later ownership')
      }
    }
  }
  for (const { item } of entities) {
    if (isSourceEntityId(item.instanceId) && !recognized.has(item.instanceId)) invalid('Unknown source, execution or output ordinal')
  }
}
