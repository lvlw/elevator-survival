import { afterEach, describe, expect, it, vi } from 'vitest'
import { boundaryRecords } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../app/infected-browser/schema'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })

describe('real CTB through infected-world React controls', () => {
  it.each(['orderly', 'porter', 'technician'] as const)('%s strict cold checkpoint accepts an actual visible attack with one commit', async enemy => {
    // Supplemental genuine-P, strict-codec boundary; not a read-null activation route.
    const records = boundaryRecords(enemy), observed = observeBrowser()
    const h = await mountUi('unused-cold-seed', false, fixture => {
      fixture.disk.set(RESERVATION_KEY, records.reservation); fixture.disk.set(CHECKPOINT_KEY, records.checkpoint)
    })
    try {
      expect(h.view().point).toBe('battle-decision')
      expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      expect(h.host.querySelector('[aria-label="相对行动顺序"]')).not.toBeNull()
      expect(h.host.querySelector('[aria-label="当前对手中性占位"]')).not.toBeNull()
      expect(h.host.querySelector('.iw-battle img')).toBeNull()
      const before = observed.owners.at(-1)!.getState().current!.character.revision
      observed.clear(); await h.d.send('金属管攻击')
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(1)
      expect(observed.owners.at(-1)!.getState().current!.character.revision).toBe(before + 1)
      expect(h.host.innerHTML).not.toMatch(/currentCtb|playerNextActionCtb|enemyNextActionCtb|enemyHealth|riskPercent|riskDrawIndex/)
      expect(h.host.querySelector('[aria-label="行动记录"]')?.textContent).not.toContain('尚无本会话行动')
    } finally { await h.unmount() }
  })

  it.each(['both-zero', 'alive-enemy'] as const)('%s death command preserves the actual archived enemy and pending, without auto restart', async kind => {
    const records = boundaryRecords(kind), observed = observeBrowser()
    const h = await mountUi('unused-death-seed', false, fixture => {
      fixture.disk.set(RESERVATION_KEY, records.reservation); fixture.disk.set(CHECKPOINT_KEY, records.checkpoint)
    })
    try {
      expect(h.view().point).toBe('battle-decision')
      observed.clear(); await h.d.send(kind === 'both-zero' ? '金属管攻击' : '防御')
      expect(h.view()).toMatchObject({ phase: 'dead', point: 'dead', body: { hp: { current: 0 } } })
      const committed = observed.owners.at(-1)!.getState().current!
      expect(committed.archives.at(-1)!.site.pending).toEqual(kind === 'both-zero' ? { kind: 'none' } : { kind: 'combat-required', enemyId: 'orderly' })
      expect(committed.combatDeaths.at(-1)!.decision.enemyHealthAfter === 0).toBe(kind === 'both-zero')
      expect(committed.battle).toBeNull(); expect(committed.receipts.at(-1)!.outcome).toBe('death')
      expect(committed.receipts.at(-1)!.reward).toBe(0)
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1, initial: 0, g1Action: 0, g1Cycle: 0 })
      expect(h.setItem).toHaveBeenCalledTimes(1)
      expect(h.host.textContent).toContain('玩家死亡')
      expect(h.host.querySelector('[aria-label="战斗行动"]')).toBeNull()
      expect(h.host.textContent).not.toMatch(/重新开始|重置游戏|复活玩家|进入封锁区/)
      const durable = h.disk.get(CHECKPOINT_KEY)
      observed.clear(); h.setItem.mockClear(); await h.remount()
      expect(h.view().point).toBe('dead'); expect(h.disk.get(CHECKPOINT_KEY)).toBe(durable)
      expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ combat: 0, draw: 0, dispatch: 0, current: 1, notices: 0, initial: 0, g1Action: 0, g1Cycle: 0 })
    } finally { await h.unmount() }
  })
})
