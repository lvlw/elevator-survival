import { afterEach, expect, it, vi } from 'vitest'
import { boundaryRecord } from './record'
import { fromValue, ready, counts } from '../../../state/residence-session/player-test-fixtures'
import { coldSaved } from '../../../state/residence-session/combat-test-fixtures'
import { mountUi } from '../test-fixtures'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../../app/infected-browser/schema'
import { observeBrowser } from '../../../app/infected-browser/test-observers'
import { publicItemName } from '../labels'
afterEach(()=>vi.restoreAllMocks())

it('safe public Preview is pure and exact; failed save/retry/cold restore never reapplies a partial merge',()=>{
  const r=boundaryRecord(),h=fromValue(r.value,r.composition.dependencies,{...r.reservation.execution,...r.reservation.choices})
  const v=ready(h.player),item=v.ground.find(i=>i.stackable && i.quantity===2)!
  const action=v.actions.find(a=>a.family==='inventory'&&a.label==='拾取')!
  const request={action:action.selector,item:item.selector,quantity:2}
  const before=h.owner.getState().current, disk=h.disk(), c=counts(h)
  const preview=h.player.preview(request)
  expect(preview).toEqual({kind:'available',cost:0,pickup:{requested:2,picked:1,merged:1,created:0,remaining:1,placements:[],limitedBy:['space']}})
  expect(JSON.stringify(preview)).not.toMatch(/instanceId|origin|ranges|plan|infection|seed|revision/)
  expect(h.player.preview({...request,item:{selection:'opaque'}}).kind).toBe('invalid-selection')
  for(const quantity of [-1,0,0.5,true,'1',Number.MAX_SAFE_INTEGER+1])expect(h.player.preview({...request,quantity}).kind).not.toBe('available')
  expect(h.owner.getState().current).toBe(before);expect(h.disk()).toBe(disk);expect(counts(h)).toEqual(c);expect(h.dispatch).not.toHaveBeenCalled()
  h.faults.write=true
  expect(h.player.execute(request).kind).toBe('committed')
  const committed=h.owner.getState().current
  expect(h.dispatch).toHaveBeenCalledTimes(1)
  expect(h.storage.write).toHaveBeenCalledTimes(c.writes+1)
  expect(h.disk()).toBe(disk)
  expect(h.player.execute(request).kind).toBe('rejected')
  h.faults.write=false;h.player.retrySave()
  expect(h.owner.getState().current).toBe(committed);expect(h.dispatch).toHaveBeenCalledTimes(1)
  const cold=coldSaved(h)
  expect(cold.owner.getState().current).toEqual(committed)
  expect(cold.storage.write).not.toHaveBeenCalled();expect(h.draw).not.toHaveBeenCalled()
  const after=ready(h.player),remaining=after.ground.find(i=>i.name===item.name&&i.quantity===1)!
  const next={action:after.actions.find(a=>a.family==='inventory'&&a.label==='拾取')!.selector,item:remaining.selector,quantity:1}
  const n=counts(h), state=h.owner.getState().current, saved=h.disk()
  expect(h.player.preview(next).pickup?.picked).toBe(0)
  expect(h.player.execute(next).kind).toBe('rejected')
  expect(counts(h)).toEqual(n);expect(h.owner.getState().current).toBe(state);expect(h.disk()).toBe(saved)
})

