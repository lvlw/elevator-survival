import { same } from '../residence-terminal/validation'
import { settleTerminalBalance } from '../residence-terminal/settlement-shared'
import { originalInstanceId } from './provenance'
import { tableValue, numberValue } from './config'
import { SupplyError, type SupplyDependencies } from './types'
import type { SupplyDomain } from './shared-types'
const assert = (ok: unknown, text: string): void => { if (!ok) throw new SupplyError('INVALID_PROVENANCE', text) }
/** Finite evidence consistency, not proof against an entirely rewritten offline history. */
export function verifySupplyHistory(v: SupplyDomain, deps: SupplyDependencies) {
  const sites = [...v.archives.map(a => a.site), ...(v.site ? [v.site] : [])]
  const bindings = new Set(sites.map(s => s.binding.execution.runId))
  const keys = v.productions.map(p => p.binding.execution.runId + ':' + p.producerId)
  assert(new Set(keys).size === keys.length, 'Duplicate execution producer')
  for (const p of v.productions) {
    const site = sites.find(s => same(s.binding, p.binding))
    assert(site && p.revision <= v.character.revision && p.revision > 0, 'Missing production site or invalid revision')
    const source = deps.tasks.data.sources.find(s => s.id === p.producerId)
    const action = deps.tasks.data.actions.find(a => a.id === p.producerId)
    assert(source || action, 'Unknown producer')
    const node = (source ?? action)!.node
    assert(site!.knowledge.visitedNodeIds.includes(node), 'Production location was never visited')
    const own = v.origins.filter(o => o.kind !== 'initial' && o.producerId === p.producerId && same(o.binding, p.binding))
    assert(same([...p.originIds].sort(), own.map(o => o.id).sort()) && new Set(p.originIds).size === p.originIds.length, 'Production outputs do not match origins')
    if (source) {
      assert(p.factId === null && p.drawIndex === (source.choices ? 1 : 0), 'Source metadata mismatch')
      assert(own.length === (source.choices ? 1 : Object.keys(tableValue(deps.configuration, source.grants!)).length), 'Incomplete source output')
      if (source.choices) {
        const parentId = source.mode.startsWith('paired-') ? source.node + '-search' : null
        assert(parentId && v.productions.some(q => q.producerId === parentId && same(q.binding, p.binding) && q.method === p.method), 'Unpaired random source')
      }
      if (source.mode === 'only-with-first-toolbox-door') assert(v.productions.some(q => q.producerId === 'fire-door' &&
        q.method === 'toolbox' && same(q.binding, p.binding)), 'Toolbox award without first toolbox door')
    } else {
      assert(p.factId === action!.fact && own.length === (action!.grant ? 1 : 0), 'Action output/fact mismatch')
      assert(p.drawIndex === (p.producerId === 'sample' ? own[0]?.drawIndex : 0), 'Action random cursor mismatch')
      if (action!.fact) assert(site!.facts.some(f => f.id === action!.fact && f.value), 'Produced fact absent')
    }
    assert(p.revision < (v.receipts.find(r => same(r.binding, p.binding))?.revision ?? Number.MAX_SAFE_INTEGER), 'Production occurred after closure')
  }
  for (const o of v.origins.filter(o => o.kind !== 'initial')) assert(bindings.has(o.binding.execution.runId) &&
    v.productions.some(p => same(p.binding, o.binding) && p.producerId === o.producerId && p.originIds.includes(o.id)), 'Unclaimed origin')
  for (const site of sites) {
    for (const f of site.facts) if (f.value) {
      if (f.id.startsWith('enemy-') && f.id.endsWith('-cleared')) {
        const id = f.id.slice(6, -8)
        assert(site.enemies.some(e => e.id === id && e.state.defeated), 'False danger clearance')
      } else assert(v.productions.some(p => same(p.binding, site.binding) && p.factId === f.id), 'Client-authored completion')
    }
    for (const id of ['H1', 'H2']) {
      const search = v.productions.find(p => same(p.binding, site.binding) && p.producerId === id + '-search')
      const random = v.productions.find(p => same(p.binding, site.binding) && p.producerId === id + '-random')
      assert(!!search === !!random, 'Search/random source pair is incomplete')
    }
  }
  const initial = v.origins.filter(o => o.kind === 'initial')
  const defs: Record<string, string> = { pipe: 'weapon_metal_pipe', coat: 'armor_heavy_coat', crow: 'utility_crowbar',
    lamp: 'utility_flashlight', toolbox: 'utility_toolkit', bandage: deps.tasks.data.items.find(i => i.alias === 'bandage')!.id }
  for (const alias of ['pipe', 'coat', v.choices.tool, 'bandage']) {
    const origin = initial.find(o => o.producerId === 'initial:' + alias)
    assert(origin && origin.definitionId === defs[alias], 'Initial role/definition differs')
  }
  const usedBandage = v.dispositions.some(d => d.reason === 'medical' && d.kind === 'consumed' && d.item.definitionId === defs.bandage)
  assert(v.choices.firstBandageUsed === usedBandage, 'First bandage fact reset or fabricated')
  const closed = v.missions.filter(m => m.status === 'closed')
  assert(closed.length === v.receipts.length && v.archives.length === v.receipts.length, 'Closed mission/receipt/archive count')
  let balance = deps.terminal.config.initial_balance, revision = -1
  const dispositionOwners = new Set<string>(), executions = new Set<string>()
  for (const [n, r] of v.receipts.entries()) {
    assert(!executions.has(r.binding.execution.runId) && r.revision > revision && r.revision <= v.character.revision, 'Receipt replay/order')
    executions.add(r.binding.execution.runId); revision = r.revision
    const m = closed.find(m => same(m.execution, r.binding.execution) && same(m.binding.mission, r.binding.mission))
    assert(m && m.outcome === r.outcome && same(v.archives[n].site.binding, r.binding), 'Closure binding/outcome mismatch')
    const money = settleTerminalBalance(balance, r.outcome, deps.terminal.config)
    assert(r.before === balance && r.reward === money.reward && r.penalty === money.penalty && r.forfeited === money.forfeited, 'Wallet receipt mismatch')
    balance = money.balance
    assert(r.taskDay >= 1 && r.taskDay <= deps.residence.configuration.config.limits.days &&
      r.endCycle === r.startCycle + r.taskDay - 1, 'Impossible receipt cycle')
    if (r.source === 'normal-return') assert(r.steps.length === 0 && r.outcome !== 'death' &&
      v.archives[n].site.nodeId === deps.tasks.data.goal.return, 'Normal return must be real H0 and empty steps')
    else if (r.source === 'combat-death') assert(r.steps.length === 0 && r.outcome === 'death' &&
      typeof r.combatDeathReceiptId === 'string' && r.combatDeathReceiptId.length > 0, 'Invalid combat death reference')
    else assert(r.steps.length > 0 && (r.source !== 'deadline' || r.taskDay === deps.residence.configuration.config.limits.days), 'Missing actual terminal trace')
    for (const id of r.dispositionIds) {
      assert(!dispositionOwners.has(id), 'Disposition used by two closures')
      dispositionOwners.add(id)
      assert(v.dispositions.some(d => d.id === id && same(d.binding, r.binding) && d.kind !== 'consumed' && d.kind !== 'installed'), 'Missing terminal disposition')
    }
    if (r.outcome === 'success') {
      const delivered = v.dispositions.filter(d => r.dispositionIds.includes(d.id) && d.kind === 'delivered')
      assert(delivered.length === 1, 'Success missing delivered sample')
      const a = delivered[0].ranges, o = v.origins.find(o => o.id === a[0]?.originId)
      assert(o && o.kind === 'task' && o.producerId === 'sample' && same(o.binding, r.binding) &&
        delivered[0].item.instanceId === originalInstanceId(o), 'Wrong delivered sample')
      assert(deps.tasks.data.goal.facts.every(id => v.archives[n].site.facts.some(f => f.id === id && f.value)), 'Success missing real facilities')
    }
  }
  assert(balance === v.balance, 'Wallet outside declared terminal history')
  for (const d of v.dispositions) if (d.kind !== 'consumed' && d.kind !== 'installed') assert(dispositionOwners.has(d.id), 'Unowned terminal disposition')
  if (v.phase === 'first-hub') assert(v.productions.length === 0 && v.dispositions.length === 0 &&
    v.character.body.condition.currentHealth > 0 && !v.choices.firstBandageUsed, 'Initial lifecycle reset')
  if (v.phase === 'living-hub' || v.phase === 'dead') assert(v.receipts.at(-1)?.revision === v.character.revision &&
    (v.phase === 'dead') === (v.receipts.at(-1)?.outcome === 'death'), 'Latest terminal boundary differs')
  for (const site of sites) {
    const installed = v.dispositions.filter(d => d.kind === 'installed' && same(d.binding, site.binding))
    const transfer = site.facts.some(f => f.id === 'transfer' && f.value)
    assert(transfer === v.productions.some(p => p.producerId === 'install' && same(p.binding, site.binding)), 'Transfer without installation')
    if (transfer) for (const [alias, quantity] of Object.entries(tableValue(deps.configuration, 'install.inputs'))) {
      const id = deps.tasks.data.items.find(i => i.alias === alias)!.id
      assert(installed.filter(d => d.item.definitionId === id).reduce((n, d) => n + d.item.quantity, 0) === quantity, 'Installed recipe history mismatch')
    }
  }
  // Configuration methods are resolved by producers; no future action sequence is stored.
  assert(numberValue(deps.configuration, 'unit') > 0, 'Invalid unit')
}
