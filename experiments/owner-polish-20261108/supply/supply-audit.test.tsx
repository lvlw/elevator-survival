// Isolated audit. No default app or test runner imports this experiment.
import { expect, test } from 'vitest'
import { makeHarness, publicFacts, type Harness, type Ledger } from '../../../src/content/infected-world-v0.1/acceptance/e03-test-harness'
import { routePrefix, finishRoute } from '../../../src/content/infected-world-v0.1/acceptance/e03-test-routes'
import { aliasId, isCommittedRouteTerminal, move, ordinaryPick, source, task } from '../../../src/content/infected-world-v0.1/acceptance/e03-test-policy'
import { emitReport } from '../../../src/content/infected-world-v0.1/acceptance/e03-test-report'
import { createRandomCursor, createStreamId, drawIntInclusive } from '../../../src/core/random'
import { mountUi } from '../../../src/ui/infected-world/test-fixtures'
import { createInfectedSupplyDependencies } from '../../../src/content/infected-world-v0.1/initial'
import { infectedWorldSupplyValues } from '../../../src/content/infected-world-v0.1/config'
import { infectedWorldSupplyContent } from '../../../src/content/infected-world-v0.1/content'
import { createTaskCatalog } from '../../../src/core/residence-task/catalog'
import { createSupplyConfig } from '../../../src/core/residence-supply/config'
import { createLocationCatalog } from '../../../src/core/residence-location/controlled'
import { fixture, forcedDraw, realMove } from '../../../src/core/residence-task/test-fixtures'
import { planSupplySourceReveal } from '../../../src/core/residence-task/sources'
import candidate from './candidate.json'

const resources = ['bandage', 'firstaid', 'disinfect', 'painkiller', 'metal', 'electronic', 'cloth', 'battery', 'food'] as const

function counts(h: Harness, l: Ledger) {
  return Object.fromEntries(resources.map(a => [a, [...l.backpack.items, ...l.quick.slots].reduce(
    (sum, item) => sum + (item?.definitionId === aliasId(h, a) ? item.quantity : 0), 0)]))
}

function capped(h: Harness) {
  const original = h.send
  h.send = (...args) => {
    if (h.ledger.length - 1 >= 120) throw new Error('TEST route exceeded 120 committed actions')
    return original(...args)
  }
  return h
}

async function report(h: Harness, id: string) {
  const steps = h.ledger.map((e, i) => ({
    n: i, action: e.family, command: e.command, node: e.after.node, day: e.after.taskDay,
    energy: e.after.body.energy, hp: e.after.body.condition.currentHealth, satiety: e.after.body.satiety,
    bleeding: e.after.body.condition.bleeding, bagWeight: e.after.weight,
    carried: counts(h, e.after), saved: e.saved,
  }))
  const end = h.current()
  await emitReport('polish-supply-' + id, {
    tool: h.tool, specialty: h.specialty, seed: h.seed, steps,
    commands: steps.length - 1, writes: h.storage.write.mock.calls.length, outcome: end.receipts.at(-1)?.outcome,
    produced: end.origins.filter(o => resources.some(a => aliasId(h, a) === o.definitionId)),
    consumed: end.dispositions.filter(d => d.kind === 'consumed'),
  })
}

const cases = [
  { route: 'route-hotel-bypass', seed: 'E03-A-seed-01', tool: 'crow', specialty: 'engineer' },
  { route: 'route-hotel-benefit', seed: 'E03-A-seed-04', tool: 'lamp', specialty: 'survival' },
  { route: 'route-toolbox', seed: 'E03-A-seed-01', tool: 'toolbox', specialty: 'engineer' },
] as const
test.each(cases)('bounded formal route $route', async ({ route, seed, tool, specialty }) => {
  const h = capped(makeHarness(seed, tool, specialty))
  try {
    routePrefix(h, route === 'route-hotel-benefit')
    if (h.current().phase === 'active-world') finishRoute(h, route)
  } catch (error) {
    if (!isCommittedRouteTerminal(error, h)) throw error
  }
  expect(h.current().receipts.at(-1)?.outcome).toBe('success')
  await report(h, route)
}, 120000)

test('bounded scout stop-loss spends the installation metal on maintenance', async () => {
  const h = capped(makeHarness('E03-A-seed-01', 'crow', 'scout'))
  h.begin()
  move(h, 'H1')
  source(h, 'H1-search', { method: 'dark' })
  ordinaryPick(h, 'metal', 0)
  task(h, 'fire-door', { method: 'crow', toolInstanceId: publicFacts(h).gear.utility!.instanceId })
  move(h, 'H4')
  h.send('combat', { command: { kind: 'metal-pipe-charged-strike' } })
  h.send('combat', { command: { kind: 'escape' } })
  const metal = publicFacts(h).bag.find(i => i.definitionId === aliasId(h, 'metal'))!
  h.send('maintenance', { kind: 'mechanical', inputs: [{ instanceId: metal.instanceId, quantity: 1 }],
    allocations: [{ instanceId: publicFacts(h).gear.weapon!.instanceId, amount: 15 }] })
  move(h, 'H0')
  h.send('terminal', { kind: 'withdraw' })
  expect(h.current().receipts.at(-1)?.outcome).toBe('voluntary-failure')
  expect(h.current().dispositions.some(d => d.item.instanceId === metal.instanceId && d.kind === 'consumed')).toBe(true)
  await report(h, 'route-scout-stop-loss')
}, 120000)

