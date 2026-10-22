// TEST ONLY. Every action below is a real React control / DOM event, not an owner command.
import type { PlayerReadyView } from '../../state/residence-session/player-types'
import { currentActions } from './interaction'
import { actionName } from './labels'

export type UiDriverOptions = { document: Document; getView(): PlayerReadyView;
  flush(action: () => void): Promise<void>; onStep?(label: string, view: PlayerReadyView): void }
type Fields = { item?: string; targetItem?: string; quantity?: number; slot?: number; wound?: number;
  target?: string; placement?: readonly [number, number]; materials?: readonly string[]; allocation?: readonly [string, number][] }
export function createUiDriver(options: UiDriverOptions) {
  const doc = options.document, view = options.getView
  function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error('DOM_TEST_ASSERTION: '+message) }
  const buttons = () => [...doc.querySelectorAll<HTMLButtonElement>('button')]
  async function button(label: string) {
    const b = buttons().find(b => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === label && !b.disabled) ??
      buttons().find(b => b.textContent?.trim().startsWith(label+'资源 ') && !b.disabled)
    assert(b, 'button '+label+'; visible='+buttons().map(b=>b.getAttribute('aria-label')??b.textContent?.trim()).join('|'))
    await options.flush(() => b.click())
  }
  async function select(label: string, text: string) {
    const s = doc.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)
    assert(s, 'select '+label)
    const o = [...s.options].find(o => o.text === text || o.text.startsWith(text+' ×') || o.text.startsWith(text+' ·'))
    assert(o, 'option '+label+'/'+text)
    await options.flush(() => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(s, o.value); s.dispatchEvent(new Event('change', { bubbles: true })) })
  }
  async function input(label: string, value: string) {
    const i = doc.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
    assert(i, 'input '+label)
    await options.flush(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(i, value); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })) })
  }
  async function anchor(x: number, y: number, name?: string) {
    const field = name ? [...doc.querySelectorAll('fieldset')].find(f => f.querySelector('legend')?.textContent?.startsWith(name)) : doc.querySelector('.iw-placement')
    const b = field?.querySelector<HTMLButtonElement>(`button[aria-label^="锚点 ${x + 1},${y + 1}"]`)
    assert(b, 'placement '+x+','+y+'/'+name); await options.flush(() => b.click())
  }
  async function confirm() { if (doc.querySelector('[aria-label="保护确认"]')) await button('确认执行') }
  async function fields(f: Fields) {
    if (f.item) await select('物品', f.item)
    if (f.targetItem) await select('目标堆叠', f.targetItem)
    if (f.quantity !== undefined) await input('数量', String(f.quantity))
    if (f.slot !== undefined) await select('快捷位', '快捷位'+(f.slot+1))
    if (f.target) await select('处理目标', f.target)
    if (f.wound !== undefined) await select('伤口', '伤口'+f.wound)
    for (const name of f.materials ?? []) await input(name+'来源1用量', '1')
    for (const [name, amount] of f.allocation ?? []) await input(name+'分配', String(amount))
    if (f.placement) await anchor(...f.placement)
  }
  async function send(label: string, f: Fields = {}, method?: string) {
    const a = currentActions(view()).find(a => a.label === label && (method === undefined || a.method === method))
    assert(a, 'public action '+label+'/'+method)
    if (a.family === 'medical' || a.family === 'maintenance') {
      if (!doc.querySelector('[aria-label="药食与维护"]')) await button('药食与维护')
    }
    if (a.family === 'move') {
      const b = [...doc.querySelectorAll<HTMLButtonElement>('.iw-travel button')].find(b => b.textContent?.includes(a.label))
      assert(b, 'travel control '+a.label); await options.flush(() => b.click())
    } else await button(actionName(a))
    if (doc.querySelector('[aria-label="行动参数"]')) { await fields(f); await button('执行行动') }
    await confirm(); options.onStep?.(label, view())
  }
  async function menu(name: string, label: string, f: Fields = {}, ordinal = 0) {
    await button('背包')
    const list = [...doc.querySelectorAll<HTMLButtonElement>('[aria-label="背包格位"] .iw-item')].filter(b => b.getAttribute('aria-label')?.startsWith(name+' ' ) || b.getAttribute('aria-label')?.startsWith(name+' ·') || b.getAttribute('aria-label')?.startsWith(name+' ×'))
    const b = list[ordinal]; assert(b, 'backpack menu '+name+'/'+ordinal)
    await options.flush(() => b.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 })))
    await button(label); await fields(f); await button('执行行动'); await confirm(); options.onStep?.(label+' '+name, view())
  }
  async function pick(name: string, x: number, y=0) {
    const priorAnchors = view().carried.filter(i => i.container === 'backpack').map(i => `${i.placement!.x},${i.placement!.y}`)
    const i = view().ground.find(i => i.name === name); assert(i, 'ground '+name)
    await button((i.ordinary ? '拾取 ' : '拾取任务物 ')+name)
    if (doc.querySelector('[aria-label="行动参数"]')) { await anchor(x,y); await button('执行行动'); await confirm() }
    if (i.ordinary) {
      const same = view().carried.filter(i => i.container === 'backpack' && i.name === name)
      // Whole-instance pickup never moves existing items. Locate its new public anchor,
      // not hidden IDs, scope-bound handles, or an assumed canonical sort order.
      const ordinal = same.findIndex(i => !priorAnchors.includes(`${i.placement!.x},${i.placement!.y}`)); assert(ordinal >= 0, 'real acquired instance')
      await menu(name, '移动物品', { placement: [x,y] }, ordinal)
    }
    options.onStep?.('拾取 '+name, view())
  }
  async function medical(name: string) {
    const v = view(), i = v.carried.find(i => i.name === name && ['backpack','quick'].includes(i.container))
    if (!i || name === '绷带' && v.body.hp.current === v.body.hp.maximum && !v.body.bleeding && !v.body.wounds.some(w => w.treatment === 'untreated') || name === '压缩口粮' && v.body.satiety.current === v.body.satiety.maximum) return false
    const w = v.body.wounds.find(w => w.treatment === 'untreated')
    await send('使用药食', { item: name, ...(name === '绷带' && w ? { wound: w.ordinal } : {}) }); return true
  }
  async function rest() { await send('原位休整'); await medical('压缩口粮') }
  async function paid(label: string, f: Fields = {}, method?: string) {
    if (view().body.energy.current === 0) { await medical('绷带'); await rest() }
    await send(label,f,method)
  }
  async function move(name: string) { await paid(name) }
  async function walk(names: readonly string[]) { for (const n of names) await move(n) }
  async function task(label: string, method?: string, f: Fields = {}) {
    await paid(label, { ...(['crow','toolbox','lit'].includes(method ?? '') ? { item: view().carried.find(i => i.container === 'utility')!.name } : {}), ...f }, method)
  }
  async function fight() {
    for (let turn=0;turn<24;turn++) {
      const v=view(); if (!v.combat) return
      const a=(v.body.bleeding ? v.combat.actions.find(a=>a.label.startsWith('使用快捷物品')) : null) ?? v.combat.actions.find(a=>a.label==='蓄力打击') ?? v.combat.actions.find(a=>a.label==='金属管攻击') ?? v.combat.actions.find(a=>a.label==='临时攻击')
      assert(a,'bounded public combat action');await send(a.label)
      if(view().phase==='dead') return
    }
    throw new Error('DOM_TEST_ASSERTION: bounded strategy exhausted')
  }
  async function setup(tool='crow',specialty='engineer') {
    for (const [name,value] of [['tool',tool],['specialty',specialty]]) {
      const radio=doc.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);assert(radio,'setup radio')
      await options.flush(()=>radio.click())
    }
    await button('确认创建')
  }
  return {view,button,select,input,anchor,confirm,fields,send,menu,pick,medical,rest,paid,move,walk,task,fight,setup}
}
export type UiDriver = ReturnType<typeof createUiDriver>

