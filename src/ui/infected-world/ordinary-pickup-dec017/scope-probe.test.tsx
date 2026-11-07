// TEST-only expected failures on the exact BASE. These calls exercise the formal producers.
import { expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../../content/infected-world-v0.1/initial'
import { fixture, searchAt, pickAlias } from '../../../core/residence-task/test-fixtures'
import { planSupplyInventory } from '../../../core/residence-supply/inventory'
import { playerHarness, begin, ready } from '../../../state/residence-session/player-test-fixtures'

it('DEC017 requires compatible ground metal to merge into an occupied backpack stack', () => {
  const f = fixture(createInfectedSupplyDependencies('dec017-red'))
  let value = pickAlias(f, searchAt(f, f.value, 'H1-search'), 'metal', 0)
  value = searchAt(f, value, 'C4-cabinet')
  const carried = value.carried.backpack.items[0]
  const ground = value.site!.ground.find(row => row.nodeId === value.site!.nodeId)!.items
    .find(item => item.definitionId === carried.definitionId)!
  expect(ground.quantity).toBe(1)
  expect(carried.quantity).toBe(1)
  const result = planSupplyInventory(value, {
    expectedRevision: value.character.revision, kind: 'pickup', instanceId: ground.instanceId,
    placement: { x: 0, y: 0, rotated: false },
  }, f.authorize(value)).snapshot
  expect(result.carried.backpack.items.find(item => item.instanceId === carried.instanceId)?.quantity).toBe(2)
})

it('ordinary pickup accepts an explicit legal quantity at the formal producer', () => {
  const f = fixture(createInfectedSupplyDependencies('dec017-quantity-red'))
  const value = searchAt(f, f.value, 'H1-search')
  const item = value.site!.ground.find(row => row.nodeId === value.site!.nodeId)!.items[0]
  expect(() => planSupplyInventory(value, {
    expectedRevision: value.character.revision, kind: 'pickup', instanceId: item.instanceId,
    quantity: 1, placement: { x: 0, y: 0, rotated: false },
  }, f.authorize(value))).not.toThrow()
})

it('public PlayerSession accepts pickup quantity without losing the selected real item', () => {
  const h = playerHarness()
  begin(h)
  let view = ready(h.player)
  const move = view.move.options.find(action => action.label.includes('大厅'))!
  expect(h.player.execute({ action: move.selector }).kind).toBe('committed')
  view = ready(h.player)
  const search = view.sources.find(source => source.label.includes('大厅搜索'))!.choices.find(action => action.method === 'dark')!
  expect(h.player.execute({ action: search.selector }).kind).toBe('committed')
  view = ready(h.player)
  const action = view.actions.find(action => action.family === 'inventory' && action.label === '拾取')!
  const item = view.ground.find(item => item.ordinary && item.stackable)!
  expect(h.player.preview({ action: action.selector, item: item.selector,
    quantity: 1, placement: { x: 0, y: 0, rotated: false } }).kind).toBe('available')
})
