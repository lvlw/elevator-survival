import { deepFreeze } from '../../core/config'
import { queryPlayerCommandDeath } from '../../core/residence-combat/player-safety'
import { queryPlayerActionMetadata } from '../../core/residence-supply/player-metadata'
import { playerCombatFacts } from '../../core/residence-combat/player-query'
import type { CombatDependencies } from '../../core/residence-combat/types'
import { resolvePlayerCommand } from './player-commands'
import { qualifyPlayerCommand } from './player-preview'
import { readPlayerRequest } from './player-validation'
import { describePlayerAction } from './player-inputs'
import { isPlayerBusinessError, PlayerSelectionError } from './player-errors'
import type { PlayerContext } from './player-context'
import type { PlayerRequest } from './player-types'
import type { PlayerIntentMetadata, PlayerPreplay } from './player-preplay-types'

/** Copy only plain parameter data; retain opaque references without freezing caller objects. */
export function copyPlayerRequest(input: unknown): PlayerRequest {
  const r = readPlayerRequest(input)
  return Object.freeze({ ...r,
    ...(r.placement ? { placement: Object.freeze({ ...r.placement }) } : {}),
    ...(r.placements ? { placements: Object.freeze(r.placements.map(p => Object.freeze({ ...p }))) } : {}),
    ...(r.materials ? { materials: Object.freeze(r.materials.map(m => Object.freeze({ ...m }))) } : {}),
    ...(r.allocations ? { allocations: Object.freeze(r.allocations.map(a => Object.freeze({ ...a }))) } : {}),
  })
}

export function createPlayerPreplay(currentContext: () => PlayerContext | null, deps: CombatDependencies): PlayerPreplay {
  const requireContext = () => { const c = currentContext(); if (!c) throw new PlayerSelectionError(); return c }
  const capture: PlayerPreplay['capture'] = input => {
    const context = requireContext(), request = copyPlayerRequest(input)
    context.resolve(request.action, 'action')
    for (const h of [request.item, request.targetItem, ...(request.materials?.map(m => m.item) ?? []), ...(request.allocations?.map(m => m.item) ?? [])]) {
      if (h) context.resolve(h, 'item')
    }
    if (request.wound) context.resolve(request.wound, 'wound')
    return Object.freeze({ scope: context.scope, request })
  }
  const inspect: PlayerPreplay['inspect'] = input => {
    try {
      const ctx = requireContext(), request = capture(input).request
      const command = resolvePlayerCommand(ctx, request, deps)
      const qualification = qualifyPlayerCommand(ctx.value, command, deps)
      const death = queryPlayerCommandDeath(ctx.value, command, qualification, deps)
      const facts = queryPlayerActionMetadata(ctx.value, command, deps)
      let hasProvenAlternative = false
      if (death.kind === 'guaranteed') {
        // Only concrete complete requests certified by the same pure qualification.
        // This is a proof search, not a player command, default target, or execution.
        const medical = ctx.action({ family: 'medical', key: 'medical' })
        const candidates: PlayerRequest[] = []
        for (const a of playerCombatFacts(ctx.value, deps)?.actions ?? []) {
          const c = a.command
          candidates.push({ action: ctx.action({ family: 'combat', key: c.kind,
            ...(c.kind === 'use-quick-slot-item' ? { slot: c.quickSlotIndex, ...(c.targetOpenWoundId ? { woundId: c.targetOpenWoundId } : {}) } : {}) }) })
        }
        for (const item of [...ctx.value.carried.backpack.items, ...ctx.value.carried.quickSlots.slots.flatMap(i => i ? [i] : [])]) {
          const selector = ctx.item(item.instanceId)
          candidates.push({ action: medical, item: selector }, { action: medical, item: selector, target: 'contusion' })
          for (const wound of ctx.value.character.body.condition.openWounds) {
            candidates.push({ action: medical, item: selector, wound: ctx.wound(wound.id) },
              { action: medical, item: selector, wound: ctx.wound(wound.id), target: 'wound' })
          }
          if (ctx.value.carried.backpack.items.includes(item)) {
            candidates.push({ action: ctx.action({ family: 'inventory', key: 'drop' }), item: selector },
              { action: ctx.action({ family: 'task-transfer', key: 'task-drop' }), item: selector })
            const anchor = ctx.value.carried.backpack.placements.find(p => p.instanceId === item.instanceId)!
            candidates.push({ action: ctx.action({ family: 'inventory', key: 'move' }), item: selector,
              placement: { x: anchor.x, y: anchor.y, rotated: anchor.rotated } })
          }
        }
        const local = ctx.value.site?.ground.find(g => g.nodeId === ctx.value.site!.nodeId)?.items ?? []
        const freeTransfers = [
          ...ctx.value.carried.quickSlots.slots.flatMap(i => i ? [{ item: i, key: 'to-backpack', family: 'inventory' }] : []),
          ...local.flatMap(item => [{ item, key: 'pickup', family: 'inventory' }, { item, key: 'task-pickup', family: 'task-transfer' }]),
        ]
        // Finite proof candidates only. Geometry/weight/identity legality is still
        // decided by the formal qualifier. No selected placement leaves this query.
        for (const transfer of freeTransfers) {
          const definition = deps.supply.catalog.physical.get(transfer.item.definitionId)
          for (let y = 0; y < ctx.value.carried.backpack.height; y++) for (let x = 0; x < ctx.value.carried.backpack.width; x++) {
            for (const rotated of definition.canRotate ? [false, true] : [false]) candidates.push({
              action: ctx.action({ family: transfer.family, key: transfer.key }), item: ctx.item(transfer.item.instanceId), placement: { x, y, rotated },
            })
          }
        }
        for (const key of ['deliver', 'withdraw'] as const) candidates.push({ action: ctx.action({ family: 'terminal', key }) })
        hasProvenAlternative = candidates.some(candidate => {
          try {
            const c = resolvePlayerCommand(ctx, candidate, deps), q = qualifyPlayerCommand(ctx.value, c, deps)
            return q.kind === 'available' && queryPlayerCommandDeath(ctx.value, c, q, deps).kind === 'not-guaranteed'
          } catch (error) { if (!isPlayerBusinessError(error)) throw error; return false }
        })
      }
      const critical = command.kind === 'task-transfer' && command.command.kind === 'task-drop'
      const closes = command.kind === 'terminal'
      const confirmation: PlayerIntentMetadata['confirmation'] = closes || critical ? { kind: 'static', reason: closes ? 'commission-closure' : 'critical-item' } :
        death.kind === 'guaranteed' && hasProvenAlternative ? { kind: 'dynamic', reason: 'certain-death-with-alternative' } : { kind: 'none', reason: null }
      return deepFreeze({ qualification, death, facts, confirmation, hasProvenAlternative })
    } catch (error) {
      if (!isPlayerBusinessError(error)) throw error
      return deepFreeze({ qualification: { kind: error instanceof PlayerSelectionError ? 'invalid-selection' : 'unavailable', cost: null },
        death: { kind: 'unknown', basis: 'invalid-request' }, facts: null,
        confirmation: { kind: 'none', reason: null }, hasProvenAlternative: false })
    }
  }
  return Object.freeze({ scope: () => currentContext()?.scope ?? null,
    describeAction: action => describePlayerAction(requireContext(), action, deps), capture, inspect })
}
