import { describe, expect, it } from 'vitest'
import { begin, playerHarness, ready, send } from './player-test-fixtures'
import { selectEnemyHealthPhase } from '../../core/combat/combat-selectors'
import { coldSaved } from './combat-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'

describe('A native null-to-entry routes through ordinary PlayerSession', () => {
  it.each([['orderly', '感染护工'], ['porter', '感染装卸工'], ['technician', '感染技术员']])('%s formally enters and restores only the current opponent', (enemy, name) => {
    const h = playerHarness(); begin(h)
    expect(ready(h.player).combat).toBeNull()
    if (enemy === 'orderly') {
      send(h.player, 'move', '大厅')
      send(h.player, 'task', '隔离防火门', { item: ready(h.player).carried.find(i => i.container === 'utility')!.selector }, 'crow')
      send(h.player, 'move', '隔离走廊')
    } else if (enemy === 'porter') {
      for (const label of ['大厅', '后勤控制间', '岗亭', '登记室', '装卸场']) send(h.player, 'move', label)
    } else {
      for (const label of ['入口', '档案室']) send(h.player, 'move', label)
      send(h.player, 'task', '开启通信门', {}, 'manual'); send(h.player, 'move', '检修走廊')
    }
    const current = h.owner.getState().current!, q = ready(h.player), profile = h.deps.profiles.find(p => p.definitionId === current.battle!.entry.definitionId)!
    expect(q.combat!.opponent).toEqual({ kind: 'known', visualKey: 'infected-' + enemy, name })
    expect(q.combat!.enemyStage).toBe(selectEnemyHealthPhase(current.battle!.entry.enemyHealth, profile.maxHealth))
    const cold = coldSaved(h), p = wrapPlayerSession(cold.owner, cold.policy, infectedWorldPlayerLabels).player
    expect(ready(p).combat!.opponent).toEqual(q.combat!.opponent)
    expect(cold.storage.write).not.toHaveBeenCalled(); expect(cold.draw).not.toHaveBeenCalled()
    expect(h.disk()).not.toMatch(/visualKey|opponent|感染护工|感染装卸工|感染技术员/)
  })
})
