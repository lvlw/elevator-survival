import { afterEach, expect, it, vi } from 'vitest'
import * as initial from './initial-materials'
import * as core from '../../core/residence-combat/controlled'
import { browserFixture, setup, ready, send, choose, cold } from './test-fixtures'
import { CHECKPOINT_KEY, RESERVATION_KEY } from './schema'
afterEach(()=>vi.restoreAllMocks())
it('reservation failure is zero provider/S/checkpoint; ambiguous partial record is never reissued',async()=>{
  const h=browserFixture(),provider=vi.spyOn(initial,'initialBrowserMaterials');h.faults.reservation=true
  await h.owner.acquire();expect(h.owner.controls()!.confirmSetup({tool:'crow',specialty:'engineer'}).status).toBe('reservation-failed')
  expect(provider).not.toHaveBeenCalled();expect(h.setItem.mock.calls.map(c=>c[0])).toEqual([RESERVATION_KEY]);expect(h.disk.size).toBe(0)
  expect(()=>h.owner.controls()!.confirmSetup({tool:'crow',specialty:'engineer'})).toThrow();h.owner.dispose()
})
it('a partial initialization attempt cannot obtain fresh identity by retry-reading an empty pair',async()=>{
  const h=browserFixture();h.faults.reservation=true;await h.owner.acquire();h.owner.controls()!.confirmSetup({tool:'crow',specialty:'engineer'})
  h.faults.reservation=false;expect(h.owner.controls()!.retryRead().status).toBe('blocked')
  expect(()=>h.owner.controls()!.confirmSetup({tool:'crow',specialty:'engineer'})).toThrow();expect(h.entropy).toHaveBeenCalledTimes(1);h.owner.dispose()
})
it('first checkpoint fails after true initial; retry saves without provider/regrant/notice and orphan refresh blocks',async()=>{
  const h=browserFixture(),provider=vi.spyOn(initial,'initialBrowserMaterials');h.faults.checkpoint=true;await setup(h)
  expect(provider).toHaveBeenCalledTimes(1);expect(ready(h.owner).persistence.feedback).toBe('save-failed')
  expect(h.disk.has(RESERVATION_KEY)).toBe(true);expect(h.disk.has(CHECKPOINT_KEY)).toBe(false)
  const c=h.owner.controls()!,draft=c.beginDraft({action:choose(h.owner,'depart','进入封锁区')})
  h.faults.checkpoint=false;c.retrySave();expect(provider).toHaveBeenCalledTimes(1);expect(ready(h.owner).persistence.feedback).toBe('saved')
  expect(c.executeDraft(draft).kind).toBe('committed');h.owner.dispose()
  const orphan=browserFixture();orphan.faults.checkpoint=true;await setup(orphan);orphan.owner.dispose();await Promise.resolve();await Promise.resolve()
  const next=orphan.make();expect((await next.acquire()).status).toBe('blocked');expect(orphan.entropy).toHaveBeenCalledTimes(1);next.dispose()
})
it('newer unsaved memory can continue; retry writes newest full checkpoint; refresh restores only last durable',async()=>{
  const h=browserFixture();await setup(h);send(h.owner,'depart','进入封锁区')
  const durable=h.disk.get(CHECKPOINT_KEY)!;h.faults.checkpoint=true
  send(h.owner,'move','大厅');expect(ready(h.owner).location?.name).toBe('大厅')
  send(h.owner,'move','保安室');expect(ready(h.owner).location?.name).toBe('保安室')
  expect(h.disk.get(CHECKPOINT_KEY)).toBe(durable)
  const afterMoves=h.setItem.mock.calls.length;h.faults.checkpoint=false;h.owner.controls()!.retrySave()
  expect(h.setItem).toHaveBeenCalledTimes(afterMoves+1)
  expect(JSON.parse(h.disk.get(CHECKPOINT_KEY)!).expected.revision).toBe(JSON.parse(durable).expected.revision+2)
  const next=await cold(h);expect(ready(next).location?.name).toBe('保安室');next.dispose()
  const lost=browserFixture();await setup(lost);send(lost.owner,'depart','进入封锁区');lost.faults.checkpoint=true;send(lost.owner,'move','大厅')
  const restored=await cold(lost);expect(ready(restored).location?.name).toBe('电梯前室');restored.dispose()
})
it('lease lost during busy publication prevents producer even though execute had already entered controller',async()=>{
  const h=browserFixture();await setup(h);const c=h.owner.controls()!,request={action:choose(h.owner,'depart','进入封锁区')},writes=h.setItem.mock.calls.length
  const off=h.owner.subscribe(()=>{if(h.owner.getSnapshot().preplay?.status==='busy')h.owner.suspend()})
  expect(()=>c.execute(request)).toThrowError(expect.objectContaining({code:'LOST_LEASE'}))
  expect(h.setItem).toHaveBeenCalledTimes(writes);expect(JSON.parse(h.disk.get(CHECKPOINT_KEY)!).expected.phase).toBe('first-hub');off();h.owner.dispose()
})
