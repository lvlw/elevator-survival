import {afterEach,describe,expect,it,vi} from 'vitest'
import * as entry from '../../core/residence-combat/entry'
import * as authority from '../../core/residence-combat/authority'
import * as plans from '../../core/residence-combat/plans'
import * as codec from '../residence-save/combat-codec'
import * as aggregate from '../residence-save/combat-validation'
import {harness,start,fixture,coldRecord,current,request} from './combat-test-fixtures'
import {move} from './combat-test-routes'
afterEach(()=>vi.restoreAllMocks())
function blocked(h:ReturnType<typeof harness>) {
  const attempts=[()=>h.owner.dispatch({}),()=>h.owner.createFirst(),()=>h.owner.bootstrap(),()=>h.owner.retryRead(),()=>h.owner.retrySave()]
  for(const run of attempts)expect(run).toThrowError(expect.objectContaining({code:'BUSY'}))
}
describe('S10 busy callback boundaries and immutable notifications',()=>{
  it.each(['read','initial','cold','authority','producer','verify','aggregate','encode','write','notify','retry-aggregate','retry-write'] as const)(
    '%s rejects every recursive write method and releases busy',point=>{
      const h=point==='cold'?(()=>{const f=fixture();return coldRecord(f.initial,f.deps)})():harness(),callback=vi.fn(()=>blocked(h))
      if(point==='read')h.hooks.read=callback
      if(point==='initial')h.hooks.initial=callback
      if(point==='cold')h.hooks.cold=callback
      if(['read','initial','cold'].includes(point)){
        h.owner.bootstrap();if(point!=='cold')h.owner.createFirst()
      }else{
        start(h)
        if(point==='write'||point==='retry-write')h.hooks.write=callback
        if(point==='notify')h.owner.subscribe(callback)
        if(point==='producer'){const original=entry.planCombatMove;vi.spyOn(entry,'planCombatMove').mockImplementationOnce((...a)=>{callback();return original(...a)})}
        if(point==='authority'){const original=authority.createCombatAuthority;vi.spyOn(authority,'createCombatAuthority').mockImplementationOnce((...a)=>{callback();return original(...a)})}
        if(point==='verify'){const original=plans.assertCombatPlanCurrent;vi.spyOn(plans,'assertCombatPlanCurrent').mockImplementationOnce((...a)=>{callback();return original(...a)})}
        if(point==='aggregate'||point==='retry-aggregate'){const original=aggregate.validateCombatResidenceAggregate;vi.spyOn(aggregate,'validateCombatResidenceAggregate').mockImplementationOnce((...a)=>{callback();return original(...a)})}
        if(point==='encode'){const original=codec.serializeCombatResidenceSave;vi.spyOn(codec,'serializeCombatResidenceSave').mockImplementationOnce((...a)=>{callback();return original(...a)})}
        if(point.startsWith('retry'))h.owner.retrySave();else move(h,'H1')
      }
      expect(callback).toHaveBeenCalled();expect(h.owner.getState().status).toBe('ready')
      expect(()=>h.owner.retrySave()).not.toThrow()
    })
  it('all listeners receive one same deeply readonly complete snapshot even when one throws',()=>{
    const h=harness();start(h);const seen:unknown[]=[]
    h.owner.subscribe(v=>{seen.push(v);expect(()=>{(v.current!.character.body as {energy:number}).energy=0}).toThrow();throw new Error('listener')})
    h.owner.subscribe(v=>{seen.push(v);expect(v.current?.site?.nodeId).toBe('H1')})
    const result=move(h,'H1');expect(result.notificationErrors).toHaveLength(1)
    expect(seen[0]).toBe(seen[1]);expect((seen[0] as {current:unknown}).current).toBe(current(h))
  })
  it('material thenable is rejected without mutation and callback implementation errors remain visible',()=>{
    const h=harness();h.owner.bootstrap();h.factory.mockReturnValueOnce(Promise.resolve(h.materials))
    expect(h.owner.createFirst).toThrow();expect(h.owner.getState().current).toBeNull();expect(h.storage.write).not.toHaveBeenCalled()
    const error=new TypeError('factory implementation');h.factory.mockImplementationOnce(()=>{throw error})
    expect(h.owner.createFirst).toThrow(error);expect(()=>h.owner.createFirst()).not.toThrow()
  })
})
