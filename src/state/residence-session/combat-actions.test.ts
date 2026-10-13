import {afterEach,describe,expect,it,vi} from 'vitest'
import {harness,current,request,reject,entered,bodyBoundary,installBoundary} from './combat-test-fixtures'
import {enter,action,win} from './combat-test-routes'
import {observe} from './combat-test-observers'
import {readCombatValue} from '../../core/residence-combat/validation'
afterEach(()=>vi.restoreAllMocks())
describe('S04 native battle commands and phase gates',()=>{
  it('last positive pipe resource pays a full charged action then exposes only the formal fallback',()=>{
    const f=entered(),id=f.value.carried.equipment.weapon!.instanceId
    // Explicit TEST-only worn resource at a legal decision point; no enemy or queue alteration.
    const before=readCombatValue({...f.value,itemStates:{states:f.value.itemStates.states.map(s=>s.instanceId===id?
      {...s,resource:{kind:'durability',current:1}}:s)}},f.deps)
    const h=installBoundary(before,f.deps);action(h,{kind:'metal-pipe-charged-strike'})
    expect(current(h).itemStates.states.find(s=>s.instanceId===id)?.resource).toMatchObject({current:0})
    expect(current(h).character.body.quotasRemaining.pipe_signature).toBe(before.character.body.quotasRemaining.pipe_signature-1)
    expect(h.owner.queryCombat()?.actions.some(a=>a.kind==='temporary-attack')).toBe(true)
    reject(h,request(h,'combat',{command:{kind:'metal-pipe-basic-attack'}}))
  })
  it.each(['orderly','porter','technician'] as const)('%s native action settles due responses then saves one complete point',enemy=>{
    const h=harness();enter(h,enemy);const before=current(h),o=observe(h);o.clear()
    action(h,{kind:'defend'});const next=current(h)
    expect(next.character.revision).toBe(before.character.revision+1);expect(next.battle?.temporaryDefense).toBeNull()
    expect(next.battle!.currentCtb).toBe(next.battle!.playerNext);expect(next.battle!.playerNext).toBeLessThanOrEqual(next.battle!.enemyNext)
    expect(o.counts()).toMatchObject({ctb:1,ctbPlan:1,ctbReduce:1,current:1,write:1,batches:1,g1Cycle:0})
  })
  it('E0 does not cancel a triggered battle and cannot escape it via stable commands',()=>{
    const f=entered(),v=bodyBoundary(f.value,f.deps,{energy:0}),h=installBoundary(v,f.deps)
    action(h,{kind:'metal-pipe-basic-attack'});expect(current(h).character.body.energy).toBe(0)
    reject(h,request(h,'rest'),'NOT_AVAILABLE');expect(current(h).battle).not.toBeNull()
  })
  it.each(['move','rest','source','task','task-transfer','inventory','medical','maintenance','terminal'])(
    'battle forbids stable %s before its producer',family=>{
      const h=harness();enter(h);const commands:Record<string,Record<string,unknown>>={
        move:{edgeId:'H4-H1:back'},source:{sourceId:'H1-search'},task:{actionId:'sample',method:'cautious',placement:{x:0,y:0,rotated:false}},
        'task-transfer':{kind:'task-drop',instanceId:'x'},inventory:{kind:'drop',instanceId:'x'},medical:{instanceId:'x'},
        maintenance:{kind:'coat',inputs:[{instanceId:'x',quantity:1}],instanceId:'x'},terminal:{kind:'withdraw'},rest:{}}
      const o=observe(h);o.clear();reject(h,request(h,family,commands[family]),'NOT_AVAILABLE')
      expect(o.counts()).toMatchObject({authority:0,current:0,write:0,batches:0,ctb:0})
    })
  it('foreign battle binding is rejected while action and revision otherwise match',()=>{
    const h=harness();enter(h);const o=observe(h);o.clear()
    reject(h,request(h,'combat',{expectedBattleId:'another-battle',command:{kind:'defend'}}),'BINDING_MISMATCH')
    expect(o.counts()).toMatchObject({authority:0,ctb:0,write:0,current:0})
  })
  it.each([{kind:'defend',damage:100},{kind:'escape',roll:0},{kind:'temporary-attack',enemyAfter:0}])(
    'cannot upload combat effects %#',command=>{const h=harness();enter(h);reject(h,request(h,'combat',{command}))})
  it('victory has one actual exit energy receipt and next stable command is available',()=>{
    const h=harness();enter(h);win(h)
    expect(current(h).battles).toHaveLength(1);expect(current(h).battles[0].outcome).toBe('victory')
    expect(current(h).character.body.energy).toBe(current(h).battles[0].energyAfter)
    expect(h.owner.queryCombat()).toBeNull()
  })
})
