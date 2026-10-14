// TEST ONLY: fixed public-state decisions, never hidden result lookahead.
import type { Harness } from './e03-test-harness'
import { publicFacts } from './e03-test-harness'
type Receipt = ReturnType<Harness['current']>['receipts'][number]
// Private control signal, issued only for an already committed native terminal.
// An arbitrary Error/code or merely observing a dead current never authenticates an error.
class CommittedRouteTerminal extends Error {
  constructor(readonly receipt: Receipt, readonly revision: number, readonly phase: 'dead' | 'living-hub') {
    super('Native route already committed ' + receipt.outcome)
  }
}
function isTerminalCurrent(h: Harness) {
  const v = h.current(), receipt = v.receipts.at(-1)
  return !!receipt && (v.phase === 'dead' && receipt.outcome === 'death' ||
    v.phase === 'living-hub' && receipt.outcome !== 'death')
}
function requireActiveRoute(h: Harness) {
  const v = h.current()
  if (v.phase === 'active-world') return
  if (!isTerminalCurrent(h)) throw new Error('Route is not active and has no committed terminal receipt')
  throw new CommittedRouteTerminal(v.receipts.at(-1)!, v.character.revision, v.phase as 'dead' | 'living-hub')
}
export function isCommittedRouteTerminal(error: unknown, h: Harness) {
  if (!(error instanceof CommittedRouteTerminal) || !isTerminalCurrent(h)) return false
  const v = h.current()
  return error.receipt === v.receipts.at(-1) && error.revision === v.character.revision && error.phase === v.phase
}
export function aliasId(h: Harness, alias: string) { return h.deps.supply.tasks.data.items.find(i => i.alias === alias)!.id }
export function bagItem(h: Harness, alias: string) { return publicFacts(h).bag.find(i => i.definitionId === aliasId(h, alias)) }
export function med(h: Harness, alias: string) {
  requireActiveRoute(h)
  const f = publicFacts(h), item = [...f.quick.filter(i => i !== null), ...f.bag].find(i => i.definitionId === aliasId(h, alias))
  if (!item) return false
  const untreated = f.wounds.filter(w => w.treatment === 'untreated')
  if (alias === 'bandage' && f.hp === h.deps.supply.residence.configuration.config.limits.hp && !f.bleeding && !untreated.length) return false
  if (alias === 'food' && f.satiety === h.deps.supply.residence.configuration.config.limits.satiety) return false
  h.send('medical', { instanceId: item.instanceId, ...(alias === 'bandage' && untreated.length ? { woundId: untreated[0].id } : {}) })
  return true
}
export function paid(h: Harness, family: string, fields: Record<string, unknown>) {
  requireActiveRoute(h)
  if (publicFacts(h).energy === 0) {
    med(h, 'bandage'); h.send('rest'); requireActiveRoute(h); med(h, 'food')
  }
  return h.send(family, fields)
}
export function move(h: Harness, to: string) {
  requireActiveRoute(h)
  const from = publicFacts(h).node, e = h.deps.supply.catalog.data.edges.find(e => e.from === from && e.to === to)
  if (!e) throw new Error('No declared adjacent route ' + from + ' -> ' + to)
  return paid(h, 'move', { edgeId: e.id })
}
export function walk(h: Harness, nodes: readonly string[]) { nodes.forEach(n => move(h, n)) }
export function task(h: Harness, actionId: string, extra = {}) { return paid(h, 'task', { actionId, ...extra }) }
export function source(h: Harness, sourceId: string, extra = {}) { return paid(h, 'source', { sourceId, ...extra }) }
export function pick(h: Harness, alias: string, x: number, y = 0) {
  requireActiveRoute(h)
  const i = publicFacts(h).ground.find(i => i.definitionId === aliasId(h, alias))
  if (!i) throw new Error('No revealed ground ' + alias)
  h.send('task-transfer', { kind: 'task-pickup', instanceId: i.instanceId, placement: { x, y, rotated: false } })
}
export function ordinaryPick(h: Harness, alias: string, x: number, y = 0) {
  requireActiveRoute(h)
  const i = publicFacts(h).ground.find(i => i.definitionId === aliasId(h, alias))
  if (!i) throw new Error('No revealed ground ' + alias)
  h.send('inventory', { kind: 'pickup', instanceId: i.instanceId, placement: { x, y, rotated: false } })
}
export function fight(h: Harness) {
  for (let n = 0; n < 16; n++) {
    const f = publicFacts(h), q = f.combat
    if (!q) return
    // Only official available actions and public bleeding select commands.
    const bandage = q.actions.find(c => c.kind === 'use-quick-slot-item' &&
      f.quick[c.quickSlotIndex]?.definitionId === aliasId(h, 'bandage'))
    const command = f.bleeding && bandage ? bandage : q.actions.find(c => c.kind === 'metal-pipe-charged-strike') ??
      q.actions.find(c => c.kind === 'metal-pipe-basic-attack') ?? q.actions.find(c => c.kind === 'temporary-attack')
    if (!command) throw new Error('No public attack strategy')
    h.send('combat', { command, ...(command.kind === 'use-quick-slot-item' ? { instanceId: f.quick[command.quickSlotIndex]!.instanceId } : {}) })
  }
  throw new Error('Bounded combat strategy exhausted')
}
