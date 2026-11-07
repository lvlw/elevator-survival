import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from '../test-fixtures'
import { observeBrowser } from '../../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../../app/infected-browser/schema'
import { READING_KEY } from '../../../app/infected-browser/narrative-entry/reading'
import * as receipt from '../../../state/residence-session/narrative-closure/receipt'
afterEach(()=>vi.restoreAllMocks())
const zhou = ['大厅','后勤控制间','岗亭','登记室','周衡休息室']
it('real L5 meeting is optional and readonly; no-order wording never claims a signed investigation or method',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');expect(h.host.textContent).not.toContain('与周衡交谈');await h.d.walk(zhou)
  const before=h.view(),cp=h.disk.get(CHECKPOINT_KEY);o.clear();h.setItem.mockClear();h.entropy.mockClear()
  await h.d.button('与周衡交谈');expect(h.host.querySelector('[aria-label="医院叙事"]')?.textContent).toContain('找什么')
  await h.d.button('继续交谈');expect(h.setItem).not.toHaveBeenCalled();await h.d.button('读毕')
  expect(h.owner().controls()!.getReading().marks).toContainEqual({key:'HC06',state:'read'})
  await h.d.button('谈停运');const text=h.host.querySelector('[aria-label="医院叙事"]')!.textContent!
  expect(text).toContain('为什么停了');expect(text).not.toContain('有你的名字')
  await h.d.button('略过本段');await h.d.button('后来还试过什么');await h.d.button('结束谈话')
  expect(h.owner().controls()!.getReading().marks).toContainEqual({key:'HC07',state:'skipped'})
  expect(h.owner().controls()!.getReading().marks).not.toContainEqual({key:'HC08B',state:'read'})
  expect(h.view()).toBe(before);expect(h.view().closure?.method).toBe(false);expect(h.view().narrative?.workorder).toBe(false)
  expect(h.disk.get(CHECKPOINT_KEY)).toBe(cp);expect(h.setItem.mock.calls.every(([k])=>k===READING_KEY)).toBe(true)
  expect(h.entropy).not.toHaveBeenCalled();expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,draw:0})
 }finally{await h.unmount()}
})
it('only formal workorder investigation unlocks signed-order speech and original method still commits once',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.walk(['大厅','后勤控制间']);await h.d.task('调查停用工单');await h.d.walk(['岗亭','登记室','周衡休息室'])
  await h.d.button('谈停运');expect(h.host.querySelector('[aria-label="医院叙事"]')?.textContent).toContain('有你的名字')
  await h.d.button('结束谈话');o.clear();h.setItem.mockClear();const energy=h.view().body.energy.current
  await h.d.button('核对处理办法')
  expect(h.view().closure?.method).toBe(true);expect(h.view().body.energy.current).toBeLessThan(energy)
  expect(h.host.querySelector('[aria-label="医院叙事"]')?.textContent).toContain('受力点')
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1,task:1});expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  const old=[...h.host.querySelectorAll<HTMLButtonElement>('[aria-label="医院叙事"] button')].find(b=>b.textContent==='读毕')!
  h.setItem.mockClear();await h.flush(()=>h.owner().suspend());await h.flush(()=>old.click());expect(h.setItem).not.toHaveBeenCalled()
  expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull()
 }finally{await h.unmount()}
})
it('projection defects diagnose the already committed method without replay, rejection or sidecar writes',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.walk(zhou)
  vi.spyOn(receipt,'closureReceipt').mockImplementationOnce(()=>{throw Error('TEST controlled projection failure')})
  o.clear();h.setItem.mockClear()
  const c=h.owner().controls()!,action=h.view().tasks.choices.find(a=>a.label==='取得作业方法')!
  let outcome:ReturnType<typeof c.execute>|undefined
  await h.flush(()=>{outcome=c.execute({action:action.selector})})
  expect(outcome?.kind).toBe('committed');expect(outcome?.closureDiagnostic).toBe('projection-unavailable');expect(outcome?.closure).toBeUndefined()
  expect(h.view().closure?.method).toBe(true);expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1})
  expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  o.clear();await h.flush(()=>c.retrySave());expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0})
 }finally{await h.unmount()}
})
