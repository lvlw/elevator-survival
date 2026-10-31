import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
import { domRouteA } from './route-test-fixtures'
import { mountPresentation } from './committed-presentation-test-fixtures'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren() })
describe('C1 original producers and cold checkpoints reach actual React DOM', () => {
  it('two genuine native enemy responses still render one player action and one fixed feedback span', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'two-responses' })
    try {
      observed.clear(); await h.combat()
      const value = observed.owners.at(-1)!.getState().current!, responses = value.battle!.decision!.enemyResponses
      expect(responses).toBe(2); expect(h.direct()!.sequence).toHaveLength(1)
      expect(h.cue().querySelectorAll('span')).toHaveLength(1); expect(h.cue().textContent).toBe('临时攻击已执行')
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 })
      console.log('C1-NATIVE '+JSON.stringify({ case: 'two-responses', nativeEnemyResponses: responses, renderedRecords: 1, counts: observed.counts() }))
    } finally { await h.unmount() }
  })
  it.each(['victory', 'death', 'both-zero'] as const)('%s immediately switches to the actual new view while feedback timer is still pending', async id => {
    const observed = observeBrowser(), h = await mountPresentation({ id })
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); observed.clear(); await h.combat()
      expect(h.view().point).toBe(id === 'victory' ? 'stable-active' : 'dead')
      expect(h.host.querySelector('[aria-label="战斗行动"]')).toBeNull(); expect(h.active()).not.toBeNull()
      expect(h.direct()!.stop).toBe(h.view().point); expect(h.direct()!.stageAfter).toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 })
      if (id !== 'victory') expect(h.host.textContent).toContain('玩家死亡')
      console.log('C1-NATIVE '+JSON.stringify({ case: id, point: h.view().point, hp: h.view().body.hp.current, counts: observed.counts() }))
    } finally { await h.unmount() }
  })
  it('actual retreat and noncombat reentry keep the same controller scope/high-water and do not pretend the move is combat', async () => {
    const h = await mountPresentation({ id: 'retreat' })
    try {
      const room = h.view().location!.name; await h.combat(); const first = h.direct()!
      expect(h.view().point).toBe('stable-active'); expect(h.host.querySelector('[aria-label="战斗行动"]')).toBeNull()
      expect(h.cue().textContent).toBe('退却行动已执行')
      await h.d.move(room); expect(h.view().point).toBe('battle-decision')
      expect(h.originals.at(-1)).not.toHaveProperty('presentation'); expect(h.cue().textContent).toBe('')
      await h.combat('防御'); expect(h.direct()!.token.scope).toBe(first.token.scope); expect(h.direct()!.token.ordinal).toBe(first.token.ordinal + 1)
    } finally { await h.unmount() }
  })
  it.each(['first-hub', 'stable-active', 'battle-decision', 'living-hub', 'dead'] as const)('%s genuine cold restore has no feedback, gameplay, stock or write', async point => {
    const observed = observeBrowser(), h = await mountPresentation({ id: point === 'battle-decision' ? 'defend' : point === 'dead' ? 'death' : point === 'living-hub' ? 'retreat' : undefined })
    try {
      if (point === 'first-hub' || point === 'stable-active') { await h.d.setup(); if (point === 'stable-active') await h.d.send('进入封锁区') }
      if (point === 'battle-decision' || point === 'dead') await h.combat()
      if (point === 'living-hub') { await h.combat(); await h.d.move('电梯前室'); await h.d.send('失败止损返回') }
      expect(h.view().point).toBe(point); const prior = h.direct(), disk = h.disk.get(CHECKPOINT_KEY)
      expect(disk).not.toContain('"presentation"'); expect(disk).not.toContain('committedAction')
      observed.clear(); h.entropy.mockClear(); h.setItem.mockClear(); h.results.length = 0
      await h.remount()
      expect(h.view().point).toBe(point); expect(h.cue().textContent).toBe(''); expect(h.direct()).toBeUndefined()
      expect(h.disk.get(CHECKPOINT_KEY)).toBe(disk); expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 1, notices: 0, initial: 0, draw: 0, g1Action: 0, g1Cycle: 0, encode: 0 })
      if (point === 'battle-decision') { await h.combat(); expect(h.direct()!.token.scope).not.toBe(prior!.token.scope); expect(h.direct()!.token.ordinal).toBe(0) }
    } finally { await h.unmount() }
  })
  it('real read-null setup, parameters, movement and entry never synthesize an action record', async () => {
    const h = await mountPresentation()
    try {
      await h.d.setup(); await domRouteA(h.d, 0)
      expect(h.view().point).toBe('battle-decision'); expect(h.view().combat!.opponent.name).toBe('感染护工')
      expect(h.originals.every(r => !r.presentation)).toBe(true); expect(h.cue().textContent).toBe('')
      await h.combat('防御'); expect(h.cue().textContent).toBe('防御已执行')
    } finally { await h.unmount() }
  })
  it('read-only descriptions, cancel, synchronization and refused stale choices cannot append a cue or a gameplay write', async () => {
    const observed = observeBrowser(), h = await mountPresentation()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); observed.clear(); h.setItem.mockClear()
      await h.d.button('失败止损返回'); expect(h.host.querySelector('[aria-label="保护确认"]')).not.toBeNull()
      expect(h.cue().textContent).toBe(''); await h.d.button('取消')
      const controls = h.owner().controls()!
      await h.flush(() => { controls.beginDraft({ action: h.view().move.options[0].selector }); controls.cancel(); controls.synchronize() })
      await h.flush(() => { expect(controls.execute({ action: { selection: 'opaque' } }).kind).toBe('rejected') })
      expect(h.cue().textContent).toBe(''); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, notices: 0, initial: 0, g1Action: 0, g1Cycle: 0, draw: 0, encode: 0 })
    } finally { await h.unmount() }
  })
})
