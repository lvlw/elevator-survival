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

describe('R02 R03 adjacent decision constraints', () => {
  it('multiple responses preserve same-point priority and each source interval', () => {
    const h = entered('technician',{draw:quietDraw})
    const weapon = h.value.carried.equipment.weapon!.instanceId
    let v = readCombatValue({...h.value,itemStates:{states:h.value.itemStates.states.map(s =>
      s.instanceId === weapon ? {...s,resource:{kind:'durability',current:0}} : s)}},h.deps)
    for (let i=0;i<8;i++) v=h.action(v,{kind:'defend'}).snapshot
    expect(v.battle).toMatchObject({currentCtb:640,enemyNext:640})
    v=h.action(v,{kind:'temporary-attack'}).snapshot
    expect(v.battle!.decision!.trace.filter(t=>t.kind==='direct-damage').map(t=>[t.actionId,t.ctb]))
      .toEqual([['technician-basic',640],['technician-special',750]])
    expect(readCombatValue(v,h.deps)).toEqual(v)
    const raw=structuredClone(v) as Mutable<CombatValue>
    raw.battle!.decision!.trace.filter(t=>t.kind==='direct-damage')[1].actionId='technician-basic'
    expect(()=>readCombatValue(raw,h.deps)).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
  })
  it('escape keeps pre-action lock despite new wound; completion bleeding has its own point', () => {
    const h=entered('orderly',{draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:min})})
    const escaped=h.action(h.value,{kind:'escape'}).snapshot
    const d=escaped.battles[0].decision
    expect(d.context.untreatedWoundIds).toEqual([])
    expect(d.ctbAfter).toBe(80)
    expect(d.trace.at(-1)).toMatchObject({kind:'post-action-bleeding',ctb:80,requested:1})
    expect(escaped.character.body.condition.openWounds).toHaveLength(1)
    const raw=structuredClone(escaped) as Mutable<CombatValue>
    raw.battles[0].decision.trace.at(-1)!.ctb=70
    expect(()=>readCombatValue(raw,h.deps)).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
  })
  it('charged CTB overflow is a safe-integer rejection, never rounded history', () => {
    const h=entered('orderly',{draw:quietDraw})
    const raw=structuredClone(h.action(h.value,{kind:'metal-pipe-charged-strike'}).snapshot) as Mutable<CombatValue>
    raw.battle!.decision!.context.enemyNext=Number.MAX_SAFE_INTEGER
    expect(()=>readCombatValue(raw,h.deps)).toThrowError(expect.objectContaining({code:'SAFE_INTEGER_OVERFLOW'}))
  })
  it('latest real armor cannot contradict an otherwise self-consistent protection witness', () => {
    const {raw,deps}=prepare('active')
    const armor=raw.carried.equipment.armor!.instanceId
    const state=raw.itemStates.states.find(s=>s.instanceId===armor)!
    if(state.resource.kind==='none')throw new Error('Expected real armor')
    state.resource.current++
    expect(()=>readCombatValue(raw,deps)).toThrow('Latest real resource differs from decision evidence')
  })
  it.each(['missing-response','duplicate-response','wrong-reason','missing-trace','duplicate-trace',
    'wrong-protection','missing-resource','extra-resource','fake-armor','wrong-count','huge-count',
    'overflow-ctb','context-extra','bad-number','non-hp-change'] as const)('rejects %s as a domain error', fault => {
    const { raw, deps } = prepare('active'), d = raw.battle!.decision!
    if (fault === 'missing-response') d.queue.splice(1, 1)
    if (fault === 'duplicate-response') d.queue.splice(1, 0, structuredClone(d.queue[1]))
    if (fault === 'wrong-reason') d.queue[1].reason = 'player-decision-point'
    if (fault === 'missing-trace') d.trace = []
    if (fault === 'duplicate-trace') d.trace.push(structuredClone(d.trace[0]))
    if (fault === 'wrong-protection') d.context.armor!.current = 0
    if (fault === 'missing-resource') d.resources.pop()
    if (fault === 'extra-resource') d.resources.push(structuredClone(d.resources[0]))
    if (fault === 'fake-armor') d.context.armor!.instanceId = 'fake-armor'
    if (fault === 'wrong-count') d.enemyResponses++
    if (fault === 'huge-count') d.actionCountAfter = Number.MAX_SAFE_INTEGER
    if (fault === 'overflow-ctb') d.context.enemyNext = Number.MAX_SAFE_INTEGER
    if (fault === 'context-extra') Object.assign(d.context, { health: 12 })
    if (fault === 'bad-number') d.context.enemyNext = true as unknown as number
    if (fault === 'non-hp-change') d.trace[0].kind = 'injury'
    const before = structuredClone(raw)
    expect(() => readCombatValue(raw, deps)).toThrowError(expect.objectContaining({ code: expect.any(String) }))
    expect(raw).toEqual(before); expect(Object.isFrozen(raw)).toBe(false)
  })
  it.each(['orderly','porter','technician'] as const)('binds %s charged delay and damage source', enemy => {
    const h = entered(enemy, { draw: quietDraw })
    const charged = h.action(h.value, { kind:'metal-pipe-charged-strike' }).snapshot
    const d = charged.battle!.decision!
    expect(d.queue[0].enemyBefore - d.context.enemyNext).toBe(enemy === 'orderly' ? 200 : 140)
    expect(readCombatValue(charged, h.deps)).toEqual(charged)
    const raw = structuredClone(charged) as Mutable<CombatValue>
    raw.battle!.decision!.queue[0].enemyBefore++
    expect(() => readCombatValue(raw, h.deps)).toThrowError(expect.objectContaining({ code:'INVALID_INPUT' }))
    let hit = h.action(h.value, { kind:'metal-pipe-basic-attack' }).snapshot
    if (enemy === 'porter') hit = h.action(hit, { kind:'metal-pipe-basic-attack' }).snapshot
    const wrong = structuredClone(hit) as Mutable<CombatValue>
    wrong.battle!.decision!.trace.find(t => t.kind === 'direct-damage')!.actionId =
      enemy === 'orderly' ? 'porter-basic' : 'orderly-basic'
    expect(() => readCombatValue(wrong, h.deps)).toThrowError(expect.objectContaining({ code:'INVALID_INPUT' }))
  })
  it('defense and last armor resource remain source-bound even when HP clips to zero', () => {
    const h = entered('orderly', { hp:1, draw:quietDraw })
    const armor = h.value.carried.equipment.armor!.instanceId
    const start = readCombatValue({ ...h.value, itemStates:{ states:h.value.itemStates.states.map(s =>
      s.instanceId === armor ? { ...s, resource:{ kind:'integrity',current:1 } } : s) } }, h.deps)
    const dead = h.action(start, { kind:'defend' }).snapshot
    expect(dead.phase).toBe('dead')
    expect(dead.combatDeaths[0].decision.trace[0]).toMatchObject({ requested:1, actual:1, ctb:70 })
    expect(dead.combatDeaths[0].decision.resources[0]).toMatchObject({ before:1,after:0 })
    const raw = structuredClone(dead) as Mutable<CombatValue>
    raw.combatDeaths[0].decision.trace[0].requested = 2
    expect(() => readCombatValue(raw, h.deps)).toThrowError(expect.objectContaining({ code:'INVALID_INPUT' }))
  })
  it('full HP bandage has a real untreated target and requested recovery survives clipping', () => {
    const h = entered('orderly', { specialty:'survival', draw:quietDraw })
    // Explicit TEST wound boundary only; the item, entry and subsequent response are real.
    const start = readCombatValue({ ...h.value, character:{ ...h.value.character, body:{ ...h.value.character.body,
      condition:{ ...h.value.character.body.condition, openWounds:[{id:'TEST-wound',kind:'laceration',treatment:'untreated'}] } } } },h.deps)
    const result = h.action(start,{kind:'use-quick-slot-item',quickSlotIndex:0,targetOpenWoundId:'TEST-wound'},
      {instanceId:start.carried.quickSlots.slots[0]!.instanceId}).snapshot
    expect(result.battle!.decision!.trace.slice(0,2)).toMatchObject([
      {kind:'heal',requested:2,actual:0,healthAfter:12},{kind:'treatment',reference:'TEST-wound'}])
    expect(result.carried.quickSlots.slots[0]).toBeNull()
    const raw = structuredClone(result) as Mutable<CombatValue>
    raw.battle!.decision!.trace[0].requested = 99
    expect(() => readCombatValue(raw,h.deps)).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
  })
})
