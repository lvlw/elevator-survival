import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { readCombatValue } from './validation'
import { queryResidenceCombat } from './queries'
import { planResidenceCombatAction, consumeCombatDeath } from './controlled'
import { drawIntInclusive } from '../random'
import * as engine from '../combat/combat-profiled-resolution'
import * as planner from '../combat/combat-transition-plan'
import * as reducer from '../combat/combat-effect-reducer'
import * as cycles from '../character-cycle'
import * as energy from '../residence-energy'
import * as units from '../residence-supply/allocations'
import * as medical from '../residence-supply/shared-medical'
import * as lifecycle from '../mission-lifecycle/controlled'
import type { CombatValue } from './types'
import { projectCombat } from './projection'
import { composeCombatResolution } from './effects'
import { issueCombatDeath } from './terminal'

const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const quiet: typeof drawIntInclusive = (c,min,max) => ({...drawIntInclusive(c,min,max),value:max})
afterEach(() => vi.restoreAllMocks())
function counters() {
  return [
    vi.spyOn(engine,'resolveProfiledCombatAction'), vi.spyOn(planner,'buildCombatTransitionPlan'),
    vi.spyOn(reducer,'reduceCombatEffects'), vi.spyOn(energy,'planResidenceAction'),
    vi.spyOn(cycles,'planCharacterCycle'), vi.spyOn(units,'consumeSupplyUnits'),
    vi.spyOn(medical,'evaluateSupplyClinical'), vi.spyOn(units,'issueSupplyOrigin'),
    vi.spyOn(lifecycle,'terminateMission'),
  ]
}
describe('R06 joint history verification has zero gameplay replay', () => {
  it('death issuance binds minimal evidence to independent before, not a self-consistent forged armor fact', () => {
    const h=entered('orderly',{hp:1,draw:quiet})
    const {snapshot,engine:dependencies}=projectCombat(h.value,h.deps)
    const result=engine.resolveProfiledCombatAction(snapshot,{kind:'use-quick-slot-item',quickSlotIndex:0},dependencies)
    const proposed=composeCombatResolution(h.value,result,h.deps), d=proposed.battle!.decision!
    const forged={...proposed,itemStates:{states:proposed.itemStates.states.map(s=>
      s.instanceId===d.context.armor!.instanceId?{...s,resource:{kind:'integrity' as const,current:0}}:s)},
      battle:{...proposed.battle!,decision:{...d,
      context:{...d.context,armor:{...d.context.armor!,current:0}},resources:[],
      trace:d.trace.map(t=>t.kind==='direct-damage'?{...t,requested:3}:t)}}}
    expect(()=>issueCombatDeath(h.value,forged,h.deps)).toThrow('Death evidence differs from independent original context')
    expect(issueCombatDeath(h.value,proposed,h.deps).kind).toBe('combat-death-proposal')
  })
  it.each(['active','death','escape'] as const)('valid and invalid %s parse/query add no calls', kind => {
    const draw=vi.fn(quiet), h=entered('orderly',{hp:kind==='death'?1:12,draw})
    const input=structuredClone(kind==='death'
      ? h.action(h.value,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:h.value.carried.quickSlots.slots[0]!.instanceId}).snapshot
      : h.action(h.value,{kind:kind==='escape'?'escape':'metal-pipe-basic-attack'}).snapshot)
    const bad=structuredClone(input)
    const d=bad.battle?.decision ?? bad.combatDeaths[0]?.decision ?? bad.battles[0].decision
    const damaged={...d,trace:d.trace.map((t,i)=>i===d.trace.length-1?{...t,actionId:'foreign-action'}:t)}
    const invalid:CombatValue=bad.battle ? {...bad,battle:{...bad.battle,decision:damaged}}
      : bad.combatDeaths.length ? {...bad,combatDeaths:[{...bad.combatDeaths[0],decision:damaged}]}
      : {...bad,battles:[{...bad.battles[0],decision:damaged}]}
    const original=structuredClone(input), originalBad=structuredClone(invalid)
    const spies=counters(); draw.mockClear()
    for(let i=0;i<3;i++) {
      expect(readCombatValue(input,h.deps)).toEqual(input); queryResidenceCombat(input,h.deps)
      expect(()=>readCombatValue(invalid,h.deps)).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
      expect(()=>queryResidenceCombat(invalid,h.deps)).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
    }
    expect(spies.map(s=>s.mock.calls.length)).toEqual([0,0,0,0,0,0,0,0,0])
    expect(draw).not.toHaveBeenCalled()
    expect(input).toEqual(original);expect(invalid).toEqual(originalBad)
    expect(Object.isFrozen(input)).toBe(false);expect(Object.isFrozen(invalid)).toBe(false)
  })
  it('real heal-death produces once; consuming and reading do not repeat CTB, medicine, G1 or RNG', () => {
    const draw=vi.fn(quiet),h=entered('orderly',{hp:1,draw}),a=h.authorize(h.value)
    const spies=counters();draw.mockClear()
    const proposal=planResidenceCombatAction(h.value,{kind:'combat-action',expectedRevision:h.value.character.revision,
      command:{kind:'use-quick-slot-item',quickSlotIndex:0},instanceId:h.value.carried.quickSlots.slots[0]!.instanceId},a)
    expect(proposal.kind).toBe('combat-death-proposal')
    if(proposal.kind!=='combat-death-proposal')throw new Error('Expected real death proposal')
    expect(spies.map(s=>s.mock.calls.length)).toEqual([1,1,1,0,0,1,0,0,0])
    expect(draw).not.toHaveBeenCalled()
    const end=consumeCombatDeath(h.value,proposal,a)
    expect(spies.map(s=>s.mock.calls.length)).toEqual([1,1,1,0,0,1,0,0,1])
    expect(end.snapshot.phase).toBe('dead')
    expect(end.snapshot.character.revision).toBe(h.value.character.revision+1)
    expect(end.snapshot.combatDeaths[0].decision.trace.map(t=>[t.kind,t.requested,t.actual,t.ctb]))
      .toEqual([['heal',1,1,0],['direct-damage',2,2,70]])
    readCombatValue(end.snapshot,h.deps)
    expect(()=>consumeCombatDeath(h.value,proposal,a)).toThrow()
    expect(spies.map(s=>s.mock.calls.length)).toEqual([1,1,1,0,0,1,0,0,1])
    expect(draw).not.toHaveBeenCalled()
  })
})
