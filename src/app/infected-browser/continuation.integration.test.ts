import { afterEach, expect, it, vi } from 'vitest'
import { browserFixture, choose, ready, send } from './test-fixtures'
import { boundaryRecords } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
import { CHECKPOINT_KEY, RESERVATION_KEY } from './schema'
import { observeBrowser } from './test-observers'
afterEach(()=>vi.restoreAllMocks())
it.each(['orderly','porter','technician'] as const)('%s real P battle checkpoint cold action equals independent unrefreshed execution',async enemy=>{
  const records=boundaryRecords(enemy),a=browserFixture(),b=browserFixture()
  for(const h of [a,b]){h.disk.set(RESERVATION_KEY,records.reservation);h.disk.set(CHECKPOINT_KEY,records.checkpoint);await h.owner.acquire()}
  send(a.owner,'combat','金属管攻击')
  b.owner.suspend();await Promise.resolve();await Promise.resolve();await b.owner.acquire();send(b.owner,'combat','金属管攻击')
  expect(a.disk.get(CHECKPOINT_KEY)).toBe(b.disk.get(CHECKPOINT_KEY));expect(a.entropy).not.toHaveBeenCalled();expect(b.entropy).not.toHaveBeenCalled();a.owner.dispose();b.owner.dispose()
})
it.each(['both-zero','alive-enemy'] as const)('%s real terminal is saved/refreshed once and retains exact archived pending',async kind=>{
  const records=boundaryRecords(kind),h=browserFixture(),o=observeBrowser();h.disk.set(RESERVATION_KEY,records.reservation);h.disk.set(CHECKPOINT_KEY,records.checkpoint)
  await h.owner.acquire();send(h.owner,'combat',kind==='both-zero'?'金属管攻击':'防御');expect(ready(h.owner).point).toBe('dead')
  const final=JSON.parse(JSON.parse(h.disk.get(CHECKPOINT_KEY)!).v4Text).state
  expect(final.archives[0].site.pending).toEqual(kind==='both-zero'?{kind:'none'}:{kind:'combat-required',enemyId:'orderly'})
  expect(final.combatDeaths[0].decision.enemyHealthAfter===0).toBe(kind==='both-zero')
  expect(o.counts()).toMatchObject({dispatch:1,notices:1})
  const durable=h.disk.get(CHECKPOINT_KEY);h.owner.suspend();await Promise.resolve();await Promise.resolve();o.clear();h.setItem.mockClear();await h.owner.acquire()
  expect(ready(h.owner).point).toBe('dead');expect(h.disk.get(CHECKPOINT_KEY)).toBe(durable);expect(h.setItem).not.toHaveBeenCalled()
  expect(o.counts()).toMatchObject({draw:0,g1Cycle:0,g1Action:0,dispatch:0,terminal:0,notices:0});h.owner.dispose()
})
