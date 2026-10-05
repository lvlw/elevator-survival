import { describe,it,expect } from 'vitest'
import { createCombatTestFactory } from '../residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
const { fixture,entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
import { projectCombat } from '../residence-combat/projection'
import { createCombatProfile,createProfiledCombatDependencies } from './profiled-controlled'
import { createResidenceCombatDependencies } from '../residence-combat/dependencies'
describe('P01 P11 strict neutral profile and issued dependency boundaries',()=>{
  it.each([null,[],true,-1,0.5,Number.MAX_SAFE_INTEGER+1])('rejects malformed/unsafe profile raw value %s',bad=>{
    const h=fixture(), profile=structuredClone(h.deps.profiles[0])
    expect(()=>createCombatProfile({...profile,firstEnemyCtb:bad})).toThrow()
  })
  it('rejects unknown, duplicate, wrong HP/actions/first CTB/damage and legacy clone dependencies',()=>{
    const h=fixture(), p=h.deps.profiles
    for(const change of [{definitionId:'unknown'},{maxHealth:99},{firstEnemyCtb:0},{reentryEnemyCtb:99},
      {rules:{...p[0].rules,metalPipe:{...p[0].rules.metalPipe,basicAttack:{...p[0].rules.metalPipe.basicAttack,damage:99}}}},
      {actions:[{...p[0].actions[0],damage:99},p[0].actions[1]]}])
      expect(()=>createResidenceCombatDependencies(h.deps.supply,[{...p[0],...change},...p.slice(1)])).toThrow()
    expect(()=>createResidenceCombatDependencies(h.deps.supply,[...p,p[0]])).toThrow()
    expect(()=>createResidenceCombatDependencies(null as never,p)).toThrowError(expect.objectContaining({code:'INVALID_INPUT'}))
    expect(()=>createResidenceCombatDependencies({...h.deps.supply,extra:1} as never,p)).toThrow()
    let profileReads=0
    const array=Object.defineProperty([...p],0,{enumerable:true,get:()=>{profileReads++;return p[0]}})
    expect(()=>createResidenceCombatDependencies(h.deps.supply,array)).toThrow();expect(profileReads).toBe(0)
    const e=projectCombat(entered().value,h.deps).engine
    expect(()=>createProfiledCombatDependencies({...e,profile:structuredClone(e.profile)})).toThrow()
    expect(()=>createProfiledCombatDependencies({...e,extra:true} as never)).toThrow()
    expect(()=>createProfiledCombatDependencies({...e,riskAddress:{...e.riskAddress,extra:1}} as never)).toThrow()
    let calls=0
    const getter=Object.defineProperty({...e},'draw',{get:()=>{calls++;return e.draw},enumerable:true})
    expect(()=>createProfiledCombatDependencies(getter)).toThrow();expect(calls).toBe(0)
  })
})
