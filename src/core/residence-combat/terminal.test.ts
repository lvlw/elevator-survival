import { describe,it,expect,vi } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planResidenceCombatAction,consumeCombatDeath } from './controlled'
import * as engine from '../combat/combat-profiled-resolution'
import * as reduce from '../combat/combat-effect-reducer'
import * as g1 from '../residence-energy'
import * as cycles from '../character-cycle'
import * as lifecycle from '../mission-lifecycle/controlled'
import { drawIntInclusive } from '../random'
import { readCombatValue } from './validation'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P09 typed original death consumption',()=>{
  it('heal then enemy death consumes same issued plan with zero replay, one terminal and no extra revision',()=>{
    const draw=vi.fn(drawIntInclusive), h=entered('orderly',{hp:1,draw})
    const a=h.authorize(h.value), item=h.value.carried.quickSlots.slots[0]!
    const ctb=vi.spyOn(engine,'resolveProfiledCombatAction'), apply=vi.spyOn(reduce,'reduceCombatEffects')
    const action=vi.spyOn(g1,'planResidenceAction'), cycle=vi.spyOn(cycles,'planCharacterCycle'), close=vi.spyOn(lifecycle,'terminateMission')
    draw.mockClear()
    const raw=planResidenceCombatAction(h.value,{kind:'combat-action',expectedRevision:h.value.character.revision,
      command:{kind:'use-quick-slot-item',quickSlotIndex:0},instanceId:item.instanceId},a)
    expect(raw.kind).toBe('combat-death-proposal')
    if(raw.kind!=='combat-death-proposal') throw new Error('Expected real death')
    expect('snapshot' in raw).toBe(false)
    expect(raw.trace.map(t=>t.kind)).toEqual(['heal','direct-damage'])
    expect(ctb).toHaveBeenCalledTimes(1);expect(apply).toHaveBeenCalledTimes(1);expect(draw).not.toHaveBeenCalled()
    const p=consumeCombatDeath(h.value,raw,a)
    expect(ctb).toHaveBeenCalledTimes(1);expect(apply).toHaveBeenCalledTimes(1)
    expect(action).not.toHaveBeenCalled();expect(cycle).not.toHaveBeenCalled();expect(close).toHaveBeenCalledTimes(1)
    expect(p.snapshot.phase).toBe('dead');expect(p.snapshot.character.revision).toBe(h.value.character.revision+1)
    expect(p.snapshot.balance).toBe(0);expect(p.snapshot.carried.quickSlots.slots.every(i=>!i)).toBe(true)
    expect(p.snapshot.combatDeaths).toHaveLength(1)
    expect(p.snapshot.dispositions.some(d=>d.item.instanceId===item.instanceId&&d.reason==='medical')).toBe(true)
    expect(p.snapshot.archives[0].site.enemies.find(e=>e.id==='orderly')!.state.resolvedActionCount).toBe(0)
    expect(p.snapshot.archives[0].site.enemies.find(e=>e.id==='orderly')!.riskDrawIndex).toBe(0)
    expect(readCombatValue(p.snapshot,h.deps)).toEqual(p.snapshot)
    expect(()=>consumeCombatDeath(h.value,raw,a)).toThrow()
    expect(()=>consumeCombatDeath(h.value,structuredClone(raw),a)).toThrow()
    vi.restoreAllMocks()
  })
  it('own post-action bleeding death preempts enemy response and surviving exit fee',()=>{
    const h=entered('orderly',{hp:4,bleeding:true})
    expect(h.value.character.body.condition.currentHealth).toBe(1)
    const p=h.action(h.value,{kind:'metal-pipe-basic-attack'})
    expect(p.snapshot.phase).toBe('dead');expect(p.snapshot.battles).toHaveLength(0)
    expect(p.snapshot.combatDeaths[0].decision.trace.at(-1)).toMatchObject({kind:'post-action-bleeding',healthAfter:0})
    expect(p.snapshot.archives[0].site.enemies.find(e=>e.id==='orderly')!.state.currentHealth).toBe(10)
    expect(p.snapshot.combatDeaths[0].decision.enemyResponses).toBe(0)
    expect(p.snapshot.character.body.energy).toBe(h.value.character.body.energy)
  })
  it('later real reentry death binds its own entry, not the first battle receipt',()=>{
    const h=entered('orderly',{draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:max})})
    const escaped=h.action(h.value,{kind:'escape'}).snapshot
    // Explicit TEST low-health boundary at a stable point; reentry and death are real producers.
    const low=readCombatValue({...escaped,character:{...escaped.character,body:{...escaped.character.body,
      condition:{...escaped.character.body.condition,currentHealth:1}}}},h.deps)
    const again=h.move(low,'H4').snapshot
    expect(again.battle!.entry.id).not.toBe(escaped.battles[0].entry.id)
    const a=h.authorize(again), item=again.carried.quickSlots.slots[0]!
    const raw=planResidenceCombatAction(again,{kind:'combat-action',expectedRevision:again.character.revision,
      command:{kind:'use-quick-slot-item',quickSlotIndex:0},instanceId:item.instanceId},a)
    expect(raw.kind).toBe('combat-death-proposal')
    if(raw.kind!=='combat-death-proposal') throw new Error('Expected real reentry death')
    const dead=consumeCombatDeath(again,raw,a).snapshot
    expect(dead.phase).toBe('dead')
    expect(dead.combatDeaths[0].entry).toEqual(again.battle!.entry)
    expect(dead.battles[0]).toEqual(escaped.battles[0])
    expect(dead.character.revision).toBe(again.character.revision+1)
    expect(readCombatValue(dead,h.deps)).toEqual(dead)
  })
})
