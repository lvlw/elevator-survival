import { afterEach, expect, it, vi } from 'vitest'
import * as startup from './startup'
import * as materials from './initial-materials'
import { browserFixture, setup, ready, choose, send, cold } from './test-fixtures'
import { CHECKPOINT_KEY, RESERVATION_KEY } from './schema'
afterEach(()=>vi.restoreAllMocks())
it('real absent pair, pure setup, explicit reservation BEFORE S/provider; one initial and departure', async()=>{
  const h=browserFixture(), create=vi.spyOn(startup,'createBrowserContext'), initial=vi.spyOn(materials,'initialBrowserMaterials')
  expect(h.owner.getSnapshot().status).toBe('idle');expect(h.getItem).not.toHaveBeenCalled();expect(h.entropy).not.toHaveBeenCalled()
  await h.owner.acquire();expect(h.getItem.mock.calls).toEqual([[RESERVATION_KEY],[CHECKPOINT_KEY]])
  expect(create).not.toHaveBeenCalled();expect(initial).not.toHaveBeenCalled();expect(h.entropy).not.toHaveBeenCalled()
  h.setItem.mockImplementation((key,text)=>{if(key===RESERVATION_KEY){expect(create).not.toHaveBeenCalled();expect(initial).not.toHaveBeenCalled()}h.disk.set(key,text)})
  const controls=h.owner.controls()!;controls.confirmSetup({tool:'crow',specialty:'engineer'})
  expect(create).toHaveBeenCalledTimes(1);expect(initial).toHaveBeenCalledTimes(1);expect(h.entropy).toHaveBeenCalledTimes(1)
  expect(h.setItem.mock.calls.map(c=>c[0])).toEqual([RESERVATION_KEY,CHECKPOINT_KEY]);expect(ready(h.owner).point).toBe('first-hub')
  expect(()=>controls.confirmSetup({tool:'lamp',specialty:'scout'})).toThrow();await h.owner.acquire()
  expect(create).toHaveBeenCalledTimes(1);send(h.owner,'depart','进入封锁区');expect(ready(h.owner).point).toBe('stable-active')
  h.owner.dispose()
})
it('cold reads existing complete pair without identity generation, provider or writes; rejects old selectors',async()=>{
  const h=browserFixture();await setup(h);const old=h.owner.controls()!,action=choose(h.owner,'depart','进入封锁区')
  send(h.owner,'depart','进入封锁区');const written=h.setItem.mock.calls.length,entropy=h.entropy.mock.calls.length
  const next=await cold(h);expect(ready(next).location?.name).toBe('电梯前室')
  expect(h.setItem).toHaveBeenCalledTimes(written);expect(h.entropy).toHaveBeenCalledTimes(entropy)
  expect(()=>old.execute({action})).toThrowError(expect.objectContaining({code:'LOST_LEASE'}))
  expect(next.controls()!.execute({action}).kind).toBe('rejected');next.dispose()
})
it('read error is not absence and explicit retry reads a new pair, never a second bootstrap over current',async()=>{
  const h=browserFixture();h.faults.read=true;expect((await h.owner.acquire()).status).toBe('read-error')
  expect(h.entropy).not.toHaveBeenCalled();expect(h.setItem).not.toHaveBeenCalled()
  const prior=h.owner.controls()!;h.faults.read=false;expect(prior.retryRead().status).toBe('setup')
  expect(()=>prior.confirmSetup({tool:'crow',specialty:'engineer'})).toThrow()
  h.owner.controls()!.confirmSetup({tool:'crow',specialty:'engineer'})
  const reads=h.getItem.mock.calls.length;expect(()=>h.owner.controls()!.retryRead()).toThrow();expect(h.getItem).toHaveBeenCalledTimes(reads);h.owner.dispose()
})
