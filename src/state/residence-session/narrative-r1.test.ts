import { afterEach, expect, it, vi } from 'vitest'
import { fixture, coldRecord } from './combat-test-fixtures'
import { drawIntInclusive } from '../../core/random'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'
import { createPreplayController } from '../../app/infected-preplay/controller'
import { choose, playerItem } from './player-test-fixtures'
import * as receipts from './narrative-entry/receipt'
import { browserFixture, setup, send, ready } from '../../app/infected-browser/test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
afterEach(()=>vi.restoreAllMocks())
it('real atomic hotel producer through facade/controller consumes and saves once, without search receipt or Feed',()=>{
 const f=fixture({draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:min})})
 let v=f.move(f.value,'H1').snapshot;v=f.move(v,'H2').snapshot;v=f.source(v,'H2-search',{method:'dark'}).snapshot
 for(const [n,item] of v.site!.ground.find(g=>g.nodeId==='H2')!.items.entries())v=f.inventory(v,'pickup',{instanceId:item.instanceId,placement:{x:n,y:0,rotated:false}}).snapshot
 for(const node of ['H1','H0','T0','T1'])v=f.move(v,node).snapshot
 const h=coldRecord(v,f.deps),dispatch=vi.fn(h.owner.dispatch)
 const facade=wrapPlayerSession(Object.freeze({...h.owner,dispatch}),h.policy,infectedWorldPlayerLabels)
 const controller=createPreplayController(facade);controller.bootstrap()
 const input={action:choose(facade.player,'source','酒店交换'),materials:['绷带','消毒剂'].map(name=>({item:playerItem(facade.player,name,'backpack').selector,quantity:1})),placements:[{x:0,y:0,rotated:false}]}
 h.storage.write.mockClear();h.listener.mockClear()
 const result=controller.execute(input)
 expect(result.kind).toBe('committed');expect(result.exploration).toBeUndefined()
 expect(result.snapshot.feed.map(e=>e.text).join('|')).not.toContain('搜索完成')
 expect(playerItem(facade.player,'压缩口粮','backpack').quantity).toBe(2)
 expect(facade.player.query().status).toBe('ready')
 expect(dispatch).toHaveBeenCalledTimes(1);expect(h.storage.write).toHaveBeenCalledTimes(1);expect(h.listener).toHaveBeenCalledTimes(1)
 expect(controller.execute(input).kind).toBe('rejected');expect(h.storage.write).toHaveBeenCalledTimes(1)
})
it.each(['binding','site','resource','tool-binding'] as const)('controlled %s receipt witness fault is diagnostic after the one real committed search',async fault=>{
 const o=observeBrowser(),h=browserFixture();await setup(h,'lamp')
 try{
  send(h.owner,'depart','进入封锁区');send(h.owner,'move','大厅');send(h.owner,'move','药房')
  const real=receipts.explorationReceipt
  vi.spyOn(receipts,'explorationReceipt').mockImplementationOnce((before,after,command,...extra)=>{
   const projected = fault==='binding' ? {...after,character:{...after.character,identity:{...after.character.identity,characterId:'TEST-wrong-binding'}}} : fault==='site' ? {...after,site:null} : fault==='resource' ? {...after,itemStates:{states:[]}} : after
   const bound = fault==='tool-binding' && command.kind==='source' ? {...command,command:{...command.command,toolInstanceId:undefined}} : command
   return real(before,projected,bound,...extra)
  })
  o.clear();h.setItem.mockClear()
  const tool=ready(h.owner).carried.find(i=>i.container==='utility')!
  const result=send(h.owner,'source','药房搜索',{item:tool.selector},'lit')
  expect(result.kind).toBe('committed');expect(result.exploration).toBeUndefined()
  expect(result.explorationDiagnostic).toBe('projection-unavailable')
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1,source:1})
  expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  expect(ready(h.owner).sources.find(s=>s.label==='药房搜索')?.completed).toBe(true)
  const committed=o.owners.at(-1)!.getState().current
  o.clear();h.owner.controls()!.retrySave()
  expect(o.owners.at(-1)!.getState().current).toBe(committed);expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,source:0})
 }finally{h.owner.dispose()}
})
