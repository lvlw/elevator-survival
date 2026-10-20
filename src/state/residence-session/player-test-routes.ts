// TEST ONLY. Every decision reads player fields and submits opaque references.
import { expect } from 'vitest'
import { drawIntInclusive } from '../../core/random'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { initialMaterials } from './supply-test-fixtures'
import { playerHarness, ready, choose, send, playerItem, begin, counts, type PlayerHarness } from './player-test-fixtures'
import type { PlayerRequest } from './player-types'

export function nativePlayer(seed = 'E03-A-seed-01', tool: 'crow' | 'lamp' | 'toolbox' = 'crow') {
  const deps = createInfectedCombatDependencies('E03-A-character'), materials = initialMaterials(deps.supply, tool, 'engineer')
  materials.execution.runId = 'E03-A-execution'; materials.execution.seed = seed
  return playerHarness({ dependencies: deps, materials, draw: drawIntInclusive, tool })
}
export function publicRoute(h: PlayerHarness) {
  const p = h.player, ledger: { label: string; point: string; hp: number }[] = []
  const sendOne = (family: string, label: string, fields: Omit<PlayerRequest, 'action'> = {}, method?: string) => {
    const before = counts(h), d = h.dispatch.mock.calls.length
    send(p, family, label, fields, method)
    expect(h.dispatch).toHaveBeenCalledTimes(d + 1)
    expect(counts(h)).toMatchObject({ writes: before.writes + 1, notices: before.notices + 1 })
    const v = ready(p); ledger.push({ label, point: v.point, hp: v.body.hp.current })
  }
  const med = (name: string) => {
    const v = ready(p), item = v.carried.find(i => i.name === name && i.container === 'quick') ?? v.carried.find(i => i.name === name && i.container === 'backpack')
    if (!item) return false
    const wound = v.body.wounds.find(w => w.treatment === 'untreated')
    if (name === '绷带' && v.body.hp.current === v.body.hp.maximum && !v.body.bleeding && !wound) return false
    if (name === '压缩口粮' && v.body.satiety.current === v.body.satiety.maximum) return false
    sendOne('medical', '使用药食', { item: item.selector, ...(name === '绷带' && wound ? { wound: wound.selector } : {}) })
    return true
  }
  const rest = () => { sendOne('rest', '原位休整'); med('压缩口粮') }
  function paid(family: string, label: string, fields: () => Omit<PlayerRequest, 'action'> = () => ({}), method?: string) {
    if (ready(p).body.energy.current === 0) { med('绷带'); rest() }
    sendOne(family, label, fields(), method)
  }
  const move = (name: string) => paid('move', name)
  const walk = (names: string[]) => names.forEach(move)
  const source = (label: string, method?: string) => paid('source', label, () => method === 'crow' || method === 'lit' ?
    { item: ready(p).carried.find(i => i.container === 'utility')!.selector } : {}, method)
  const task = (label: string, method?: string, fields: () => Omit<PlayerRequest, 'action'> = () => ({})) => paid('task', label, fields, method)
  const crow = () => ({ item: ready(p).carried.find(i => i.container === 'utility')!.selector })
  const pick = (name: string, x: number, y = 0) => {
    const i = playerItem(p, name, 'ground')
    sendOne(i.ordinary ? 'inventory' : 'task-transfer', i.ordinary ? '拾取' : '拾取任务物',
      { item: i.selector, placement: { x, y, rotated: false } })
  }
  const fight = () => {
    for (let turn = 0; turn < 16; turn++) {
      const v = ready(p)
      if (!v.combat) return
      const choices = v.combat.actions
      const bandage = choices.find(a => a.label.startsWith('使用快捷物品'))
      const action = v.body.bleeding && bandage ? bandage : choices.find(a => a.label === '蓄力打击') ??
        choices.find(a => a.label === '金属管攻击') ?? choices.find(a => a.label === '临时攻击')
      if (!action) throw new Error('No visible bounded combat action')
      const n = counts(h), d = h.dispatch.mock.calls.length
      expect(p.execute({ action: action.selector }).kind).toBe('committed')
      expect(h.dispatch).toHaveBeenCalledTimes(d + 1); expect(counts(h)).toMatchObject({ writes: n.writes + 1, notices: n.notices + 1 })
      if (ready(p).phase !== 'active-world') throw new Error('Route actually terminated: ' + ready(p).phase)
    }
    throw new Error('Bounded public combat strategy exhausted')
  }
  function success() {
    begin(h)
    move('大厅'); source('大厅搜索', 'dark'); pick('金属零件', 4)
    move('保安室'); source('保安室搜索', 'dark'); pick('隔离区门禁卡', 4, 2); move('大厅')
    task('隔离防火门', 'crow', crow)
    walk(['后勤控制间', '岗亭', '登记室']); task('开启物流柜', 'crow', crow); source('物流柜物资')
    pick('压缩口粮', 4, 1); pick('绷带', 5, 1); rest()
    move('装卸场'); fight(); med('绷带'); med('绷带'); source('物流装卸区搜索')
    const foods = ready(p).ground.filter(i => i.name === '压缩口粮')
    foods.forEach((_f, n) => pick('压缩口粮', n === 0 ? 5 : 3, 1))
    task('核对转运记录', 'full'); task('修复转运组件', 'manual'); task('取得转运组件', undefined, () => ({ placement: { x: 0, y: 0, rotated: false } }))
    walk(['登记室', '岗亭', '入口', '档案室']); task('比对通信记录', 'fast'); move('检修间'); source('通信设备柜', 'crow')
    pick('电子元件', 5); task('调查旁路'); task('开启旁路', 'crow', crow); rest(); move('机房')
    task('取得通信模块', undefined, () => ({ placement: { x: 2, y: 0, rotated: false } }))
    walk(['检修间', '档案室', '入口', '电梯前室', '大厅', '隔离走廊']); fight(); med('绷带'); move('冷藏室')
    task('提取样本', 'cautious', () => ({ placement: { x: 0, y: 2, rotated: false } }))
    expect(ready(p).tasks.sample).toBe('carried')
    expect(playerItem(p, '密封病原样本箱', 'backpack').footprint).toHaveLength(4)
    walk(['隔离走廊', '大厅', '后勤控制间', '岗亭', '配线廊', '转运支路柜']); rest(); task('调查供电'); task('恢复供电')
    walk(['配线廊', '岗亭', '后勤控制间', '转运平台'])
    const beforeMissing = counts(h), dispatchBeforeMissing = h.dispatch.mock.calls.length
    const missingRecipe = { action: choose(p, 'task', '安装转运装置'), materials: ['component', 'module', '金属零件'].map(name =>
      ({ item: playerItem(p, name, 'backpack').selector, quantity: 1 })) }
    expect(p.preview(missingRecipe).kind).toBe('unavailable')
    expect(p.execute(missingRecipe).kind).toBe('rejected')
    expect(counts(h)).toEqual(beforeMissing); expect(h.dispatch).toHaveBeenCalledTimes(dispatchBeforeMissing)
    task('安装转运装置', undefined, () => ({ materials: ['component', 'module', '金属零件', '电子元件'].map(name =>
      ({ item: playerItem(p, name, 'backpack').selector, quantity: 1 })) }))
    walk(['后勤控制间', '大厅', '电梯前室']); sendOne('terminal', '交付返回')
    expect(ready(p).terminal.result!.outcome).toBe('success'); expect(ready(p).tasks.sample).toBe('delivered')
    expect(ready(p).staticHub.successors!.choices).toEqual([])
    return ledger
  }
  return { success, move, walk, source, task, pick, fight, med, rest, crow, sendOne, ledger }
}
