import { describe, expect, it } from 'vitest'
import {
  addMinorContusion,
  addOpenWound,
  addPendingInfectionExposure,
  applyHealthLoss,
  calculateEscapeWoundCtbModifier,
  ConditionError,
  createInitialPlayerCondition,
  createOpenWoundSnapshot,
  createPlayerCondition,
  getOpenWound,
  getTreatedOpenWounds,
  getUntreatedOpenWounds,
  reducePendingInfectionExposure,
  removeOpenWound,
  removeOneMinorContusion,
  restoreHealth,
  startBleeding,
  setBleeding,
  stopBleeding,
  treatOpenWound,
  type PlayerConditionSnapshot,
} from '.'

const healthRules = { maxHealth: 12 }
const escapeRules = {
  escape: {
    baseCtb: { normal: 80, loaded: 80, overloaded: 110 },
    ctbPerUntreatedOpenWound: 10,
    woundCtbBonusCap: 20,
  },
  painkiller: { escapeWoundCtbReduction: 10 },
} as const

function condition(changes: Partial<PlayerConditionSnapshot> = {}) {
  return createPlayerCondition({
    currentHealth: 12,
    bleeding: false,
    openWounds: [],
    minorContusions: 0,
    painkillerActive: false,
    pendingInfectionExposures: 0,
    ...changes,
  }, healthRules)
}

