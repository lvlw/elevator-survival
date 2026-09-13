import { describe, expect, it } from 'vitest'
import { projectActivityFeedEntry } from './activity-feed'
import type { StableRunPlayerViewModel } from './stable-run-view-model'

const visible = (health: number, time: number, nodeName: string): StableRunPlayerViewModel => ({
  kind: 'scene-session',
  status: { currentDay: 1, condition: { currentHealth: health, maximumHealth: 12, bleeding: false, untreatedOpenWounds: 0, treatedOpenWounds: 0, minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0, wounds: [] }, worldThreatStage: '无感染', satiety: 4, maximumSatiety: 6, mainSceneUsedToday: true },
  scene: { status: 'active', remainingTime: time, currentNodeName: nodeName, traversableAdjacentNodeNames: [], traversableRoutes: [], returnEstimate: 0, returnAfterWithdrawalTime: 0, returnRisk: 'safe-returned', navigationMap: { currentNodeName: nodeName, nodes: [], routes: [], return: { status: 'unavailable', estimatedReturnTime: null, estimatedRemainingTimeAfterReturn: null, risk: null, routeNodeNames: [] } }, timeBudget: { totalTime: 200, remainingTime: time, usedTime: 200 - time, returnReserve: 0, returnAfterWithdrawalTime: 0, safeMargin: time, returnRisk: 'safe-returned', unavailableReason: null }, currentNodeSearchState: 'not-available', currentObstacles: [], groundItems: [], loadout: { backpack: [], backpackWeight: 0, loadTier: 'normal', backpackGrid: { width: 6, height: 4, items: [], occupiedCells: [] }, equipment: { weapon: null, armor: null, utility: null }, quickSlots: [null, null] }, combat: null },
})

describe('session-local player-safe activity projection', () => {
  it('records only visible committed before/after facts without raw identities', () => {
    const result = projectActivityFeedEntry({ sequence: 1, category: 'scene', action: '前往 急诊大厅', before: visible(9, 200, '电梯前室'), after: visible(8, 190, '急诊大厅') })
    expect(result).toEqual({ sequence: 1, category: 'scene', action: '前往 急诊大厅', outcome: '到达急诊大厅 · 时间 200→190 · 生命 9→8' })
    expect(Object.isFrozen(result)).toBe(true)
  })
})