it('real React keeps explicit quantity, cancel purity and visible partial remainder through checkpoint failure/retry',async()=>{
  const r=boundaryRecord(),o=observeBrowser()
  const h=await mountUi('unused',false,ports=>{ports.disk.set(RESERVATION_KEY,JSON.stringify(r.reservation));ports.disk.set(CHECKPOINT_KEY,JSON.stringify(r.checkpoint))})
  try{
    const item=h.view().ground.find(i=>i.stackable&&i.quantity===2)!,label='拾取 '+publicItemName(item.name)
    o.clear();h.setItem.mockClear();const before=h.disk.get(CHECKPOINT_KEY)
    await h.d.button(label)
    expect(h.host.querySelector<HTMLInputElement>('[aria-label="数量"]')?.value).toBe('')
    expect(h.host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
    await h.d.input('数量','2')
    expect(h.host.querySelector('[aria-label="拾取数量预览"]')?.textContent).toContain('可拾取 1，另有 1 留在现场')
    expect(h.host.querySelector('[aria-label="拾取数量预览"]')?.textContent).toContain('容量限制格位')
    expect(h.host.querySelectorAll('.iw-placement button[aria-pressed="true"]')).toHaveLength(0)
    await h.d.button('取消')
    expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0});expect(h.disk.get(CHECKPOINT_KEY)).toBe(before)
    await h.d.button(label);await h.d.input('数量','2')
    h.faults.checkpoint=true
    await h.d.button('执行行动')
    expect(h.host.querySelector('[aria-label="行动参数"]')).toBeNull()
    expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1})
    expect(h.setItem.mock.calls.filter(([key])=>key===CHECKPOINT_KEY)).toHaveLength(1)
    expect(h.view().ground.filter(i=>i.name===item.name).map(i=>i.quantity)).not.toContain(2)
    expect(h.view().carried.find(i=>i.container==='backpack'&&i.name===item.name)?.quantity).toBe(2)
    expect(h.disk.get(CHECKPOINT_KEY)).toBe(before)
    const view=h.view();h.faults.checkpoint=false
    await h.flush(()=>h.owner().controls()!.retrySave())
    expect(h.view().ground).toEqual(view.ground)
    expect(o.counts().dispatch).toBe(1)
    expect(h.disk.get(CHECKPOINT_KEY)).not.toBe(before)
    await h.remount()
    expect(h.view().carried.find(i=>i.container==='backpack'&&i.name===item.name)?.quantity).toBe(2)
    expect(o.counts().dispatch).toBe(1)
  }finally{await h.unmount()}
})

it('manual invalid anchor remains editable after merge-only preview, then a legal anchor receives the remainder',async()=>{
  const r=boundaryRecord()
  const h=await mountUi('unused',false,ports=>{ports.disk.set(RESERVATION_KEY,JSON.stringify(r.reservation));ports.disk.set(CHECKPOINT_KEY,JSON.stringify(r.checkpoint))})
  try{
    const material=h.view().carried.find(i=>i.container==='backpack'&&i.name==='金属零件')!,empty=material.placement!
    const controls=h.owner().controls()!,drop=h.view().actions.find(a=>a.family==='inventory'&&a.label==='留置')
    // Arrange one genuine empty slot through the formal player command; only the
    // pickup interaction under test below is driven by React DOM.
    const selected=drop
    if(!selected)throw Error('Missing ordinary drop action')
    await h.flush(()=>{expect(controls.execute({action:selected.selector,item:material.selector}).kind).toBe('committed')})
    const item=h.view().ground.find(i=>i.stackable&&i.quantity===2)!,occupied=h.view().carried.find(i=>i.container==='backpack'&&i.name===item.name)!.placement!
    await h.d.button('拾取 '+publicItemName(item.name));await h.d.input('数量','2')
    expect(h.host.querySelector('[aria-label="拾取数量预览"]')?.textContent).toContain('新建堆叠 1 组')
    await h.d.anchor(occupied.x,occupied.y)
    expect(h.host.querySelector('[aria-label="拾取数量预览"]')?.textContent).toContain('可拾取 1')
    expect(h.host.querySelector('.iw-placement')).not.toBeNull()
    await h.d.anchor(empty.x,empty.y)
    expect(h.host.querySelector('[aria-label="拾取数量预览"]')?.textContent).toContain('可拾取 2，另有 0 留在现场')
    await h.d.button('执行行动')
    expect(h.view().carried.filter(i=>i.container==='backpack'&&i.name===item.name).reduce((s,i)=>s+i.quantity,0)).toBe(3)
  }finally{await h.unmount()}
})