describe('typed player condition', () => {
  it('creates and deeply freezes a stable sorted snapshot without mutating input', () => {
    const input: PlayerConditionSnapshot = {
      currentHealth: 12,
      bleeding: false,
      openWounds: [
        { id: 'wound-b', kind: 'bite', treatment: 'treated' },
        { id: 'wound-a', kind: 'laceration', treatment: 'untreated' },
      ],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }
    const result = createPlayerCondition(input, healthRules)
    expect(result.openWounds.map(({ id }) => id)).toEqual(['wound-a', 'wound-b'])
    expect(input.openWounds.map(({ id }) => id)).toEqual(['wound-b', 'wound-a'])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.openWounds)).toBe(true)
    expect(Object.isFrozen(result.openWounds[0])).toBe(true)
  })

  it('creates the formal initial state', () => {
    expect(createInitialPlayerCondition(healthRules)).toEqual({
      currentHealth: 12,
      bleeding: false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    })
  })

  it.each(['extra', 'untreatedOpenWounds', 'treatedOpenWounds'])(
    'rejects unknown top-level field %s',
    (field) => {
      const input = {
        currentHealth: 12,
        bleeding: false,
        openWounds: [],
        minorContusions: 0,
        painkillerActive: false,
        pendingInfectionExposures: 0,
        [field]: field === 'extra' ? true : 1,
      }
      expect(() => createPlayerCondition(input as never, healthRules)).toThrowError(
        expect.objectContaining({ code: 'INVALID_CONDITION_SHAPE' }),
      )
    },
  )

  it('normalizes wounds through one strict constructor without touching input', () => {
    const input = {
      id: 'wound-1',
      kind: 'puncture' as const,
      treatment: 'untreated' as const,
    }
    const result = createOpenWoundSnapshot(input)
    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    expect(() => createOpenWoundSnapshot({ ...input, extra: true } as never))
      .toThrowError(expect.objectContaining({ code: 'INVALID_OPEN_WOUND' }))
    expect(() => addOpenWound(condition(), { ...input, extra: true } as never))
      .toThrowError(expect.objectContaining({ code: 'INVALID_OPEN_WOUND' }))
  })

  it.each([
    [{ id: '', kind: 'bite', treatment: 'untreated' }],
    [{ id: 'w', kind: 'other', treatment: 'untreated' }],
    [{ id: 'w', kind: 'bite', treatment: 'other' }],
  ])('rejects invalid wound %o', (wound) => {
    expect(() => condition({ openWounds: [wound as never] })).toThrow(ConditionError)
  })

  it('rejects duplicate wound IDs and invalid exposure counts', () => {
    const wound = { id: 'w', kind: 'bite', treatment: 'untreated' } as const
    expect(() => condition({ openWounds: [wound, wound] })).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_OPEN_WOUND_ID' }),
    )
    expect(() => condition({ pendingInfectionExposures: -1 })).toThrow(ConditionError)
  })

  it('adds, queries, treats, and removes a selected wound without changing identity', () => {
    const added = addOpenWound(condition(), {
      id: 'wound-1', kind: 'puncture', treatment: 'untreated',
    })
    expect(getOpenWound(added, 'wound-1')).toEqual({
      id: 'wound-1', kind: 'puncture', treatment: 'untreated',
    })
    const treated = treatOpenWound(added, 'wound-1')
    expect(getOpenWound(treated, 'wound-1')).toEqual({
      id: 'wound-1', kind: 'puncture', treatment: 'treated',
    })
    expect(treated.bleeding).toBe(false)
    expect(removeOpenWound(treated, 'wound-1').openWounds).toEqual([])
  })

  it('rejects duplicate, unknown, and already treated wound operations', () => {
    const wound = { id: 'w', kind: 'laceration', treatment: 'untreated' } as const
    const added = addOpenWound(condition(), wound)
    expect(() => addOpenWound(added, wound)).toThrow(ConditionError)
    expect(() => getOpenWound(added, 'missing')).toThrow(ConditionError)
    expect(() => treatOpenWound(treatOpenWound(added, 'w'), 'w')).toThrow(ConditionError)
    expect(() => removeOpenWound(added, 'missing')).toThrow(ConditionError)
  })

  it('derives treated and untreated lists from the single wound source', () => {
    const state = condition({ openWounds: [
      { id: 'a', kind: 'laceration', treatment: 'untreated' },
      { id: 'b', kind: 'bite', treatment: 'treated' },
    ] })
    expect(getUntreatedOpenWounds(state).map(({ id }) => id)).toEqual(['a'])
    expect(getTreatedOpenWounds(state).map(({ id }) => id)).toEqual(['b'])
  })

  it('adds and explicitly reduces pending exposure without infection progress', () => {
    const exposed = addPendingInfectionExposure(condition(), 2)
    expect(exposed.pendingInfectionExposures).toBe(2)
    const reduced = reducePendingInfectionExposure(exposed, 3)
    expect(reduced).toMatchObject({
      actualReduction: 2, unusedReduction: 1, exposuresBefore: 2, exposuresAfter: 0,
    })
    expect(reduced.state.pendingInfectionExposures).toBe(0)
  })

  it.each([0, -1, 1.5])('rejects invalid exposure amount %s', (amount) => {
    expect(() => addPendingInfectionExposure(condition(), amount)).toThrow(ConditionError)
    expect(() => reducePendingInfectionExposure(condition(), amount)).toThrow(ConditionError)
  })

  it('keeps bleeding independent from wounds', () => {
    const wounded = addOpenWound(condition(), { id: 'w', kind: 'bite', treatment: 'untreated' })
    expect(startBleeding(wounded).openWounds).toEqual(wounded.openWounds)
    expect(stopBleeding(startBleeding(wounded)).openWounds).toEqual(wounded.openWounds)
  })

  it('rejects a non-boolean bleeding operation and strips unknown state fields', () => {
    const original = {
      ...condition(),
      legacyCount: 9,
    }
    expect(() => setBleeding(original, 1 as never)).toThrowError(
      expect.objectContaining({ code: 'INVALID_CONDITION_SHAPE' }),
    )
    const next = startBleeding(original)
    expect(next).not.toHaveProperty('legacyCount')
    expect(Object.keys(next).sort()).toEqual([
      'bleeding',
      'currentHealth',
      'minorContusions',
      'openWounds',
      'painkillerActive',
      'pendingInfectionExposures',
    ])
    expect(original.legacyCount).toBe(9)
  })

  it('keeps health and contusion operations', () => {
    const damaged = applyHealthLoss(condition(), 5, healthRules)
    expect(damaged.state.currentHealth).toBe(7)
    expect(restoreHealth(damaged.state, 20, healthRules).state.currentHealth).toBe(12)
    expect(removeOneMinorContusion(addMinorContusion(condition())).minorContusions).toBe(0)
  })

  it.each([
    [0, false, 0],
    [1, false, 10],
    [2, false, 20],
    [3, false, 20],
    [2, true, 10],
  ])('preserves escape modifier for %s wounds analgesia=%s', (count, painkillerActive, expected) => {
    const openWounds = Array.from({ length: count }, (_, index) => ({
      id: `w-${index}`,
      kind: 'laceration' as const,
      treatment: 'untreated' as const,
    }))
    expect(calculateEscapeWoundCtbModifier(
      condition({ openWounds, painkillerActive }), escapeRules,
    ).finalWoundCtb).toBe(expected)
  })

  it('does not count treated wounds for escape CTB', () => {
    expect(calculateEscapeWoundCtbModifier(condition({ openWounds: [
      { id: 'a', kind: 'bite', treatment: 'treated' },
    ] }), escapeRules).finalWoundCtb).toBe(0)
  })
})
