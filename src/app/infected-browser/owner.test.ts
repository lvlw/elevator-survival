import { afterEach, expect, it, vi } from 'vitest'
import { browserFixture, setup, ready } from './test-fixtures'
import { observeBrowser } from './test-observers'
import { routeA } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
import * as projection from '../../state/residence-session/player-queries'
afterEach(()=>vi.restoreAllMocks())
it('sample and terminal save failures each commit once; retry has zero task/coat/draw/terminal/day replay',async()=>{
  const o=observeBrowser(),h=browserFixture();await setup(h)
  try{
    for(let n=0;n<4;n++)routeA(h.owner,n,true)
    for(const stage of [4,5]){
      o.clear();h.setItem.mockClear();h.faults.checkpoint=true;routeA(h.owner,stage,true)
      expect(ready(h.owner).persistence.feedback).toBe('save-failed')
      if(stage===4){expect(o.counts()).toMatchObject({task:1,consume:1,draw:0,current:1,dispatch:1,notices:1});expect(h.setItem).toHaveBeenCalledTimes(1)}
      else expect(o.counts()).toMatchObject({terminal:1})
      const current=o.owners.at(-1)!.getState().current,feed=h.owner.getSnapshot().preplay!.feed
      o.clear();h.setItem.mockClear();h.faults.checkpoint=false;h.owner.controls()!.retrySave()
      expect(o.owners.at(-1)!.getState().current).toBe(current);expect(h.owner.getSnapshot().preplay!.feed).toBe(feed)
      expect(o.counts()).toMatchObject({aggregate:2,encode:1,task:0,consume:0,draw:0,current:0,dispatch:0,notices:0,terminal:0,g1Cycle:0})
      expect(h.setItem).toHaveBeenCalledTimes(1)
    }
  }finally{h.owner.dispose()}
},30000)
it('projection failure cannot authorize retry-read to replace an installed current',async()=>{
  const h=browserFixture();await setup(h);const o=observeBrowser(),spy=vi.spyOn(projection,'projectPlayerView')
  spy.mockImplementation(()=>{throw new TypeError('TEST projection failure')})
  expect(()=>h.owner.controls()!.synchronize()).toThrow('TEST projection failure')
  const reads=h.getItem.mock.calls.length;expect(()=>h.owner.controls()!.retryRead()).toThrow();expect(h.getItem).toHaveBeenCalledTimes(reads);expect(o.counts().s).toBe(0)
  spy.mockRestore();h.owner.controls()!.synchronize();expect(ready(h.owner).point).toBe('first-hub');h.owner.dispose()
})
