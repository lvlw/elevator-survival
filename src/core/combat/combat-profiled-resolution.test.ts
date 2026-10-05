import { afterEach,describe,it,expect,vi } from 'vitest'
import { createCombatTestFactory } from '../residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
import { projectCombat } from '../residence-combat/projection'
import { createCombatEngineSnapshot,resolveProfiledCombatAction } from './profiled-controlled'
import * as transition from './combat-transition-plan'
import * as application from './combat-effect-reducer'
afterEach(()=>vi.restoreAllMocks())
describe('P04 P05 neutral engine checkpoint and completion ties',()=>{
  it('controlled CTB path actually builds once and applies once',()=>{
    const h=entered(), p=projectCombat(h.value,h.deps)
    const build=vi.spyOn(transition,'buildCombatTransitionPlan'),apply=vi.spyOn(application,'reduceCombatEffects')
    const r=resolveProfiledCombatAction(p.snapshot,{kind:'metal-pipe-basic-attack'},p.engine)
    expect(build).toHaveBeenCalledTimes(1);expect(apply).toHaveBeenCalledTimes(1)
    expect(r.snapshot.currentCtb).toBe(100)
    expect(()=>resolveProfiledCombatAction(p.snapshot,{kind:'defend',result:r.snapshot},p.engine)).toThrow()
  })
  it.each([false,true])('TEST same-point last hit preserves player-death priority=%s without recovery time',bleeding=>{
    const h=entered('porter'),p=projectCombat(h.value,h.deps)
    const s=createCombatEngineSnapshot({...p.snapshot,currentCtb:150,playerNextActionCtb:150,enemyNextActionCtb:150,
      enemy:{...p.snapshot.enemy,currentHealth:4},playerCondition:{...p.snapshot.playerCondition,currentHealth:1,bleeding}},p.engine)
    const r=resolveProfiledCombatAction(s,{kind:'metal-pipe-basic-attack'},p.engine)
    expect(r.snapshot.status).toBe(bleeding?'defeat':'victory')
    expect(r.snapshot.currentCtb).toBe(150);expect(r.snapshot.enemy.currentHealth).toBe(0)
    expect(r.plan.effects.some(e=>e.kind==='combat-risk-resolved')).toBe(false)
    expect(r.snapshot.enemy.resolvedActionCount).toBe(0)
  })
  it.each([false,true])('TEST escape completion wins enemy tie, then completion bleed death=%s',bleeding=>{
    const h=entered(),p=projectCombat(h.value,h.deps)
    const s=createCombatEngineSnapshot({...p.snapshot,enemyNextActionCtb:80,playerCondition:{...p.snapshot.playerCondition,
      currentHealth:1,bleeding}},p.engine)
    const r=resolveProfiledCombatAction(s,{kind:'escape'},p.engine)
    expect(r.snapshot.currentCtb).toBe(80);expect(r.snapshot.status).toBe(bleeding?'defeat':'escaped')
    expect(r.snapshot.enemy.resolvedActionCount).toBe(0)
    expect(r.plan.effects.some(e=>e.kind==='combat-risk-resolved')).toBe(false)
  })
  it('unspent defense expires at its own decision point, not permanent protection',()=>{
    const h=entered('porter'),p=projectCombat(h.value,h.deps)
    const r=resolveProfiledCombatAction(p.snapshot,{kind:'defend'},p.engine)
    expect(r.snapshot.currentCtb).toBe(80);expect(r.snapshot.temporaryDefense).toBeNull()
    expect(r.plan.effects.some(e=>e.kind==='temporary-defense-expired')).toBe(true)
  })
})
