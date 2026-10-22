import { expect, it, vi } from 'vitest'
import { browserFixture, setup, choose } from './test-fixtures'
import { createInfectedBrowserOwner } from './owner'
it('cooperating headless owners share one full-session lock, loser zero IO/entropy; explicit reacquire is cold',async()=>{
  const h=browserFixture();await setup(h);const other=h.make(),before=h.getItem.mock.calls.length,writes=h.setItem.mock.calls.length
  expect((await other.acquire()).status).toBe('occupied');expect(h.getItem).toHaveBeenCalledTimes(before);expect(h.setItem).toHaveBeenCalledTimes(writes);expect(h.entropy).toHaveBeenCalledTimes(1)
  const old=h.owner.controls()!,action=choose(h.owner,'depart','进入封锁区');h.owner.suspend();await Promise.resolve();await Promise.resolve()
  expect((await other.acquire()).status).toBe('ready');expect(()=>old.execute({action})).toThrow();expect(other.controls()!.execute({action}).kind).toBe('rejected')
  other.dispose();h.owner.dispose()
})
it.each(['insecure','no-lock','lock-error'] as const)('%s blocks before storage or identity',async kind=>{
  const storage=vi.fn(),entropy=vi.fn(),locks={request:vi.fn(()=>Promise.reject(new Error('TEST unsupported')))}
  const owner=createInfectedBrowserOwner({environment:()=>({secure:kind!=='insecure',locks:kind==='no-lock'?null:locks as never,storage,entropy})})
  expect((await owner.acquire()).status).toBe('unsupported');expect(storage).not.toHaveBeenCalled();expect(entropy).not.toHaveBeenCalled();owner.dispose()
})
it('repeated mount/acquire and acquisition-time callback reentry do not create another S or queue',async()=>{
  const h=browserFixture();h.owner.subscribe(()=>{if(h.owner.getSnapshot().status==='acquiring')void h.owner.acquire()})
  await Promise.all([h.owner.acquire(),h.owner.acquire(),h.owner.acquire()]);expect(h.locks.request).toHaveBeenCalledTimes(1)
  expect(h.owner.getSnapshot().status).toBe('setup');expect(h.entropy).not.toHaveBeenCalled();h.owner.dispose()
})
