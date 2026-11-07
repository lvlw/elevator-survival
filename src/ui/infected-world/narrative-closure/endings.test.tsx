import { afterEach, expect, it, vi } from 'vitest'
import { mountUi } from '../owner-playtest-ux/inventory-driver'
import { domRouteA } from '../route-test-fixtures'
import { observeBrowser } from '../../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../../app/infected-browser/schema'
import { createReservation } from '../../../app/infected-browser/reservation'
import { checkpointFor } from '../../../app/infected-browser/checkpoint'
import { createCombatTestFactory } from '../../../core/residence-combat/test-fixtures'
import { atDay, expectation, completeSuccess, bodyBoundary } from '../../../state/residence-save/combat-test-fixtures'
import { serializeCombatResidenceSave } from '../../../state/residence-save/combat-codec'

import * as stable from '../../../core/residence-combat/stable'
import type { CombatValue } from '../../../core/residence-combat/types'
afterEach(()=>vi.restoreAllMocks())
it('original setup and complete success bypass all Zhou dialogue, with original settlement once and no replay on cold return',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();for(let stage=0;stage<5;stage++)await domRouteA(h.d,stage)
  await domRouteA(h.d,5)
  expect(h.view().terminal.result?.outcome).toBe('success');expect(h.view().tasks.sample).toBe('delivered')
  expect(h.host.querySelector('[aria-label="医院叙事"]')?.textContent).toContain('指定样本已交付')
  expect(h.host.querySelector('[aria-label="终局摘要"]')?.textContent).toContain('委托完成')
  expect(h.owner().controls()!.getReading().marks.some(m=>m.key==='HC06')).toBe(false)
  const before=o.owners.at(-1)!.getState().current,receipt=before!.receipts.at(-1)!;expect(receipt.outcome).toBe('success');expect(receipt.steps).toEqual([])
  o.clear();h.setItem.mockClear();await h.d.button('继续交谈');await h.d.button('读毕');await h.d.button('查看本次收束');await h.d.button('结束谈话')
  expect(o.owners.at(-1)!.getState().current).toBe(before);expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,terminal:0})
  expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(0)
  await h.remount();expect(h.view().terminal.result?.outcome).toBe('success');expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull()
 }finally{await h.unmount()}
},30000)
it('voluntary withdrawal displays its own closure only after original confirmation and keeps save-failed/retry semantics',async()=>{
 const o=observeBrowser(),h=await mountUi()
 try{await h.d.setup();await h.d.send('进入封锁区');o.clear();h.setItem.mockClear()
  await h.d.button('失败止损返回');expect(document.querySelector('[aria-label="保护确认"]')?.textContent).toContain('未完成的部分')
  expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull();expect(o.counts().dispatch).toBe(0)
  h.faults.checkpoint=true;await h.d.button('确认执行')
  expect(h.view().terminal.result?.outcome).toBe('voluntary-failure');expect(h.host.querySelector('[aria-label="医院叙事"]')?.textContent).toContain('必要成果未全部达成')
  expect(h.host.textContent).toContain('操作已生效，尚未保存');expect(o.counts()).toMatchObject({dispatch:1,current:1,terminal:1,notices:1})
  expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  o.clear();h.setItem.mockClear();h.faults.checkpoint=false;await h.d.button('重试保存')
  expect(o.counts()).toMatchObject({dispatch:0,current:0,terminal:0,notices:0});expect(h.setItem.mock.calls.filter(([k])=>k===CHECKPOINT_KEY)).toHaveLength(1)
  expect(h.host.querySelector('[aria-label="医院叙事"]')).toBeNull()
 }finally{await h.unmount()}
})
it.each([false,true])('strict TEST deadline boundary, dies=%s: original cycle/result choose only the appropriate closure',async dies=>{
 const {reservation,composition}=createReservation({characterId:'closure-deadline',runId:'combat-test-execution',seed:'combat-seed',generation:'closure-day7'},{tool:'crow',specialty:'engineer'})
 const factory=createCombatTestFactory(()=>composition.dependencies),f=factory.fixture(),arrived=f.move(f.value,'H1').snapshot
 const value=atDay(factory.bodyBoundary(arrived,f.deps,dies?{condition:{...arrived.character.body.condition,currentHealth:1,bleeding:true}}:{}),f,7)
 const expected=expectation(value,f.deps,{...reservation.execution,...reservation.choices}),text=serializeCombatResidenceSave(value,expected,composition.policy)
 const o=observeBrowser(),h=await mountUi('unused',false,fixture=>{fixture.disk.set(RESERVATION_KEY,JSON.stringify(reservation));fixture.disk.set(CHECKPOINT_KEY,JSON.stringify(checkpointFor(reservation,{expected,text},composition)))})
 try{o.clear();await h.d.button('期限结算');await h.d.button('确认执行')
  expect(h.view().terminal.result?.outcome).toBe(dies?'death':'deadline-failure')
  const narrative=h.host.querySelector('[aria-label="医院叙事"]')?.textContent
  expect(narrative).toContain(dies?'这一角色的经历结束':'驻留期结束')
  if(dies){expect(narrative).not.toContain('再次看见中枢');expect(h.view().body.hp.current).toBe(0);expect(h.view().terminal.result?.penalty).toBe(0)}
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1,g1Cycle:1});expect(h.host.textContent).not.toContain('第 8 日')
 }finally{await h.unmount()}
})
it('TEST-boundary installation death keeps the actual installed history and shows death, never HC19 or a recall',async()=>{
 let before:CombatValue|null=null
 const original=stable.planCombatTask,spy=vi.spyOn(stable,'planCombatTask').mockImplementation((...args)=>{if((args[1] as {actionId?:string}).actionId==='install')before=args[0] as CombatValue;return original(...args)})
 const success=completeSuccess();spy.mockRestore();expect(before).not.toBeNull()
 const base=before as unknown as CombatValue,lethal=bodyBoundary(base,success.h.deps,{energy:1,condition:{...base.character.body.condition,currentHealth:1,bleeding:true}})
 const {reservation,composition}=createReservation({characterId:'combat-test-character',runId:'combat-test-execution',seed:'combat-seed',generation:'closure-install-death'},{tool:'toolbox',specialty:'engineer'})
 const expected=expectation(lethal,success.h.deps,{...reservation.execution,...reservation.choices}),text=serializeCombatResidenceSave(lethal,expected,composition.policy)
 const records={reservation:JSON.stringify(reservation),checkpoint:JSON.stringify(checkpointFor(reservation,{expected,text},composition))}
 const o=observeBrowser(),h=await mountUi('unused',false,fixture=>{fixture.disk.set(RESERVATION_KEY,records.reservation);fixture.disk.set(CHECKPOINT_KEY,records.checkpoint)})
 try{o.clear();await h.d.task('安装转运装置',undefined,{materials:['component','module','金属零件','电子元件']})
  expect(h.view().phase).toBe('dead');expect(h.view().closure?.transfer).toBe(true)
  expect(h.host.querySelector('[aria-label="医院叙事"]')?.textContent).toContain('这一角色的经历结束')
  expect(h.host.textContent).not.toContain('最后一道固定件');expect(h.host.querySelector('[aria-label="转运平台控制面板"]')).toBeNull()
  expect(o.counts()).toMatchObject({dispatch:1,current:1,notices:1,task:1})
 }finally{await h.unmount()}
})
