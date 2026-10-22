import { afterEach, expect, it, vi } from 'vitest'
import { observeBrowser } from './test-observers'
import { browserFixture, setup, choose, send, ready } from './test-fixtures'
afterEach(()=>vi.restoreAllMocks())
it('query preview draft cancel are zero rules/current/dispatch/IO; explicit depart is one native commit',async()=>{
  const o=observeBrowser(),h=browserFixture();await setup(h);const c=h.owner.controls()!,r={action:choose(h.owner,'depart','进入封锁区')}
  const raw=o.owners.at(-1)!.getState().current;o.clear();h.getItem.mockClear();h.setItem.mockClear();h.entropy.mockClear()
  const snapshot=h.owner.getSnapshot();h.owner.getSnapshot();c.preview(r);c.beginDraft(r);c.cancel()
  expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(()=>0));expect(h.getItem).not.toHaveBeenCalled();expect(h.setItem).not.toHaveBeenCalled();expect(h.entropy).not.toHaveBeenCalled()
  expect(o.owners.at(-1)!.getState().current).toBe(raw);expect(snapshot.preplay?.view).toBe(h.owner.getSnapshot().preplay?.view)
  c.execute(r);expect(o.counts()).toMatchObject({current:1,dispatch:1,notices:1,initial:0,g1Cycle:1});expect(h.setItem).toHaveBeenCalledTimes(1)
  h.owner.dispose()
})
it('save failure / retry and cold recovery have independent zero replay counts',async()=>{
  const o=observeBrowser(),h=browserFixture();await setup(h);send(h.owner,'depart','进入封锁区');h.faults.checkpoint=true
  send(h.owner,'move','大厅');expect(ready(h.owner).persistence.feedback).toBe('save-failed');const current=o.owners.at(-1)!.getState().current
  o.clear();h.getItem.mockClear();h.setItem.mockClear();h.faults.checkpoint=false;h.owner.controls()!.retrySave()
  expect(o.owners.at(-1)!.getState().current).toBe(current);expect(o.counts()).toMatchObject({aggregate:2,encode:1,decode:0,current:0,dispatch:0,notices:0})
  for(const [k,n] of Object.entries(o.counts()))if(!['aggregate','encode'].includes(k))expect(n,k).toBe(0)
  expect(h.setItem).toHaveBeenCalledTimes(1);expect(h.getItem).not.toHaveBeenCalled()
  h.owner.dispose();await Promise.resolve();await Promise.resolve();o.clear();h.setItem.mockClear();const next=h.make();await next.acquire()
  expect(o.counts()).toMatchObject({s:1,current:1,dispatch:0,notices:0,decode:1,encode:0,initial:0,draw:0,g1Cycle:0,g1Action:0,origins:0,consume:0})
  expect(h.setItem).not.toHaveBeenCalled();next.dispose()
})
