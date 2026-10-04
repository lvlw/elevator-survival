import { describe, it, expect } from 'vitest'
import * as ordinary from './index'
import { activateMission, createMissionScope, establishMissionFact, parseMissionColdCandidate, terminateMission } from './controlled'
import { restoreMissionCandidate } from './index'

const mission = { worldId: 'w', templateId: 't', commissionId: 'c', rulesVersion: 'test', contractVersion: 'v' }
const scope = createMissionScope({ characterId: 'character', declarations: [mission] }, (v) => v === 'test')
const binding = { characterId: 'character', mission }
const execution = { runId: 'run', seed: 'seed', rulesVersion: 'test' }
const fresh = () => establishMissionFact(binding, scope)
const active = () => activateMission(fresh(), { binding, execution }, scope)
describe('G3 S01 controlled cold candidate', () => {
  it.each(['unaccepted', 'active', 'success', 'voluntary-failure', 'deadline-failure', 'death'] as const)('preserves %s without install authority', (status) => {
    const original = status === 'unaccepted' ? fresh() : status === 'active' ? active() : terminateMission(active(), { binding, execution, outcome: status }, scope)
    const raw = structuredClone(original)
    const candidate = parseMissionColdCandidate(raw, binding, scope)
    expect(candidate).toEqual({ kind: 'mission-lifecycle-cold-candidate', value: original })
    expect(candidate.value).not.toBe(raw); expect(Object.isFrozen(candidate.value.binding)).toBe(true)
    expect(Object.isFrozen(raw)).toBe(false)
    expect(candidate).not.toHaveProperty('install')
  })
  it.each(['characterId', 'worldId', 'templateId', 'commissionId', 'rulesVersion', 'contractVersion'])('rejects cross binding %s', (key) => {
    const raw = structuredClone(active())
    Reflect.set(key === 'characterId' ? raw.binding : raw.binding.mission, key, 'other')
    expect(() => parseMissionColdCandidate(raw, binding, scope)).toThrow()
  })
  it.each(['missing', 'extra', 'empty-seed', 'trimmed-run', 'rules', 'format', 'null', 'array', 'class', 'getter'])('rejects malformed %s', (mode) => {
    const raw: unknown = mode === 'null' ? null : mode === 'array' ? [] : mode === 'class' ? new (class {})() : structuredClone(active())
    if (raw && typeof raw === 'object') {
      if (mode === 'missing') Reflect.deleteProperty(raw, 'execution')
      if (mode === 'extra') Reflect.set(raw, 'current', true)
      if (mode === 'format') Reflect.set(raw, 'formatVersion', 2)
      if (mode === 'getter') Object.defineProperty(raw, 'binding', { enumerable: true, get() { throw new Error('getter') } })
      if ('execution' in raw && typeof raw.execution === 'object' && raw.execution) {
        if (mode === 'empty-seed') Reflect.set(raw.execution, 'seed', '')
        if (mode === 'trimmed-run') Reflect.set(raw.execution, 'runId', ' run ')
        if (mode === 'rules') Reflect.set(raw.execution, 'rulesVersion', 'unknown')
      }
    }
    expect(() => parseMissionColdCandidate(raw, binding, scope)).toThrow()
  })
  it('does not replace the original independent expected boundary or ordinary exports', () => {
    const closed = terminateMission(active(), { binding, execution, outcome: 'success' }, scope)
    const cold = parseMissionColdCandidate(fresh(), binding, scope)
    expect(() => restoreMissionCandidate(cold.value, { binding, status: 'closed', execution, outcome: 'success' }, scope))
      .toThrowError(expect.objectContaining({ code: 'RESTORE_STATE_MISMATCH' }))
    expect(closed.status).toBe('closed'); expect(ordinary).not.toHaveProperty('parseMissionColdCandidate')
  })
})
