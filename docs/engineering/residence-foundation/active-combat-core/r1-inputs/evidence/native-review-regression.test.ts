// WebGPT review template. NOT RUN by the mainline environment.
// Copy to src/core/residence-combat/review-regression.test.ts for the first native reproduction.
// Real content/initial/departure/G2/CTB producers; only risk draws use the valid injected upper endpoint.
import { describe, expect, it } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { drawIntInclusive } from '../random'
import { readCombatValue } from './validation'
import type { CombatValue } from './types'

type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] :
  T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const quietDraw: typeof drawIntInclusive = (cursor, min, max) => ({ ...drawIntInclusive(cursor, min, max), value: max })
type Shape = 'active' | 'heal-death' | 'bleed-death' | 'escape'
function prepare(shape: Shape) {
  const options = shape === 'heal-death' ? { hp: 1, draw: quietDraw } :
    shape === 'bleed-death' ? { hp: 4, bleeding: true, draw: quietDraw } : { draw: quietDraw }
  const h = entered('orderly', options)
  const result = shape === 'heal-death'
    ? h.action(h.value, { kind: 'use-quick-slot-item', quickSlotIndex: 0 },
        { instanceId: h.value.carried.quickSlots.slots[0]!.instanceId })
    : h.action(h.value, { kind: shape === 'escape' ? 'escape' : 'metal-pipe-basic-attack' })
  // These are fixture prerequisites, not test expectations derived from mutated records.
  if (shape === 'active') {
    expect(result.snapshot.battle).toMatchObject({ currentCtb: 100, playerNext: 100, enemyNext: 170 })
  } else if (shape === 'escape') {
    expect(result.snapshot.battles[0]).toMatchObject({ outcome: 'escaped', elapsed: 80, requestedEnergy: 6 })
  } else {
    expect(result.snapshot.phase).toBe('dead')
    expect(result.snapshot.combatDeaths[0].decision.ctbAfter).toBe(shape === 'heal-death' ? 70 : 0)
  }
  return { deps: h.deps, original: result.snapshot,
    raw: structuredClone(result.snapshot) as Mutable<CombatValue> }
}
type NativeDecision = NonNullable<NonNullable<CombatValue['battle']>['decision']>
function rewritePlayerTimes(d: Mutable<NativeDecision>, from: number, to: number) {
  for (const q of d.queue) {
    for (const k of ['currentBefore', 'currentAfter', 'playerBefore', 'playerAfter'] as const) {
      if (q[k] === from) q[k] = to
    }
  }
}
const tests: { id: string; shape: Shape; rejects: boolean; mutate?: (v: Mutable<CombatValue>) => void }[] = [
  { id: 'C01-active-basic100', shape: 'active', rejects: false },
  { id: 'C02-heal-then-death', shape: 'heal-death', rejects: false },
  { id: 'C03-HP1-action-bleeding-clips0', shape: 'bleed-death', rejects: false },
  { id: 'C04-escape80', shape: 'escape', rejects: false },
  { id: 'C05-wrong-battle-id', shape: 'active', rejects: true,
    mutate: v => { v.battle!.entry.id = 'wrong' } },
  { id: 'C06-broken-queue-adjacency', shape: 'active', rejects: true,
    mutate: v => { v.battle!.decision!.queue[1].currentBefore = 9 } },
  { id: 'C07-broken-HP-adjacency', shape: 'heal-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.trace[1].healthBefore = 3 } },
  { id: 'C08-bool-trace', shape: 'heal-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.trace[1].requested = true as unknown as number } },
  { id: 'C09-site-latest-HP', shape: 'active', rejects: true,
    mutate: v => { v.site!.enemies.find(e => e.id === 'orderly')!.state.currentHealth = 11 } },
  { id: 'C10-repeat-exit', shape: 'escape', rejects: true,
    mutate: v => { v.battles.push(structuredClone(v.battles[0])) } },
  { id: 'C11-wrong-fee', shape: 'escape', rejects: true,
    mutate: v => { v.battles[0].requestedEnergy = 12 } },
  { id: 'C12-wrong-medical-reference', shape: 'heal-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.uses[0].dispositionIds = ['missing'] } },
  { id: 'F01-player-basic-recovery80', shape: 'active', rejects: true,
    mutate: v => {
      const b = v.battle!, d = b.decision!
      b.currentCtb = b.playerNext = d.ctbAfter = d.playerNext = 80
      rewritePlayerTimes(d, 100, 80)
    } },
  { id: 'F01-enemy-interval430', shape: 'active', rejects: true,
    mutate: v => {
      const b = v.battle!, d = b.decision!
      b.enemyNext = d.enemyNext = 500
      for (const q of d.queue) for (const k of ['enemyBefore', 'enemyAfter'] as const) {
        if (q[k] === 170) q[k] = 500
      }
    } },
  { id: 'F01-escape-complete75', shape: 'escape', rejects: true,
    mutate: v => {
      const r = v.battles[0], d = r.decision
      r.elapsed = d.ctbAfter = d.playerNext = 75
      rewritePlayerTimes(d, 80, 75)
    } },
  { id: 'F02-death-trace-after-exit', shape: 'heal-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.trace[1].ctb = 999 } },
  { id: 'F02-death-wrong-action-source', shape: 'heal-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.trace[1].actionId = 'porter-basic' } },
  { id: 'F02-death-damage-inflated99', shape: 'heal-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.trace[1].requested = 99 } },
  { id: 'F02-bleed-request2-clips1', shape: 'bleed-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.trace[0].requested = 2 } },
  { id: 'F02-bleed-wrong-source', shape: 'bleed-death', rejects: true,
    mutate: v => { v.combatDeaths[0].decision.trace[0].actionId = 'orderly-special' } },
]

describe('E02-P mainline native review regression', () => {
  it.each(tests)('$id', ({ id, shape, rejects, mutate }) => {
    const { raw, deps, original } = prepare(shape)
    expect(readCombatValue(original, deps)).toEqual(original)
    mutate?.(raw)
    const saved = structuredClone(raw)
    let error: unknown
    let output: CombatValue | undefined
    try { output = readCombatValue(raw, deps) } catch (caught) { error = caught }
    expect(raw, id + ': input changed').toEqual(saved)
    expect(Object.isFrozen(raw), id + ': caller was frozen').toBe(false)
    if (rejects) {
      // A TypeError/RangeError/import failure is not a semantic rejection.
      expect(error, id + ': invalid record was accepted').toBeDefined()
      expect(error).not.toBeInstanceOf(TypeError)
      expect(error).not.toBeInstanceOf(RangeError)
      expect(error).toMatchObject({ code: expect.any(String) })
    } else {
      expect(error).toBeUndefined()
      expect(output).toEqual(saved)
    }
  })
})
