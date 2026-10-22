import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../app/infected-browser/schema'
import { checkpointFor } from '../../app/infected-browser/checkpoint'
import { createReservation } from '../../app/infected-browser/reservation'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { createCombatTestFactory } from '../../core/residence-combat/test-fixtures'
import { atDay, completeSuccess, expectation } from '../../state/residence-save/combat-test-fixtures'
import { serializeCombatResidenceSave } from '../../state/residence-save/combat-codec'
import { mountUi } from './test-fixtures'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })

function deadlineRecords(dies: boolean) {
  const { reservation, composition } = createReservation({ characterId: 'ui-day7-boundary', runId: 'combat-test-execution', seed: 'combat-seed', generation: 'ui-day7-generation' }, { tool: 'crow', specialty: 'engineer' })
  const factory = createCombatTestFactory(() => composition.dependencies), h = factory.fixture()
  const arrived = h.move(h.value, 'H1').snapshot
  const value = atDay(factory.bodyBoundary(arrived, h.deps, dies ? { condition: { ...arrived.character.body.condition, currentHealth: 1, bleeding: true } } : {}), h, 7)
  const expected = expectation(value, h.deps, { ...reservation.execution, ...reservation.choices })
  const text = serializeCombatResidenceSave(value, expected, composition.policy)
  return { reservation: JSON.stringify(reservation), checkpoint: JSON.stringify(checkpointFor(reservation, { expected, text }, composition)) }
}

describe('infected-world four terminal presentations', () => {
  it('explicit normal failure return commits once, keeps real empty overnight steps and never launches again', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); observed.clear(); h.setItem.mockClear()
      await h.d.button('失败止损返回')
      expect(document.querySelector('[aria-label="保护确认"]')).not.toBeNull()
      expect(h.view().phase).toBe('active-world'); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts().dispatch).toBe(0)
      await h.d.button('确认执行')
      const value = observed.owners.at(-1)!.getState().current!
      expect(value.receipts.at(-1)).toMatchObject({ outcome: 'voluntary-failure', source: 'normal-return', steps: [] })
      expect(h.view().point).toBe('living-hub'); expect(h.host.textContent).toContain('已止损返回')
      expect(observed.counts()).toMatchObject({ terminal: 1, dispatch: 1, current: 1, notices: 1, g1Cycle: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(1)
      expect(h.host.textContent).toContain('不会自动过夜、治疗或再次出发')
    } finally { await h.unmount() }
  })

  it('a genuine-P success receipt cold-loads its real delivered sample and retained items without another operation', async () => {
    // Supplemental completed-P fixture uses its declared TEST draw; the default-RNG read-null UI success route is a separate long-chain Gate.
    const success = completeSuccess()
    const { reservation, composition } = createReservation({ characterId: 'combat-test-character', runId: 'combat-test-execution', seed: 'combat-seed', generation: 'ui-success-generation' }, { tool: 'toolbox', specialty: 'engineer' })
    const expected = expectation(success.end, success.h.deps, { ...reservation.execution, ...reservation.choices })
    const text = serializeCombatResidenceSave(success.end, expected, composition.policy)
    const checkpoint = checkpointFor(reservation, { expected, text }, composition), observed = observeBrowser()
    const h = await mountUi('unused-success-seed', false, fixture => {
      fixture.disk.set(RESERVATION_KEY, JSON.stringify(reservation)); fixture.disk.set(CHECKPOINT_KEY, JSON.stringify(checkpoint))
    })
    try {
      expect(h.view()).toMatchObject({ point: 'living-hub', terminal: { result: { outcome: 'success' } }, tasks: { sample: 'delivered' } })
      expect(h.host.textContent).toContain('委托完成')
      const summary = [...h.host.querySelectorAll('summary')].find(summary => summary.textContent === '实物处置')!
      await h.flush(() => summary.click())
      expect(h.host.textContent).toContain('密封病原样本箱 ×1 · 已交付')
      expect(h.host.querySelector('[aria-label="相邻方向"]')).toBeNull()
      expect(h.host.textContent).toContain('当前没有后继内容')
      expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ initial: 0, combat: 0, task: 0, terminal: 0, dispatch: 0, notices: 0, draw: 0, g1Action: 0, g1Cycle: 0 })
    } finally { await h.unmount() }
  })

  it.each([false, true])('explicit Day7 deadline from strict TEST checkpoint, dies=%s, consumes the original cycle once', async dies => {
    const records = deadlineRecords(dies), observed = observeBrowser()
    const h = await mountUi('unused-deadline-seed', false, fixture => {
      fixture.disk.set(RESERVATION_KEY, records.reservation); fixture.disk.set(CHECKPOINT_KEY, records.checkpoint)
    })
    try {
      expect(h.view()).toMatchObject({ taskDay: 7, point: 'stable-active', phase: 'active-world' })
      observed.clear(); await h.d.button('期限结算')
      expect(document.querySelector('[aria-label="保护确认"]')).not.toBeNull()
      expect(h.setItem).not.toHaveBeenCalled(); expect(observed.counts().dispatch).toBe(0)
      await h.d.button('确认执行')
      const value = observed.owners.at(-1)!.getState().current!, receipt = value.receipts.at(-1)!
      expect(value.phase).toBe(dies ? 'dead' : 'living-hub')
      expect(receipt).toMatchObject({ outcome: dies ? 'death' : 'deadline-failure', source: 'deadline', taskDay: 7 })
      expect(receipt.steps.length).toBeGreaterThan(0)
      expect(h.host.textContent).toContain(dies ? '玩家死亡' : '期限已结束')
      expect(h.host.textContent).not.toMatch(/重新开始|进入封锁区|第 8 日/)
      expect(observed.counts()).toMatchObject({ terminal: 1, dispatch: 1, current: 1, notices: 1, g1Cycle: 1, initial: 0, combat: 0 })
      expect(h.setItem).toHaveBeenCalledTimes(1)
      if (dies) {
        expect(h.view().body.hp.current).toBe(0)
        const summary = [...h.host.querySelectorAll('summary')].find(summary => summary.textContent === '实物处置')!
        await h.flush(() => summary.click())
        expect(h.host.textContent).toContain('未能安全带回')
      }
    } finally { await h.unmount() }
  })
})
