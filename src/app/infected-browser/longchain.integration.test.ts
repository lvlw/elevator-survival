import { expect, it } from 'vitest'
import { browserFixture, setup, cold } from './test-fixtures'
import { routeA, routeB } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
it('A true read-null / initial / departure / battles / sample payment / installation / H0, cold between checkpoints',async()=>{
  const h=browserFixture();await setup(h)
  let owner=h.owner
  for(let stage=0;stage<6;stage++){
    routeA(owner,stage)
    owner.dispose();await Promise.resolve();await Promise.resolve();owner=h.make();expect((await owner.acquire()).status).toBe('ready')
  }
  expect(owner.getSnapshot().preplay?.view).toMatchObject({point:'living-hub',terminal:{result:{outcome:'success'}}});owner.dispose()
},30000)
it('B real retreat / immediate maintenance / medical / rest / reentry / stop loss or actual death with save fault and cold',async()=>{
  const h=browserFixture();await setup(h);routeB(h.owner,0)
  h.faults.checkpoint=true;routeB(h.owner,1);h.faults.checkpoint=false;h.owner.controls()!.retrySave()
  const next=await cold(h);routeB(next,2);expect(next.getSnapshot().preplay?.view).toMatchObject({status:'ready'})
  const v=next.getSnapshot().preplay!.view!;expect(v.status==='ready'&&['living-hub','dead'].includes(v.point)).toBe(true);next.dispose()
},30000)
it('A three actual enemy route uses default seeded RNG with public selections and reaches H0 success',async()=>{
  const h=browserFixture();await setup(h)
  try { for(let stage=0;stage<6;stage++)routeA(h.owner,stage,true)
    expect(h.owner.getSnapshot().preplay?.view).toMatchObject({point:'living-hub',terminal:{result:{outcome:'success'}}})
  } finally {h.owner.dispose()}
},30000)
