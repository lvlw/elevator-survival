import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
afterEach(()=>vi.restoreAllMocks())
it('P06 actually displays cabinet and habits before any creation; explicit completion records only displayed content',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{
  await h.d.button('略过叙事，查看任务');await h.d.button('准备出发')
  expect(h.host.querySelector('[aria-label="补给柜"]')?.textContent).toContain('厚外套')
  expect(h.host.textContent).toContain('生前的习惯');expect(h.host.textContent).toContain('很多记忆仍然模糊')
  expect(h.entropy).not.toHaveBeenCalled();expect(h.setItem).not.toHaveBeenCalled();expect(o.counts().initial).toBe(0)
  await h.d.setup();expect(h.owner().controls()!.getReading().marks).toContainEqual({key:'P06',state:'read'})
  expect(o.counts()).toMatchObject({initial:1,dispatch:0,current:1})
 }finally{await h.unmount()}
})
it('skipped P06 can create through real choices but never becomes read',async()=>{
 const h=await mountUi()
 try{await h.d.button('略过叙事，查看任务');await h.d.button('准备出发');await h.d.button('略过准备叙事');await h.d.setup()
 expect(h.owner().controls()!.getReading().marks).toContainEqual({key:'P06',state:'skipped'})
 expect(h.owner().controls()!.getReading().marks).not.toContainEqual({key:'P06',state:'read'})
 }finally{await h.unmount()}
})
it('real ordinary search uses lightweight prose below the scene, and the next action does not mark it read',async()=>{
 const h=await mountUi()
 try{await h.d.setup('lamp');await h.d.send('进入封锁区');await h.d.move('大厅');await h.d.move('药房');await h.d.send('药房搜索',{},'lit')
 const panel=h.host.querySelector('[aria-label="当前叙事"]')!
 expect(panel.closest('.iw-stage')).toBeNull();expect(panel.getAttribute('data-light')).toBe('true')
 expect(panel.textContent).toContain('光束扫过');expect(panel.querySelectorAll('button')).toHaveLength(1)
 await h.d.move('大厅');expect(h.owner().controls()!.getReading().marks).not.toContainEqual({key:'H03',state:'read'})
 }finally{await h.unmount()}
})
it('workorder has three bounded cards, final ACK only after the displayed last card, with retired ACK inert',async()=>{
 const h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.move('大厅');await h.d.move('后勤控制间');await h.d.task('现场互动')
 const writes=h.setItem.mock.calls.length
 expect(h.host.querySelector('[aria-label="当前叙事"]')?.textContent).toContain('1 / 3')
 await h.d.button('继续');expect(h.host.querySelector('[aria-label="当前叙事"]')?.textContent).toContain('执行人：周衡')
 await h.d.button('继续');expect(h.setItem).toHaveBeenCalledTimes(writes)
 const old=[...h.host.querySelectorAll<HTMLButtonElement>('.iw-narrative button')].find(b=>b.textContent==='读毕')!
 await h.flush(()=>h.owner().suspend());await h.flush(()=>old.click())
 expect(h.setItem).toHaveBeenCalledTimes(writes);expect(h.host.querySelector('[aria-label="当前叙事"]')).toBeNull()
 }finally{await h.unmount()}
})
