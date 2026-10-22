import { expect, it } from 'vitest'
import { browserFixture, setup, ready, choose, send } from './test-fixtures'
it('simulated pagehide and persisted pageshow invalidate old draft, confirmation and captured functions; reacquire is cold',async()=>{
  const h=browserFixture();await setup(h);send(h.owner,'depart','进入封锁区')
  const c=h.owner.controls()!,draft=c.beginDraft({action:choose(h.owner,'move','大厅')}),request={action:choose(h.owner,'terminal','失败止损返回')}
  const confirmation=c.execute(request);expect(confirmation.kind).toBe('confirmation-required')
  h.lifecycle.dispatchEvent(new Event('pagehide'));expect(h.owner.getSnapshot().status).toBe('suspended')
  expect(()=>c.executeDraft(draft)).toThrow();expect(()=>c.confirm(confirmation.confirmation!)).toThrow();expect(()=>c.retrySave()).toThrow()
  const event=new Event('pageshow');Object.defineProperty(event,'persisted',{value:true});h.lifecycle.dispatchEvent(event)
  expect(h.owner.controls()).toBe(null);await Promise.resolve();await Promise.resolve()
  expect((await h.owner.acquire()).status).toBe('ready');expect(ready(h.owner).location?.name).toBe('电梯前室')
  expect(()=>c.execute(request)).toThrow();h.owner.dispose();expect(h.owner.getSnapshot().status).toBe('disposed')
})
