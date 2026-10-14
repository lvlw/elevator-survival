// TEST ONLY. Fixed adjacent steps; no teleports, resource grants or cleared enemies.
import { expect } from 'vitest'
import { makeHarness, publicFacts, type Harness, type Tool, type Specialty } from './e03-test-harness'
import { aliasId, bagItem, med, move, walk, task, source, ordinaryPick, pick, fight } from './e03-test-policy'
import type { RouteId } from './e03-test-seeds'
export class RouteConditionMissing extends Error {}

function doorMethod(h: Harness) { return h.tool === 'crow' ? { method: 'crow', toolInstanceId: publicFacts(h).gear.utility!.instanceId } :
  h.tool === 'toolbox' ? { method: 'toolbox', toolInstanceId: publicFacts(h).gear.utility!.instanceId } :
    { method: 'card', toolInstanceId: bagItem(h, 'card')!.instanceId } }
function searchMethod(h: Harness) { return h.tool === 'lamp' ? { method: 'lit', toolInstanceId: publicFacts(h).gear.utility!.instanceId } : { method: 'dark' } }
function manualOrCrow(h: Harness) { return h.tool === 'crow' ? { method: 'crow', toolInstanceId: publicFacts(h).gear.utility!.instanceId } : { method: 'manual' } }
export function routePrefix(h: Harness, hotel: boolean) {
  h.begin(); move(h, 'H1'); source(h, 'H1-search', searchMethod(h)); ordinaryPick(h, 'metal', 4)
  if (hotel) {
    move(h, 'H2'); source(h, 'H2-search', searchMethod(h)); ordinaryPick(h, 'bandage', 5, 1)
    if (publicFacts(h).ground.some(i => i.definitionId === aliasId(h, 'disinfect'))) ordinaryPick(h, 'disinfect', 3, 1)
    move(h, 'H1')
  }
  move(h, 'H3'); source(h, 'H3-search', searchMethod(h)); pick(h, 'card', 4, 2); move(h, 'H1')
  const beforeDoor = new Set(publicFacts(h).ground.map(i => i.instanceId))
  task(h, 'fire-door', doorMethod(h))
  if (h.tool === 'toolbox') {
    // Explicitly select the newly revealed professional output, not an earlier same-name random item.
    const newlyRevealed = publicFacts(h).ground.find(i => !beforeDoor.has(i.instanceId) && i.definitionId === aliasId(h,'electronic'))!
    h.send('inventory',{kind:'pickup',instanceId:newlyRevealed.instanceId,placement:{x:5,y:0,rotated:false}})
  }
  if (hotel) {
    walk(h, ['H0', 'T0', 'T1'])
    const disinfect = bagItem(h, 'disinfect'), bandage = bagItem(h, 'bandage')
    if (!disinfect || !bandage) throw new RouteConditionMissing('HOTEL_CONDITION_MISSING: actual H2 did not reveal disinfectant')
    source(h, 'T1-exchange', { inputs: [bandage, disinfect].map(i => ({ instanceId: i.instanceId, quantity: 1 })),
      placements: [{ x: 3, y: 1, rotated: false }] })
    h.send('rest'); med(h, 'food'); walk(h, ['T0', 'H0', 'H1'])
  }
  walk(h, ['H7', 'L0', 'L1'])
  task(h, 'l1-open', manualOrCrow(h)); source(h, 'L1-cabinet'); ordinaryPick(h, 'food', 4, 1)
  // The hotel bandage was actually exchanged; initial quick bandage is never duplicated.
  ordinaryPick(h, 'bandage', 5, 1)
  h.send('rest'); med(h, 'food')
}
export function finishRoute(h: Harness, route: RouteId) {
  move(h, 'L2'); fight(h); if (h.current().phase !== 'active-world') return
  med(h, 'bandage'); med(h, 'bandage')
  source(h, 'L2-search')
  const food = publicFacts(h).ground.filter(i => i.definitionId === aliasId(h, 'food'))
  food.forEach((_, n) => ordinaryPick(h, 'food', n === 0 ? 5 : 3, route === 'route-hotel-benefit' && n > 0 ? 2 : 1))
  // Keep the original H1 metal for installation unless the toolbox route spends it.
  if (route === 'route-toolbox') {
    const target = publicFacts(h).gear.utility!
    h.send('maintenance', { kind: 'toolbox', instanceId: target.instanceId,
      inputs: ['metal', 'electronic'].map(a => ({ instanceId: bagItem(h, a)!.instanceId, quantity: 1 })) })
    ordinaryPick(h, 'metal', 4)
  }
  task(h, 'verify', { method: 'full' }); task(h, 'fix', { method: 'manual' })
  task(h, 'component', { placement: { x: 0, y: 0, rotated: false } })
  walk(h, ['L1', 'L0', 'C0', 'C1']); task(h, 'match', { method: 'fast' }); move(h, 'C4')
  source(h, 'C4-cabinet', manualOrCrow(h))
  if (!bagItem(h, 'electronic')) ordinaryPick(h, 'electronic', 5)
  task(h, 'bypass-survey'); task(h, 'bypass', manualOrCrow(h))
  h.send('rest'); med(h, 'food'); move(h, 'C3'); task(h, 'module', { placement: { x: 2, y: 0, rotated: false } })
  walk(h, ['C4', 'C1', 'C0', 'H0', 'H1', 'H4'])
  if (route === 'route-segmented') {
    h.send('combat', { command: { kind: 'metal-pipe-charged-strike' } })
    h.send('combat', { command: { kind: 'escape' } })
    if (h.current().phase !== 'active-world') return
    med(h, 'bandage')
    const metal = bagItem(h, 'metal')!
    h.send('maintenance', { kind: 'mechanical', inputs: [{ instanceId: metal.instanceId, quantity: 1 }],
      allocations: [{ instanceId: publicFacts(h).gear.weapon!.instanceId, amount: 15 }] })
    h.send('rest'); med(h, 'food'); move(h, 'H4')
  }
  fight(h); if (h.current().phase !== 'active-world') return
  med(h, 'bandage'); move(h, 'H5'); task(h, 'sample', { method: 'cautious', placement: { x: 0, y: 2, rotated: false } })
  walk(h, ['H4', 'H1', 'H7', 'L0', 'P0', 'P1'])
  h.send('rest'); med(h, 'food'); task(h, 'power-survey'); task(h, 'power')
  if (h.current().phase !== 'active-world') return
  // Segmented maintenance used installation metal: explicitly obtain the C4 source remainder.
  if (!bagItem(h, 'metal')) {
    walk(h, ['P0', 'L0', 'C0', 'C1', 'C4']); ordinaryPick(h, 'metal', 4); walk(h, ['C1', 'C0', 'H0', 'H1', 'H7'])
  } else walk(h, ['P0', 'L0', 'H7'])
  move(h, 'H8')
  task(h, 'install', { inputs: ['component', 'module', 'metal', 'electronic'].map(a => {
    const i = bagItem(h, a); if (!i) throw new RouteConditionMissing('Missing actual installation ' + a)
    return { instanceId: i.instanceId, quantity: 1 }
  }) })
  walk(h, ['H7', 'H1', 'H0']); h.send('terminal', { kind: 'deliver' })
}
export function executeRoute(seed: string, tool: Tool, specialty: Specialty, route: RouteId = 'route-hotel-bypass') {
  const h = makeHarness(seed, tool, specialty)
  let failure: string | null = null
  try { routePrefix(h, route === 'route-hotel-benefit'); finishRoute(h, route) }
  catch (e) {
    // Genuine programming errors must fail the suite, not become a route outcome.
    if (e instanceof TypeError || e instanceof RangeError || !(e instanceof Error)) throw e
    if (h.current().phase === 'dead') failure = null
    else if (e instanceof RouteConditionMissing || 'code' in e) failure = e.message
    else throw e
  }
  const v = h.current(), outcome = v.receipts.at(-1)?.outcome ?? 'route-stopped'
  if (outcome === 'death') failure = null // The committed death, not an attempted next action, is the actual result.
  if (outcome === 'success') {
    expect(v.phase).toBe('living-hub'); expect(v.balance).toBe(120)
    expect(v.dispositions.some(d => d.kind === 'delivered' && d.item.definitionId === aliasId(h, 'sample'))).toBe(true)
    expect(v.archives.at(-1)!.site.enemies.find(e => e.id === 'technician')!.state.defeated).toBe(false)
  }
  return { h, result: { seed, tool, specialty, route, outcome, failure, steps: h.ledger.length,
    dispatches: h.ledger.filter(l => l.family !== 'createFirst').length,
    writes: h.storage.write.mock.calls.length, notifications: h.notify.mock.calls.length,
    final: h.ledger.at(-1)!.after } }
}
