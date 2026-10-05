import { afterEach,describe,it,expect,vi } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { readCombatValue } from './validation'
import { queryResidenceCombat } from './queries'
import * as engine from '../combat/combat-profiled-resolution'
import * as cycles from '../character-cycle'
import * as energy from '../residence-energy'
import * as allocations from '../residence-supply/allocations'
import * as lifecycle from '../mission-lifecycle/controlled'
import { drawIntInclusive } from '../random'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
afterEach(()=>vi.restoreAllMocks())
describe('P11 no replay, deterministic entropy domains and faults',()=>{
  it.each([true,-1,0.5,Number.MAX_SAFE_INTEGER+1])('rejects raw injected entropy %s as a domain error before issuing',bad=>{
    const h=entered('orderly',{draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:bad as number})})
    const before=structuredClone(h.value)
    expect(()=>h.action(h.value,{kind:'metal-pipe-basic-attack'})).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
    expect(h.value).toEqual(before)
  })
  it('repeated pure parse/query has zero CTB, action/cycle, origin, terminal or draw',()=>{
    const draw=vi.fn(drawIntInclusive),h=entered('orderly',{draw})
    const ctb=vi.spyOn(engine,'resolveProfiledCombatAction'), action=vi.spyOn(energy,'planResidenceAction'),
      cycle=vi.spyOn(cycles,'planCharacterCycle'),origin=vi.spyOn(allocations,'issueSupplyOrigin'),close=vi.spyOn(lifecycle,'terminateMission')
    draw.mockClear()
    const input=structuredClone(h.value), before=structuredClone(input)
    for(let i=0;i<5;i++){readCombatValue(input,h.deps);queryResidenceCombat(input,h.deps)}
    expect([ctb.mock.calls.length,action.mock.calls.length,cycle.mock.calls.length,origin.mock.calls.length,close.mock.calls.length,draw.mock.calls.length])
      .toEqual([0,0,0,0,0,0])
    expect(input).toEqual(before);expect(Object.isFrozen(input)).toBe(false)
  })
  it('producer exception is rethrown, original input unchanged, no issued result',()=>{
    const fault=new Error('native entropy fault'),draw=vi.fn(()=>{throw fault}),h=entered('orderly',{draw})
    const before=structuredClone(h.value)
    expect(()=>h.action(h.value,{kind:'metal-pipe-basic-attack'})).toThrow(fault)
    expect(draw).toHaveBeenCalledTimes(1);expect(h.value).toEqual(before)
  })
  it('battle ID/day/reentry do not enter the persistent enemy risk substream domain',()=>{
    const draw=vi.fn((c:Parameters<typeof drawIntInclusive>[0],min:number,max:number)=>({...drawIntInclusive(c,min,max),value:max}))
    const h=entered('orderly',{draw});draw.mockClear()
    const first=h.action(h.value,{kind:'escape'}).snapshot
    const a=draw.mock.calls[0][0]
    const re=h.move(first,'H4').snapshot;draw.mockClear()
    h.action(re,{kind:'metal-pipe-basic-attack'})
    const b=draw.mock.calls[0][0]
    expect(a.streamId).not.toContain(h.value.battle!.entry.id)
    expect(b.streamId).not.toContain(re.battle!.entry.id)
    expect(a.streamId).not.toBe(b.streamId) // next persistent action, not first draw replay
    expect(a.drawIndex).toBe(0);expect(b.drawIndex).toBe(0)
  })
})