export async function domRouteA(d: UiDriver, stage: number) {
  if(stage===0){await d.send('进入封锁区');await d.move('大厅');await d.task('大厅搜索','dark');await d.pick('金属零件',4);await d.task('隔离防火门','crow');await d.move('隔离走廊')}
  if(stage===1){await d.fight();await d.walk(['大厅','后勤控制间','岗亭','登记室']);await d.task('开启物流柜','crow');await d.task('物流柜物资');await d.pick('压缩口粮',4,1);await d.pick('绷带',5,1);await d.rest();await d.move('装卸场')}
  if(stage===2){await d.fight();await d.medical('绷带');await d.medical('绷带');await d.task('物流装卸区搜索');const n=d.view().ground.filter(i=>i.name==='压缩口粮').length;for(let i=0;i<n;i++)await d.pick('压缩口粮',i===0?5:3,1);await d.task('核对转运记录','full');await d.task('修复转运组件','manual');await d.task('取得转运组件',undefined,{placement:[0,0]});await d.walk(['登记室','岗亭','入口','档案室']);await d.task('比对通信记录','fast');await d.move('检修间');await d.task('通信设备柜','crow');await d.pick('电子元件',5);await d.rest();await d.move('档案室');await d.task('开启通信门');await d.move('检修走廊')}
  if(stage===3){await d.fight();await d.medical('绷带');await d.move('机房');await d.task('取得通信模块',undefined,{placement:[2,0]});await d.walk(['检修走廊','档案室','入口','电梯前室','大厅','隔离走廊','冷藏室'])}
  if(stage===4)await d.task('提取样本','cautious',{placement:[0,2]})
  if(stage===5){await d.walk(['隔离走廊','大厅','后勤控制间','岗亭','配线廊','转运支路柜']);await d.rest();await d.task('调查供电');await d.task('恢复供电');await d.walk(['配线廊','岗亭','后勤控制间','转运平台']);await d.task('安装转运装置',undefined,{materials:['component','module','金属零件','电子元件']});await d.walk(['后勤控制间','大厅','电梯前室']);await d.send('交付返回')}
  return d.view()
}
export async function domRouteB(d: UiDriver, stage: number) {
  if(stage===0)await domRouteA(d,0)
  if(stage===1){await d.send('金属管攻击');await d.send('蓄力打击');await d.send('退却');await d.paid('机械维护',{materials:['金属零件'],allocation:[['金属管',15]]});await d.medical('绷带');await d.rest()}
  if(stage===2){await d.move('隔离走廊');await d.fight();if(d.view().phase==='active-world'){await d.walk(['大厅','电梯前室']);await d.send('失败止损返回')}}
  return d.view()
}
