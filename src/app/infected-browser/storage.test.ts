import { expect, it, vi } from 'vitest'
import { readBrowserPair, reserveBrowser } from './storage'
import { browserFixture, setup } from './test-fixtures'
import { RESERVATION_KEY } from './schema'
import { createInfectedBrowserOwner } from './owner'
it('storage factory lease loss performs zero reads; loss during first read prevents second',async()=>{
  const h=browserFixture(),owner=createInfectedBrowserOwner({environment:()=>({...h.environment,storage:()=>{owner.suspend();return h.storage}})})
  // Test-only injected environment reentry, not a real browser loss claim.
  await owner.acquire();expect(owner.getSnapshot().status).toBe('suspended');expect(h.getItem).not.toHaveBeenCalled();owner.dispose();h.owner.dispose()
  let active=true;const getItem=vi.fn(()=>{active=false;return null})
  expect(()=>readBrowserPair({getItem,setItem:()=>{}},()=>active)).toThrowError(expect.objectContaining({code:'LOST_LEASE'}));expect(getItem.mock.calls).toHaveLength(1)
})
it('reservation writer checks lease and permits no asynchronous / non-undefined success',async()=>{
  const h=browserFixture();await setup(h);const r=JSON.parse(h.disk.get(RESERVATION_KEY)!),setItem=vi.fn(()=>Promise.resolve())
  expect(()=>reserveBrowser({getItem:()=>null,setItem:setItem as never},r,()=>false)).toThrow();expect(setItem).not.toHaveBeenCalled()
  expect(()=>reserveBrowser({getItem:()=>null,setItem:setItem as never},r,()=>true)).toThrow();expect(setItem).toHaveBeenCalledTimes(1);h.owner.dispose()
})
