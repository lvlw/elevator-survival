// TEST ONLY. Observe real modules without replacing producer results or random values.
import { vi } from 'vitest'
import * as session from '../../state/residence-session/combat-session'
import * as initial from '../../core/residence-combat/initial'
import * as stable from '../../core/residence-combat/stable'
import * as actions from '../../core/residence-combat/actions'
import * as energy from '../../core/residence-energy'
import * as cycle from '../../core/character-cycle'
import * as movement from '../../core/residence-location/movement'
import * as origins from '../../core/residence-supply/allocations'
import * as resource from '../../core/item-state'
import * as random from '../../core/random'
import * as aggregate from '../../state/residence-save/combat-validation'
import * as codec from '../../state/residence-save/combat-codec'
import type { CombatSession } from '../../state/residence-session/combat-types'
export function observeBrowser() {
  let current=0,notices=0,dispatch=0;const owners:CombatSession[]=[]
  const original=session.buildCombatSession
  const spies={s:vi.spyOn(session,'buildCombatSession').mockImplementation((...args)=>{
    const s=original(...args);let last=s.getState().current;s.subscribe(()=>{notices++})
    const watch=<T>(f:()=>T)=>{try{return f()}finally{const next=s.getState().current;if(next!==last){current++;last=next}}}
    const out=Object.freeze({...s,dispatch:(c:unknown)=>{dispatch++;return watch(()=>s.dispatch(c))},createFirst:()=>watch(s.createFirst),bootstrap:()=>watch(s.bootstrap)})
    owners.push(out);return out
  }),initial:vi.spyOn(initial,'establishCombatInitial'),task:vi.spyOn(stable,'planCombatTask'),source:vi.spyOn(stable,'planCombatSource'),
    combat:vi.spyOn(actions,'resolveResidenceCombatAction'),medical:vi.spyOn(stable,'planCombatMedical'),maintenance:vi.spyOn(stable,'planCombatMaintenance'),terminal:vi.spyOn(stable,'planCombatTerminal'),
    g1Action:vi.spyOn(energy,'planResidenceAction'),g1Cycle:vi.spyOn(cycle,'planCharacterCycle'),g2:vi.spyOn(movement,'planResidenceBoundMove'),
    origins:vi.spyOn(origins,'issueSupplyOrigin'),consume:vi.spyOn(resource,'consumeCommittedResource'),draw:vi.spyOn(random,'drawIntInclusive'),
    aggregate:vi.spyOn(aggregate,'validateCombatResidenceAggregate'),encode:vi.spyOn(codec,'serializeCombatResidenceSave'),decode:vi.spyOn(codec,'deserializeCombatResidenceSave')}
  return {owners,counts:():Record<string,number>=>({...Object.fromEntries(Object.entries(spies).map(([k,v])=>[k,v.mock.calls.length])),current,notices,dispatch}),
    clear:()=>{for(const s of Object.values(spies))s.mockClear();current=notices=dispatch=0}}
}
