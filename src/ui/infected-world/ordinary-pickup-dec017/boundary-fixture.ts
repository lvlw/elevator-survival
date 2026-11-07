// TEST ONLY. Real declared producers and lineage, with explicit test positioning/danger clearance.
import { createInfectedSupplyDependencies } from '../../../content/infected-world-v0.1/initial'
import { fixture, resolvedDanger, atNode, searchAt, forcedDraw } from '../../../core/residence-task/test-fixtures'
import { planSupplyTaskAction } from '../../../core/residence-task/actions'
import { planSupplyTaskTransfer } from '../../../core/residence-task/transfer'
import { planSupplyRest } from '../../../core/residence-supply/controlled'
import { planSupplyInventory } from '../../../core/residence-supply/inventory'
import { readSupplyValue } from '../../../core/residence-supply/validation'
import { getOccupiedCells } from '../../../core/inventory'
import type { SupplyDependencies } from '../../../core/residence-supply/types'

export function fullBagFixture(dependencies: SupplyDependencies = createInfectedSupplyDependencies('dec017-boundary')) {
  const f = forcedDraw(fixture(dependencies, { tool: 'toolbox', seed: 'combat-seed' }), 66)
  let value = resolvedDanger(f)
  const here = (node: string) => { value = atNode(f, value, node) }
  const rest = () => { if (value.character.body.energy < 20) {
    here('H0')
    value = planSupplyRest(value, { kind: 'rest', expectedRevision: value.character.revision }, f.authorize(value)).snapshot
  } }
  const task = (node: string, actionId: string, fields = {}) => {
    rest(); here(node)
    value = planSupplyTaskAction(value, { kind: 'task', expectedRevision: value.character.revision, actionId, ...fields }, f.authorize(value)).snapshot
  }
  const inventory = (request: object) => {
    value = planSupplyInventory(value, { expectedRevision: value.character.revision, ...request }, f.authorize(value)).snapshot
  }
  const placement = (x: number, y: number) => ({ x, y, rotated: false })
  task('L2', 'verify', { method: 'full' })
  task('L2', 'fix', { method: 'manual' })
  task('L2', 'component', { placement: placement(0, 0) })
  task('C1', 'match', { method: 'fast' })
  task('C3', 'module', { placement: placement(4, 0) })
  task('H5', 'sample', { method: 'cautious', placement: placement(2, 0) })
  task('H1', 'fire-door', { method: 'toolbox', toolInstanceId: value.carried.equipment.utility!.instanceId })
  task('L1', 'l1-open', { method: 'manual' })
  task('L3', 'l3-open', { method: 'manual' })
  for (const source of ['H1-search', 'H2-search', 'H3-search', 'L1-cabinet', 'L2-search', 'L3-rack', 'C4-cabinet', 'C4-food']) {
    rest()
    value = searchAt(f, value, source)
  }
  here('H3')
  const card = value.site!.ground.find(row => row.nodeId === 'H3')!.items.find(item => item.definitionId === 'access_card_isolation_ward')!
  value = planSupplyTaskTransfer(value, { kind: 'task-pickup', expectedRevision: value.character.revision,
    instanceId: card.instanceId, placement: placement(5, 0) }, f.authorize(value)).snapshot
  // These boundary fixtures relocate already-issued ground units to a known room.
  // No origin, quantity, state, declaration or source production is fabricated.
  here('H7')
  const ground = value.site!.ground.flatMap(row => row.items)
  value = readSupplyValue({ ...value, site: { ...value.site!, ground: value.site!.ground.map(row =>
    ({ ...row, items: row.nodeId === 'H7' ? ground : [] })) } }, f.dependencies)
  const food = ground.find(item => item.definitionId === 'consumable_ration' && item.quantity === 2)!
  const otherFood = ground.find(item => item.definitionId === food.definitionId && item.instanceId !== food.instanceId)!
  inventory({ kind: 'pickup', instanceId: otherFood.instanceId, quantity: 1, placement: freeCell()! })
  function freeCell() {
    const cells = getOccupiedCells(value.carried.backpack, f.dependencies.catalog.physical)
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
      if (!cells.some(cell => cell.x === x && cell.y === y)) return placement(x, y)
    }
    return null
  }
  while (freeCell()) {
    const item = value.site!.ground.find(row => row.nodeId === 'H7')!.items.find(item =>
      item.definitionId !== food.definitionId && f.dependencies.catalog.data.items.some(d => d.ordinary &&
        d.physical.id === item.definitionId && d.physical.stacking.kind === 'stackable'))
    if (!item) throw Error('Insufficient real produced units to fill this boundary')
    const existing = value.carried.backpack.items.find(candidate => candidate.definitionId === item.definitionId)
    inventory({ kind: 'pickup', instanceId: item.instanceId, quantity: 1, placement: freeCell()! })
    if (existing) inventory({ kind: 'split', instanceId: existing.instanceId, quantity: 1, placement: freeCell()! })
  }
  return { f, value, food, inventory }
}
