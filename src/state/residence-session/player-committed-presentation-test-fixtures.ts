import { deepFreeze } from '../../core/config'
import { requireCombatResidencePolicy } from '../residence-save/combat-policy'
import type { CombatResidencePolicy } from '../residence-save/combat-types'
import type { CombatSession } from './combat-types'
import { createPlayerContext } from './player-context'
import { projectPlayerView } from './player-queries'
import { resolvePlayerCommand } from './player-commands'
import { qualifyPlayerCommand } from './player-preview'
import { isPlayerBusinessError, PlayerSelectionError } from './player-errors'
import type { PlayerSession, PlayerLabels, PlayerPreview, PlayerExecution } from './player-types'
import { assertCombatSyncFunction } from './combat-composition'
import { createPlayerPreplay } from './player-preplay'
import { infectedWorldPlayerLabels as baselineLabels } from '../../content/infected-world-v0.1/player-query'
// TEST ONLY. Same deterministic case setup as the pre-edit, external exact-base capture.
import { expect, vi } from 'vitest'
import { entered, fixture, coldRecord } from './combat-test-fixtures'
import { fromValue, ready, allActions } from './player-test-fixtures'
import { readCombatValue } from '../../core/residence-combat/validation'
import { simultaneous } from '../residence-save/combat-review-simultaneous-fixtures'

// TEST-only narrow Node builtin adapter; project TS exposes browser types, so no Node typings/config dependency is added.
const cryptoSpecifier: string = 'node:crypto'
const { createHash } = await import(/* @vite-ignore */ cryptoSpecifier) as {
  createHash(algorithm: 'sha256'): { update(value: string): { digest(encoding: 'hex'): string } }
}

export const compatibilityCases = ['basic', 'signature', 'defend', 'retreat', 'quick', 'temporary', 'two-responses',
  'last-durability', 'victory', 'death', 'both-zero', 'move-enters-battle', 'save-failed'] as const
export type CompatibilityCase = typeof compatibilityCases[number]
export const digest = (v: unknown) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex')
export function committedCase(id: CompatibilityCase, baseline = false) {
  const pair = id === 'both-zero' ? simultaneous() : null
  const f = pair?.h ?? (id === 'move-enters-battle' ? fixture() : entered(id === 'two-responses' ? 'technician' : 'orderly',
    id === 'quick' ? { hp: 10 } : id === 'death' ? { hp: 1 } : {}))
  let value = pair?.beforeLast ?? f.value
  if (['temporary', 'two-responses', 'last-durability'].includes(id)) {
    const weapon = value.carried.equipment.weapon!.instanceId
    // Existing legal TEST resource boundary, never fake CTB, damage or enemy HP.
    value = readCombatValue({ ...value, itemStates: { states: value.itemStates.states.map(s => s.instanceId === weapon ?
      { ...s, resource: { kind: 'durability', current: id === 'last-durability' ? 1 : 0 } } : s) } }, f.deps)
  }
  if (id === 'two-responses') for (let n = 0; n < 8; n++) value = f.action(value, { kind: 'defend' }).snapshot
  if (id === 'victory') for (const kind of ['metal-pipe-charged-strike', 'metal-pipe-basic-attack'] as const) value = f.action(value, { kind }).snapshot
  const h = baseline ? baselinePlayerFromValue(value, f.deps) : fromValue(value, f.deps)
  const label = id === 'signature' || id === 'last-durability' ? '蓄力打击' : id === 'defend' || id === 'death' ? '防御' :
    id === 'retreat' ? '退却' : id === 'temporary' || id === 'two-responses' ? '临时攻击' : id === 'quick' ? '使用快捷物品' :
      id === 'move-enters-battle' ? '大厅' : '金属管攻击'
  const action = allActions(ready(h.player)).find(a => a.family === (id === 'move-enters-battle' ? 'move' : 'combat') && a.label.startsWith(label))!
  expect(action).toBeDefined()
  return { h, request: { action: action.selector } }
}

// TEST-only exact baseline wrapper; only exported name changes. All runtime dependencies below it are protected/unmodified.
export function baselineWrapPlayerSession(owner: CombatSession, policy: CombatResidencePolicy, labels: PlayerLabels) {
  const { dependencies: deps } = requireCombatResidencePolicy(policy)
  let context: ReturnType<typeof createPlayerContext> | null = null, busy = false
  function synchronize() {
    const value = owner.getState().current
    if (value === context?.value) return
    context = null
    if (value) { readCombatValue(value, deps); context = createPlayerContext(value, deps) }
  }
  synchronize()
  const query = () => projectPlayerView(owner.getState(), context, deps, labels, busy)
  function preview(input: unknown): PlayerPreview {
    try {
      if (busy || !context || owner.getState().current !== context.value) throw new PlayerSelectionError()
      return qualifyPlayerCommand(context.value, resolvePlayerCommand(context, input, deps), deps)
    } catch (e) {
      if (!isPlayerBusinessError(e)) throw e
      return deepFreeze({ kind: e instanceof PlayerSelectionError ? 'invalid-selection' : 'unavailable', cost: null })
    }
  }
  const player: PlayerSession = Object.freeze({ query,
    setup: () => { const v = owner.getState().current; return deepFreeze(v ? { tools: [v.choices.tool], specialties: [v.choices.specialty] } :
      { tools: ['crow', 'lamp', 'toolbox'], specialties: ['scout', 'engineer', 'survival'] }) },
    preview, resolve: preview,
    execute: (input: unknown): PlayerExecution => {
      const checked = preview(input)
      if (checked.kind !== 'available' && checked.kind !== 'unknown') return deepFreeze({ kind: 'rejected', view: query(), preview: checked })
      const command = resolvePlayerCommand(context!, input, deps)
      busy = true
      try {
        owner.dispatch(command)
      } catch (e) {
        if (!isPlayerBusinessError(e)) throw e
        return deepFreeze({ kind: 'rejected', view: projectPlayerView(owner.getState(), context, deps, labels), preview: { kind: 'unavailable', cost: null } })
      } finally { try { synchronize() } finally { busy = false } }
      return deepFreeze({ kind: 'committed', view: query(), preview: checked })
    },
    retrySave: () => { if (busy) return query(); busy = true;
      try { owner.retrySave() } catch (e) { if (!isPlayerBusinessError(e)) throw e } finally { busy = false }; return query() },
    subscribe: (listener) => { assertCombatSyncFunction(listener); return owner.subscribe(() => listener(query())) },
  })
  function controlled<T>(run: () => T) {
    if (busy) throw new PlayerSelectionError()
    busy = true
    try { run() } finally { try { synchronize() } finally { busy = false } }
    return query()
  }
  const preplay = createPlayerPreplay(() => !busy && context?.value === owner.getState().current ? context : null, deps)
  return Object.freeze({ player, preplay, synchronize,
    bootstrap: () => controlled(() => owner.bootstrap()), retryRead: () => controlled(() => owner.retryRead()),
    createFirst: () => controlled(() => owner.createFirst()) })
}

// Baseline construction never invokes the new facade, even during bootstrap.
function baselinePlayerFromValue(...args: Parameters<typeof coldRecord>) {
  const h = coldRecord(...args), dispatch = vi.fn(h.owner.dispatch)
  const ports = baselineWrapPlayerSession(Object.freeze({ ...h.owner, dispatch }), h.policy, baselineLabels)
  expect(ports.bootstrap().status).toBe('ready')
  return { ...h, ...ports, dispatch }
}