function pharmacySeed(kind: 'firstaid' | 'disinfect') {
  // Select TEST seed before starting a route. All actions thereafter use player-visible facts.
  const deps = createInfectedSupplyDependencies('E03-A-character'), node = deps.catalog.data.nodes.find(n => n.id === 'H2')!
  const stream = createStreamId('supply-content-v1', deps.catalog.data.id, deps.catalog.data.version,
    'E03-A-character', deps.catalog.data.mission.commissionId, 'E03-A-execution', node.placeId, node.id, 'H2-random')
  for (let i = 1; i <= 128; i++) {
    const seed = 'owner-polish-pharmacy-test-' + i
    const roll = drawIntInclusive(createRandomCursor(seed, stream), 1, 100).value
    if (kind === 'firstaid' ? roll >= 66 && roll <= 85 : roll <= 35) return { seed, roll }
  }
  throw new Error('No controlled TEST seed found')
}

test.each(['firstaid', 'disinfect'] as const)('controlled TEST seed pharmacy React chain: %s', async kind => {
  const { seed, roll } = pharmacySeed(kind)
  const h = await mountUi(seed)
  try {
    const d = h.d
    await d.setup()
    await d.send('进入封锁区')
    await d.move('大厅')
    await d.move('药房')
    await d.task('药房搜索', 'dark')
    const ground = h.view().ground.map(i => ({ name: i.name, quantity: i.quantity }))
    expect(ground.map(i => i.name).sort()).toEqual((kind === 'firstaid' ? ['急救包', '绷带'] : ['消毒剂', '绷带']).sort())
    expect(h.host.textContent).toContain(kind === 'firstaid' ? '急救包' : '消毒剂')
    if (kind === 'disinfect') {
      expect(h.host.textContent).not.toContain('拾取 急救包')
      await emitReport('polish-supply-medkit-miss', { seed, roll, ground, writes: h.setItem.mock.calls.length })
      return
    }
    await d.button('拾取 急救包')
    expect(h.view().ground.some(i => i.name === '急救包')).toBe(false)
    expect(h.view().carried.find(i => i.name === '急救包')).toMatchObject({ quantity: 1, container: 'backpack' })
    expect(h.host.querySelector('img[src*="item-firstaid-v1.png"]')).not.toBeNull()
    await d.move('大厅')
    await d.task('隔离防火门', 'crow')
    await d.move('隔离走廊')
    await d.send('金属管攻击')
    await d.send('蓄力打击')
    await d.send('退却')
    const before = h.view()
    expect(before.body.hp.current).toBeLessThan(before.body.hp.maximum)
    expect(before.phase).toBe('active-world')
    const wound = before.body.wounds[0]
    const medical = {
      item: '急救包',
      ...(wound ? { target: '指定开放伤口', wound: wound.ordinal } : {}),
    }
    const writes = h.setItem.mock.calls.length
    await d.send('使用药食', medical)
    const after = h.view()
    expect(after.body.hp.current).toBe(Math.min(before.body.hp.current + 4, before.body.hp.maximum))
    expect(after.body.energy.current).toBe(before.body.energy.current)
    expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
    expect(after.carried.some(i => i.name === '急救包')).toBe(false)
    if (wound) expect(after.body.wounds).toHaveLength(before.body.wounds.length - 1)
    await emitReport('polish-supply-medkit-hit', { seed, roll, ground,
      before: { hp: before.body.hp, energy: before.body.energy, wounds: before.body.wounds, bleeding: before.body.bleeding },
      after: { hp: after.body.hp, energy: after.body.energy, wounds: after.body.wounds, bleeding: after.body.bleeding },
      writes: h.setItem.mock.calls.length - writes })
  } finally { await h.unmount() }
}, 120000)

test.each([1, 66] as const)('isolated candidate pharmacy fixed delta, same forced roll %i', async roll => {
  const formal = createInfectedSupplyDependencies('TEST-polish-candidate')
  const config = createSupplyConfig({ configurationId: candidate.configurationId, values: {
    ...infectedWorldSupplyValues, 'grant.H2-search': candidate.overrides['grant.H2-search'],
  } })
  const tasks = createTaskCatalog({ ...infectedWorldSupplyContent, contentId: candidate.contentId, configurationId: config.configurationId }, config)
  const catalog = createLocationCatalog({ ...formal.catalog.data, version: tasks.contentId })
  const variants = [formal, { ...formal, configuration: config, tasks, catalog, catalogs: [catalog] }]
  const results = variants.map((deps, i) => {
    const f = forcedDraw(fixture(deps), roll)
    let v = realMove(f, f.value, 'H0-H1:forward')
    v = realMove(f, v, 'H1-H2:forward')
    const p = planSupplySourceReveal(v, { kind: 'reveal', expectedRevision: v.character.revision, sourceId: 'H2-search', method: 'dark' }, f.authorize(v))
    const ground = p.snapshot.site!.ground.find(g => g.nodeId === 'H2')!.items
    const units = (alias: string) => ground.filter(item => item.definitionId === deps.tasks.data.items.find(x => x.alias === alias)!.id).reduce((sum, item) => sum + item.quantity, 0)
    expect(units('bandage')).toBe(i + 1)
    expect(units(roll === 66 ? 'firstaid' : 'disinfect')).toBe(1)
    expect(p.snapshot.productions.filter(x => x.producerId === 'H2-random')).toHaveLength(1)
    return { configuration: deps.configuration.configurationId, roll, energyBefore: v.character.body.energy,
      energyAfter: p.snapshot.character.body.energy, units: Object.fromEntries(resources.map(a => [a, units(a)])) }
  })
  expect(results[0].energyAfter).toBe(results[1].energyAfter)
  await emitReport('polish-supply-candidate-' + roll, results)
})
