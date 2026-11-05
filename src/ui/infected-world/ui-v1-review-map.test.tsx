import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlayerReadyView } from '../../state/residence-session/player-types'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'
import { KnowledgeMap } from './components/knowledge-map'
import { knownGraph } from './map/projection'
afterEach(()=>{vi.restoreAllMocks();document.body.replaceChildren()})
type MapView=PlayerReadyView['map']
const a={place:'测试甲区',name:'同名',current:true,visited:true},b={place:'测试乙区',name:'同名',current:false,visited:false},c={place:'测试乙区',name:'出口',current:false,visited:true}
const route=(from:string,to:string,passable:MapView['routes'][number]['passable']=true,observation:MapView['routes'][number]['observation']='current')=>({from,to,passable,observation})
const ab=route('测试甲区 / 同名','测试乙区 / 同名')
async function renderer(compact:boolean){
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 return {host,render:async(map:MapView)=>{await act(async()=>root.render(<KnowledgeMap map={map} compact={compact}/>))},click:async(index:number,key?:string)=>{await act(async()=>host.querySelectorAll('.iw-map-node')[index]!.dispatchEvent(key?new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}):new MouseEvent('click',{bubbles:true})))},button:async(name:string)=>{const el=[...host.querySelectorAll('button')].find(b=>b.textContent===name)!;await act(async()=>el.click())},close:async()=>{await act(async()=>root.unmount());host.remove()}}
}
describe.each([true,false])('R1 ambiguity and directed facts under two layers compact=%s (synthetic projection, not screenshots)',compact=>{
 it('ambiguous full names and missing endpoints emit no guessed edge, preserving all route text/state',async()=>{
  const r=await renderer(compact),map:MapView={nodes:[a,{...a,current:false,visited:false},b,c],routes:[ab,route(ab.to,ab.from,false,'last-observed'),route('不存在 / 入口',ab.to,'unknown','last-observed'),route(ab.to,'不存在 / 出口'),route(ab.to,'测试乙区 / 出口'),route('测试乙区 / 出口',ab.to,false,'last-observed')]}
  try{await r.render(map);expect(knownGraph(map).resolved.map(r=>r.index)).toEqual([4,5]);expect(r.host.querySelectorAll('[data-map-route]')).toHaveLength(0);expect(r.host.querySelectorAll('.iw-map-node')).toHaveLength(2)
   expect([...r.host.querySelectorAll('.iw-map-routes li')].map(e=>e.textContent)).toEqual(map.routes.map(e=>`${e.from} → ${e.to}${e.passable==='unknown'?'通行未知':e.passable?'已知可通行':'已知受阻'} · ${e.observation==='current'?'当前观察':'上次观察'}`))
   await r.click(1);expect(r.host.querySelector('.iw-map-selection')).toBeNull();await r.click(0,'Enter');expect(r.host.querySelector('.iw-map-selection')).toBeNull()
   await r.button('世界');await act(async()=>r.host.querySelector<SVGGElement>('[aria-label="查看测试乙区内部"]')!.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect([...r.host.querySelectorAll('[data-map-route]')].map(e=>Number(e.getAttribute('data-map-route')))).toEqual([4,5]);expect(r.host.querySelectorAll('[data-map-channel]')).toHaveLength(1)
  }finally{await r.close()}
 })
 it('same short names stay distinct; cycles/reverse/unknown/old observations survive merged world links and local routes',async()=>{
  const r=await renderer(compact),map:MapView={nodes:[a,b,c],routes:[ab,route(ab.to,'测试乙区 / 出口','unknown','last-observed'),route('测试乙区 / 出口',ab.from),route(ab.to,ab.from,false,'last-observed')]}
  try{await r.render(map);expect(knownGraph(map).resolved.map(e=>[String(e.passable),e.observation])).toEqual(map.routes.map(e=>[String(e.passable),e.observation]))
   await r.button('世界');expect(r.host.querySelectorAll('[data-map-channel]')).toHaveLength(1);expect(r.host.querySelectorAll('[data-map-route]')).toHaveLength(3)
   expect(r.host.querySelector('[data-map-channel]')?.getAttribute('marker-start')).not.toBeNull();expect(r.host.querySelector('[data-map-channel]')?.getAttribute('marker-end')).not.toBeNull()
   await act(async()=>r.host.querySelector<SVGGElement>('[aria-label="查看测试乙区内部"]')!.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(r.host.querySelectorAll('[data-map-route]')).toHaveLength(1);await r.click(0,' ')
   expect(r.host.querySelector('.iw-map-selection')?.textContent).toContain('测试乙区 / 同名 · 已知未到达');expect(r.host.querySelector('.iw-map-selection')?.textContent).not.toContain('测试甲区 / 同名 · 当前位置')
  }finally{await r.close()}
 })
 it('unique selection becomes ambiguous or absent immediately and never reopens when names survive later',async()=>{
  const r=await renderer(compact)
  try{await r.render({nodes:[a,b],routes:[ab]});await r.click(0,'Enter');expect(r.host.querySelector('.iw-map-selection')?.textContent).toContain('当前位置')
   await r.render({nodes:[a,{...a,current:false},b],routes:[ab]});expect(r.host.querySelector('.iw-map-selection')).toBeNull()
   await r.render({nodes:[a,b],routes:[ab]});expect(r.host.querySelector('.iw-map-selection')).toBeNull();await r.click(0);expect(r.host.querySelector('.iw-map-selection')).not.toBeNull()
   await r.render({nodes:[b],routes:[ab]});expect(r.host.querySelector('.iw-map-selection')).toBeNull();await r.render({nodes:[a,b],routes:[ab]});expect(r.host.querySelector('.iw-map-selection')).toBeNull()
  }finally{await r.close()}
 })
 it('reading synthetic boundaries beside a real owner, switching layers and viewing records have zero side effects',async()=>{
  const o=observeBrowser(),h=await mountUi(),r=await renderer(compact)
  try{await h.d.setup();await h.d.send('进入封锁区');const before=h.view();o.clear();h.setItem.mockClear()
   await r.render({nodes:[a,{...a,current:false},b],routes:[ab,route('缺失 / 入口',ab.from)]});await r.click(1);await r.button('世界');await r.click(1,'Enter')
   await act(async()=>r.host.querySelector('summary')!.click());expect(r.host.querySelectorAll('.iw-map-routes li')).toHaveLength(2)
   expect(h.view()).toBe(before);expect(h.setItem).not.toHaveBeenCalled();expect(o.counts()).toMatchObject({dispatch:0,current:0,notices:0,draw:0})
  }finally{await r.close();await h.unmount()}
 })
})
