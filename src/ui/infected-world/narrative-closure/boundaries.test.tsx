import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from '../test-fixtures'
import { observeBrowser } from '../../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../../app/infected-browser/schema'
import * as receipt from '../../../state/residence-session/narrative-closure/receipt'
import { closureCards, sampleReminder } from '../../../content/infected-world-v0.1/narrative-closure/content'
afterEach(()=>vi.restoreAllMocks())
const location=['大厅','后勤控制间','岗亭','登记室','周衡休息室']
it('post-commit owner loss cannot install a closure card or acknowledge a retired control; the real method/save stay once',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.walk(location)
  const owner=h.owner(),c=owner.controls()!;let lost=false
  const off=owner.subscribe(()=>{const v=owner.getSnapshot().preplay?.view;if(!lost&&v?.status==='ready'&&v.closure?.method){lost=true;owner.suspend()}})
  o.clear();h.setItem.mockClear();await h.d.button('核对处理办法');off()
  expect(lost).toBe(true);expect(o.owners.at(-1)!.getState().current!.site!.facts.some(f=>f.id==='method'&&f.value)).toBe(true)
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1});expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull()
  expect(()=>c.acknowledgeReading([{key:'HC09',state:'read'}])).toThrow()
 }finally{await h.unmount()}
})
it.each(['identity','binding','revision'] as const)('controlled %s witness defect is diagnostic after the original method submission',async fault=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.walk(location)
  const original=receipt.closureReceipt
  vi.spyOn(receipt,'closureReceipt').mockImplementationOnce((before,after,command)=>original(before,
   fault==='identity'?{...after,character:{...after.character,identity:{...after.character.identity,characterId:'TEST-other'}}}:
   fault==='revision'?{...after,character:{...after.character,revision:before.character.revision}}:
   {...after,site:{...after.site!,binding:{...after.site!.binding,execution:{...after.site!.binding.execution,runId:'TEST-other'}}}},command))
  o.clear();h.setItem.mockClear();await h.d.button('核对处理办法')
  expect(h.view().closure?.method).toBe(true);expect(h.host.textContent).toContain('行动已生效，本次叙事反馈暂不可用')
  expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull()
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1});expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
 }finally{await h.unmount()}
})
it('synthetic public DTO copy branches distinguish sample states and prioritize restored wording without adding gameplay facts',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();const v=h.view();o.clear();h.setItem.mockClear()
  for(const [sample,expected] of [['carried','样本在身上'],['left-in-world','还没带回来'],['unavailable','委托记录'],['not-acquired','还有样本']] as const){
   const input={...v,tasks:{...v.tasks,sample}}
   expect(sampleReminder(input)).toContain(expected)
  }
  const restored={...v,closure:{...v.closure!,transfer:true,componentCarried:true}}
  expect(JSON.stringify(closureCards('HC06',restored))).toContain('平台恢复了')
  expect(JSON.stringify(closureCards('HC06',restored))).not.toContain('你把它拆下来了')
  expect(JSON.stringify(closureCards('HC07',{...restored,closure:{...restored.closure,workorder:false}}))).not.toContain('有你的名字')
  expect(h.view()).toBe(v);expect(h.setItem).not.toHaveBeenCalled();expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,draw:0})
 }finally{await h.unmount()}
})
