import { expect, it } from 'vitest'
import { browserFixture, setup, send } from './test-fixtures'
import { CHECKPOINT_KEY, RESERVATION_KEY } from './schema'
const changes = ['bad-json','checkpoint-only','reservation-only','format','version','generation','identity','choices','expected','battle','closure','payload','extra','cross-progress'] as const
it.each(changes)('cold %s blocks and preserves exact bytes, no identity/initial/save',async kind=>{
  const h=browserFixture();await setup(h);const initialExpected=JSON.parse(h.disk.get(CHECKPOINT_KEY)!).expected;send(h.owner,'depart','进入封锁区')
  h.owner.dispose();await Promise.resolve();await Promise.resolve()
  const r=JSON.parse(h.disk.get(RESERVATION_KEY)!),cp=JSON.parse(h.disk.get(CHECKPOINT_KEY)!)
  if(kind==='format')cp.format='other';if(kind==='version')cp.formatVersion=2;if(kind==='generation')cp.generation+='x'
  if(kind==='identity')cp.expected.identity.characterId+='x';if(kind==='choices')cp.expected.initial.choices.tool='lamp'
  if(kind==='expected')delete cp.expected;if(kind==='battle')cp.expected.battle={};if(kind==='closure')cp.expected.closure={}
  if(kind==='payload')cp.v4Text='{}';if(kind==='extra')cp.extra=true
  if(kind==='cross-progress')cp.expected=initialExpected
  h.disk.set(CHECKPOINT_KEY,kind==='bad-json'?'{':JSON.stringify(cp));h.disk.set(RESERVATION_KEY,JSON.stringify(r))
  if(kind==='checkpoint-only')h.disk.delete(RESERVATION_KEY);if(kind==='reservation-only')h.disk.delete(CHECKPOINT_KEY)
  const before=[...h.disk],writes=h.setItem.mock.calls.length,entropy=h.entropy.mock.calls.length,next=h.make()
  expect((await next.acquire()).status).toBe('blocked');expect([...h.disk]).toEqual(before);expect(h.setItem).toHaveBeenCalledTimes(writes);expect(h.entropy).toHaveBeenCalledTimes(entropy);next.dispose()
})
