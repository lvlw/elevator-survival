import { createRandomCursor, createStreamId } from '../random'
import { parseResidence, countSchema } from '../residence-config/validation'
import { same } from '../residence-terminal/validation'
import { ensure } from '../residence-supply/validation'
import { tableValue } from '../residence-supply/config'
import type { SupplyValue, SupplyDependencies } from '../residence-supply/types'
export function drawSupplyInteger(value: SupplyValue, producerId: string, max: number, deps: SupplyDependencies) {
  ensure(value.site, 'Random needs real site')
  const b = value.site.binding
  const cursor = createRandomCursor(b.execution.seed, createStreamId('supply-content-v1', b.catalogId, b.catalogVersion,
    b.identity.characterId, b.mission.commissionId, b.execution.runId, deps.catalog.data.nodes.find(n => n.id === value.site!.nodeId)!.placeId,
    value.site.nodeId, producerId))
  const draw = deps.draw(cursor, 1, max)
  // Injectable entropy is a producer proposal, not trusted caller data.
  const number = parseResidence(countSchema, draw.value)
  ensure(number >= 1 && number <= max && same(draw.nextCursor, { ...cursor, drawIndex: cursor.drawIndex + 1 }), 'Invalid random producer proposal')
  return number
}
export function selectWeightedSupply(value: SupplyValue, producerId: string, key: string, choices: readonly string[], deps: SupplyDependencies) {
  const weights = tableValue(deps.configuration, key)
  ensure(Object.keys(weights).length === choices.length && choices.every(c => Number.isSafeInteger(weights[c]) && weights[c] > 0), 'Invalid weights')
  const total = choices.reduce((sum, c) => sum + weights[c], 0)
  ensure(Number.isSafeInteger(total), 'Weight overflow')
  const roll = drawSupplyInteger(value, producerId, total, deps)
  let boundary = 0
  for (const c of choices) { boundary += weights[c]; if (roll <= boundary) return c }
  throw new Error('Unreachable weighted boundary')
}
