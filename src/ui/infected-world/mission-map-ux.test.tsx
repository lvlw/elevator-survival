import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { domRouteA } from './route-test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
import { missionGuide } from './guidance/model'
import { mapLayer, knownGraph } from './map/projection'

afterEach(()=>vi.restoreAllMocks())
it('real early task details explain the relationship and only locate public rooms, with no dispatch/save/entropy',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try {await h.d.setup();await h.d.send('进入封锁区');const before=h.view();o.clear();h.setItem.mockClear();h.entropy.mockClear()
  await h.d.button('任务目标')
  const dialog=document.querySelector('[aria-label="任务目标"]')!
  expect(dialog.textContent).toContain('先恢复相关供电');expect(dialog.textContent).toContain('不等于转运已经恢复')
  expect(dialog.textContent).toContain('亲自带回医院电梯前室交付');expect(dialog.textContent).toContain('当前真实成果')
  expect(dialog.textContent).not.toMatch(/周衡|转运支路柜|冷藏室|检修间/)
  const locate=[...dialog.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.startsWith('在地图查看：'))!
  await h.flush(()=>locate.click());expect(document.querySelector('[aria-label="已知地图"]')).not.toBeNull()
  await h.d.button('关闭');await h.d.button('世界');await h.d.button('回当前位置')
  expect(h.view()).toBe(before);expect(h.setItem).not.toHaveBeenCalled();expect(h.entropy).not.toHaveBeenCalled()
  expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,draw:0})
 }finally{await h.unmount()}
})
it('formal sample-first production path keeps unfinished power/transport explicit, never advises a second extraction',async()=>{
 const h=await mountUi()
 try {await h.d.setup();for(let s=0;s<=4;s++)await domRouteA(h.d,s)
  expect(h.view().tasks.sample).toBe('carried');const m=missionGuide(h.view())
  expect(m.power).toBe(false);expect(m.transfer).toBe(false);expect(m.sample).toContain('待交付')
  expect(m.status).toContain('携带不等于');expect(m.clues.map(c=>c.text).join('|')).not.toContain('提取样本')
  await h.d.button('任务目标');const text=document.querySelector('.iw-mission-detail')!.textContent!
  expect(text).toContain('装接未完成');expect(text).toContain('样本已取得，但委托未完成')
  expect(text).not.toContain('当前可以交付返回')
  await h.d.button('关闭')
  await h.d.walk(['隔离走廊','大厅','后勤控制间','岗亭','配线廊','转运支路柜']);await h.d.rest()
  expect(h.view().narrative?.powerSurvey).toBe(false);expect(missionGuide(h.view()).power).toBe(false)
  await h.d.task('调查供电');expect(h.view().narrative?.powerSurvey).toBe(true);expect(missionGuide(h.view()).power).toBe(false)
  await h.d.task('恢复供电');expect(missionGuide(h.view()).power).toBe(true);expect(missionGuide(h.view()).transfer).toBe(false)
  expect(missionGuide(h.view()).clues.find(c=>c.id==='sample-held')?.text).not.toContain('还需恢复供电')
  await h.d.walk(['配线廊','岗亭','后勤控制间','转运平台']);await h.d.task('安装转运装置',undefined,{materials:['component','module','金属零件','电子元件']})
  expect(missionGuide(h.view()).transfer).toBe(true);expect(h.view().terminal.eligibility.deliver).toBe(false)
  expect(missionGuide(h.view()).clues.find(c=>c.id==='sample-held')?.target).toEqual({place:'医院',name:'电梯前室'})
  await h.d.walk(['后勤控制间','大厅','电梯前室']);expect(h.view().terminal.eligibility.deliver).toBe(true)
  expect(missionGuide(h.view()).status).toBe('当前可以交付返回。');await h.d.send('交付返回')
  expect(h.view().tasks.sample).toBe('delivered');expect(missionGuide(h.view()).ended).toBe(true);expect(missionGuide(h.view()).clues).toEqual([])

 }finally{await h.unmount()}
},30000)
it('workorder is explicitly named, reading is not investigation, and the real producer commits/saves once',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.walk(['大厅','后勤控制间'])
  expect(h.view().narrative?.workorder).toBe(false);expect(h.host.textContent).not.toContain('执行人：周衡')
  expect(missionGuide(h.view()).clues.some(c=>c.text.includes('调查停用工单'))).toBe(true)
  o.clear();h.setItem.mockClear();await h.d.task('调查停用工单')
  expect(h.view().narrative?.workorder).toBe(true);expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1})
  expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  expect(missionGuide(h.view()).workorder).toContain('主动停用')
 }finally{await h.unmount()}
})
it('actual cross-building move retains original cost/entry and switches the default local layer, never teleports to another room',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try {await h.d.setup();await h.d.send('进入封锁区');const before=h.view(),cost=before.move.options.find(a=>a.label==='酒店入口')!.cost!
  o.clear();h.setItem.mockClear();await h.d.move('酒店入口')
  expect(h.view().location).toEqual({place:'酒店',name:'酒店入口'})
  expect(h.view().body.energy.current).toBe(before.body.energy.current-cost)
  expect(h.host.querySelector('.iw-known-map')?.getAttribute('data-map-place')).toBe('酒店')
  expect(h.host.querySelector('.iw-map-canvas')?.textContent).not.toMatch(/药房|后勤控制间|电梯前室/)
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1});expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
 }finally{await h.unmount()}
})
it('public input alone drives layers and clues; inventory names, private-looking extras and reading marks cannot complete objectives',async()=>{
 const h=await mountUi()
 try {await h.d.setup();await h.d.send('进入封锁区');const v=h.view()
  const irrelevant={...v,carried:v.carried.map(i=>({...i,name:'指定样本'})),hiddenSeed:'different',infection:'secret',enemy:'hidden',readingMarks:['H07']}
  expect(missionGuide(irrelevant)).toEqual(missionGuide(v));expect(mapLayer(irrelevant.map,'医院')).toEqual(mapLayer(v.map,'医院'))
  const g=knownGraph(v.map);expect(g.places).not.toContain('供电所');expect(g.byName.has('医院 / 冷藏室')).toBe(false)
 }finally{await h.unmount()}
})
it('owner loss removes task/map selection and old positioning controls cannot execute or write',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.button('任务目标')
  const old=[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.startsWith('在地图查看：'))!
  o.clear();h.setItem.mockClear();await h.flush(()=>h.owner().suspend());await h.flush(()=>old.click())
  expect(document.querySelector('.iw-mission-detail')).toBeNull();expect(document.querySelector('[aria-label="已知地图"]')).toBeNull()
  expect(h.setItem).not.toHaveBeenCalled();expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,draw:0})
 }finally{await h.unmount()}
})

it('formal power-first route needs neither a sample nor transport completion and supplies only remaining clues',async()=>{
 const h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');await h.d.walk(['酒店入口','配线廊','转运支路柜'])
  expect(h.view().narrative?.powerSurvey).toBe(false);expect(missionGuide(h.view()).power).toBe(false)
  await h.d.task('调查供电');expect(missionGuide(h.view()).power).toBe(false)
  await h.d.task('恢复供电');const m=missionGuide(h.view())
  expect(m.power).toBe(true);expect(m.transfer).toBe(false);expect(h.view().tasks.sample).toBe('not-acquired')
  expect(m.clues.some(c=>c.id==='power')).toBe(false);expect(m.status).not.toBe('当前可以交付返回。')
 }finally{await h.unmount()}
})
