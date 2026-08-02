import { describe, expect, it } from 'vitest'
import {
  addOpenWound,
  calculateEscapeWoundCtbModifier,
  createInitialPlayerCondition,
  treatOpenWound,
} from '../../core/condition'
import { hospitalSliceV01RuleConfig as config } from '..'

describe('hospital typed player condition integration', () => {
  it('uses hospital health and escape configuration', () => {
    let state = createInitialPlayerCondition(config.combat.player)
    state = addOpenWound(state, { id: 'a', kind: 'laceration', treatment: 'untreated' })
    state = addOpenWound(state, { id: 'b', kind: 'bite', treatment: 'untreated' })
    expect(calculateEscapeWoundCtbModifier(state, {
      escape: config.combat.escape,
      painkiller: config.medical.painkiller,
    }).finalWoundCtb).toBe(20)
    const treated = treatOpenWound(state, 'a')
    expect(calculateEscapeWoundCtbModifier(treated, {
      escape: config.combat.escape,
      painkiller: config.medical.painkiller,
    }).finalWoundCtb).toBe(10)
  })
})
