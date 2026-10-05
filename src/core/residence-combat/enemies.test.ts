import { describe,it,expect,vi } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { drawIntInclusive } from '../random'
import { readCombatValue } from './validation'
import { queryResidenceCombat } from './queries'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const hit = (c: Parameters<typeof drawIntInclusive>[0], min:number, max:number) => ({...drawIntInclusive(c,min,max),value:min})
describe('P04 true enemy damage, injury and ordered responses',()=>{
  it.each(['orderly','porter','technician'] as const)('%s uses its real basic injury and original exposure-none draw contract',id=>{
    const draw=vi.fn(hit), h=entered(id,{draw})
    draw.mockClear()
    let v=h.action(h.value,{kind:'metal-pipe-basic-attack'}).snapshot
    if(id==='porter') v=h.action(v,{kind:'metal-pipe-basic-attack'}).snapshot
    const d=v.battle!.decision!
    expect(d.enemyResponses).toBe(1)
    expect(d.trace.find(t=>t.kind==='direct-damage')!.requested).toBe(id==='orderly'?2:id==='porter'?5:1)
    expect(v.character.body.condition.minorContusions).toBe(id==='porter'?1:0)
    expect(v.character.body.condition.openWounds.map(w=>w.kind)).toEqual(id==='orderly'?['laceration']:[])
    expect(v.character.body.condition.bleeding).toBe(id==='orderly')
    expect(v.character.body.condition.pendingInfectionExposures).toBe(0)
    expect(draw).toHaveBeenCalledTimes(1)
    expect(draw.mock.calls[0][0].drawIndex).toBe(0)
    expect(v.site!.enemies.find(e=>e.id===id)!.riskDrawIndex).toBe(1)
  })
  it('a real two-response command at the same player/enemy point preserves both CTB and risk ordering',()=>{
    const draw=vi.fn(hit), h=entered('technician',{draw})
    // TEST resource boundary only; never clears enemy or alters CTB/profile parameters.
    const weapon=h.value.carried.equipment.weapon!.instanceId
    let v=readCombatValue({...h.value,itemStates:{states:h.value.itemStates.states.map(s=>s.instanceId===weapon?
      {...s,resource:{kind:'durability',current:0}}:s)}},h.deps)
    for(let i=0;i<8;i++) v=h.action(v,{kind:'defend'}).snapshot
    expect(v.battle!.currentCtb).toBe(640);expect(v.battle!.enemyNext).toBe(640)
    draw.mockClear()
    v=h.action(v,{kind:'temporary-attack'}).snapshot
    const d=v.battle!.decision!
    expect(d.enemyResponses).toBe(2)
    expect(d.trace.filter(t=>t.kind==='direct-damage').map(t=>[t.actionId,t.ctb])).toEqual([
      ['technician-basic',640],['technician-special',750]])
    expect(d.ctbAfter).toBe(780);expect(d.riskAfter-d.riskBefore).toBe(3)
    expect(draw).toHaveBeenCalledTimes(3)
    expect(draw.mock.calls.every(c=>c[0].drawIndex===0)).toBe(true)
    expect(v.character.body.condition.openWounds.at(-1)?.kind).toBe('bite')
    expect(v.character.body.condition.pendingInfectionExposures).toBeGreaterThan(0)
  })
  it('safe core query exposes intent classes and qualification, not HP or risk answers',()=>{
    const h=entered('porter'), q=queryResidenceCombat(h.value,h.deps)!
    expect(q.intent).toMatchObject({relativeSpeed:'slow',directDamageSeverity:'high'})
    const text=JSON.stringify(q)
    for(const hidden of ['enemyHealth','riskPercent','roll','seed','battleId','riskDrawIndex','currentIntentActionId'])
      expect(text).not.toContain(hidden)
    expect(Object.keys(q).sort()).toEqual(['actions','bleeding','chargedStrikesRemaining','health','intent'])
  })
})
