import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from '../test-fixtures'
import { domRouteA } from '../route-test-fixtures'
import { observeBrowser } from '../../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../../app/infected-browser/schema'
import { READING_KEY } from '../../../app/infected-browser/narrative-entry/reading'
import * as receipts from '../../../state/residence-session/narrative-closure/receipt'
afterEach(()=>vi.restoreAllMocks())
it('formal sample-first install commits once, survives save failure, plays once and never replays on retry/cold restore',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();for(let stage=0;stage<=4;stage++)await domRouteA(h.d,stage)
  await h.d.walk(['隔离走廊','大厅','后勤控制间','岗亭','配线廊','转运支路柜']);await h.d.rest();await h.d.task('调查供电');await h.d.task('恢复供电')
  await h.d.walk(['配线廊','岗亭','后勤控制间','转运平台'])
  expect(h.view().tasks.sample).toBe('carried');expect(h.view().closure?.transfer).toBe(false)
  expect(h.host.querySelector('[aria-label="转运平台控制面板"]')?.getAttribute('data-restored')).toBe('false')
  expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull()
  const v=h.view(),c=h.owner().controls()!,a=v.tasks.choices.find(a=>a.label==='安装转运装置')!
  o.clear();h.setItem.mockClear();await h.flush(()=>{c.describeAction(a.selector);c.cancel()})
  expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0});expect(h.setItem).not.toHaveBeenCalled()
  h.faults.checkpoint=true;const r=vi.spyOn(receipts,'closureReceipt')
  await h.d.task('安装转运装置',undefined,{materials:['component','module','金属零件','电子元件']})
  expect(r.mock.results.some(x=>x.type==='return'&&x.value?.kind==='install')).toBe(true)
  expect(h.view().closure?.transfer).toBe(true);expect(h.view().persistence.feedback).toBe('save-failed')
  expect(h.host.querySelector('[aria-label="转运平台控制面板"]')?.getAttribute('data-restored')).toBe('true')
  expect(h.host.textContent).toContain('样本在身上');expect(h.host.textContent).toContain('操作已生效，尚未保存')
  expect(h.host.querySelector('[aria-label="医院叙事"]')?.textContent).toContain('最后一道固定件')
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1,task:1});expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  await h.d.button('继续交谈');await h.d.button('继续交谈');await h.d.button('读毕')
  expect(h.owner().controls()!.getReading().marks).toContainEqual({key:'HC19',state:'read'})
  expect(h.setItem.mock.calls.filter(([k])=>k===READING_KEY)).toHaveLength(0)
  const current=o.owners.at(-1)!.getState().current;o.clear();h.setItem.mockClear();h.faults.checkpoint=false
  await h.d.button('重试保存')
  expect(o.owners.at(-1)!.getState().current).toBe(current);expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,task:0})
  expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1);expect(h.setItem.mock.calls.filter(([k])=>k===READING_KEY)).toHaveLength(1)
  await h.remount();expect(h.view().closure?.transfer).toBe(true)
  expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull();expect(h.host.querySelector('[aria-label="转运平台控制面板"]')?.getAttribute('data-restored')).toBe('true')
  await h.d.walk(['后勤控制间','岗亭','登记室','周衡休息室']);await h.d.button('与周衡交谈')
  const text=h.host.querySelector('[aria-label="医院叙事"]')!.textContent!
  expect(text).toContain('平台恢复了');expect(text).not.toContain('你把它拆下来了')
 }finally{await h.unmount()}
},30000)
