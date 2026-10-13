import {afterEach,describe,expect,it,vi} from 'vitest'
import * as entry from '../../core/residence-combat/entry'
import * as plans from '../../core/residence-combat/plans'
import * as codec from '../residence-save/combat-codec'
import * as aggregate from '../residence-save/combat-validation'
import {harness,start,current,request,reject} from './combat-test-fixtures'
import {move} from './combat-test-routes'
import {observe,record} from './combat-test-observers'
afterEach(()=>vi.restoreAllMocks())
describe('S08 issued plan complete precommit atomicity',()=>{
  it.each(['clone','json'] as const)('rejects %s issued move without a partial commit',mode=>{
    const h=harness();start(h);const original=entry.planCombatMove,o=observe(h);o.clear()
    vi.spyOn(entry,'planCombatMove').mockImplementationOnce((...args)=>{
      const plan=original(...args);return mode==='clone'?{...plan}:JSON.parse(JSON.stringify(plan))
    })
    reject(h,request(h,'move',{edgeId:'H0-H1:forward'}),'UNISSUED_PLAN')
    expect(o.counts()).toMatchObject({move:1,g1Action:1,g2Move:1,verify:1,current:0,write:0,batches:0,encode:0})
    record('atomic:unissued-'+mode,o.counts())
  })
  it('stale original issued plan cannot be reused against changed complete before',()=>{
    const h=harness();start(h);const original=entry.planCombatMove
    let saved:ReturnType<typeof original>|null=null
    vi.spyOn(entry,'planCombatMove').mockImplementationOnce((...args)=>{saved=original(...args);return saved})
    move(h,'H1');vi.spyOn(entry,'planCombatMove').mockReturnValueOnce(saved!)
    reject(h,request(h,'move',{edgeId:'H0-H1:back'}),'UNISSUED_PLAN')
  })
  it('the same facts issued under another dependency handle are not this owners plan',()=>{
    const a=harness(),b=harness();start(a);start(b);const original=entry.planCombatMove
    let saved:ReturnType<typeof original>|null=null
    vi.spyOn(entry,'planCombatMove').mockImplementationOnce((...args)=>{saved=original(...args);return saved})
    move(b,'H1');vi.spyOn(entry,'planCombatMove').mockReturnValueOnce(saved!)
    reject(a,request(a,'move',{edgeId:'H0-H1:forward'}),'UNISSUED_PLAN')
  })
  it.each(['aggregate','encoder-throw','encoder-return'] as const)('%s precommit failure never writes or notifies',stage=>{
    const h=harness();start(h);const o=observe(h);o.clear()
    if(stage==='aggregate')vi.spyOn(aggregate,'validateCombatResidenceAggregate').mockImplementationOnce(()=>{throw new TypeError('aggregate implementation')})
    if(stage==='encoder-throw')vi.spyOn(codec,'serializeCombatResidenceSave').mockImplementationOnce(()=>{throw new TypeError('encoder implementation')})
    if(stage==='encoder-return')vi.spyOn(codec,'serializeCombatResidenceSave').mockReturnValueOnce(undefined as unknown as string)
    reject(h,request(h,'move',{edgeId:'H0-H1:forward'}))
    expect(o.counts()).toMatchObject({move:1,verify:1,current:0,write:0,batches:0})
    move(h,'H1');expect(current(h).site?.nodeId).toBe('H1')
  })
  it('producer TypeError is exposed, busy releases and unchanged current can continue',()=>{
    const h=harness();start(h);const error=new TypeError('implementation bug')
    vi.spyOn(entry,'planCombatMove').mockImplementationOnce(()=>{throw error})
    const before=current(h);expect(()=>move(h,'H1')).toThrow(error);expect(current(h)).toBe(before)
    move(h,'H1');expect(current(h).site?.nodeId).toBe('H1')
  })
})
