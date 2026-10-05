import { describe,it,expect } from 'vitest'
import { createInfectedCombatDependencies } from './combat-initial'
import { createInfectedSupplyDependencies } from './initial'
describe('P01 approved three-enemy combat profile table',()=>{
  it.each([
    ['orderly',14,70,[3,7],[100,140],['laceration','bite'],['high','very-high'],['none','high']],
    ['porter',16,150,[6,3],[240,100],['contusion','laceration'],['high','high'],['none','none']],
    ['technician',16,60,[2,5],[110,180],['contusion','bite'],['medium','high'],['none','medium']],
  ] as const)('%s maps every formal L04 fact',(id,hp,first,damage,wait,wound,injury,exposure)=>{
    const d=createInfectedCombatDependencies('profile-test'), p=d.profiles.find(p=>p.definitionId==='infected-world-'+id)!
    expect(p.maxHealth).toBe(hp);expect(p.firstEnemyCtb).toBe(first)
    expect(p.actions.map(a=>a.damage)).toEqual(damage);expect(p.actions.map(a=>a.ctb)).toEqual(wait)
    expect(p.actions.map(a=>a.injuryKind)).toEqual(wound)
    expect(p.actions.map(a=>a.injuryRiskTier)).toEqual(injury)
    expect(p.actions.map(a=>a.exposureRiskTier)).toEqual(exposure)
    expect(p.reentryEnemyCtb).toBe(50);expect(p.reentryPlayerCtb).toBe(0)
    expect(p.rules.metalPipe.maxDurability).toBe(30);expect(p.rules.armorMaximum).toBe(12)
    expect(Object.isFrozen(p.actions[0])).toBe(true)
  })
  it('independent new factory does not mutate legacy default content/intent metadata',()=>{
    const before=createInfectedSupplyDependencies('profile-test')
    const old=before.catalog.enemies.get('infected-world-porter')
    createInfectedCombatDependencies('profile-test')
    expect(createInfectedSupplyDependencies('profile-test').catalog.enemies.get('infected-world-porter')).toEqual(old)
    expect(old.actions[0].playerVisible).toMatchObject({relativeSpeed:'normal',directDamageSeverity:'medium'})
  })
})
