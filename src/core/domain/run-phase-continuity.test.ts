import { describe, expect, it } from 'vitest'
import {
  bindRunPhaseContinuityToScene,
  createRunPhaseContinuitySnapshot,
  hasSameRunPhaseContinuity,
} from './run-phase-continuity'

const VERSION = 'rules-v1'
const input = {
  runIdentity: { runId: 'run-a', seed: 'seed-a', rulesVersion: VERSION },
  currentDay: 2,
  sceneInstanceId: 'scene-x',
}

describe('Run phase continuity', () => {
  it('strictly binds an existing RunIdentity to one day and scene', () => {
    const snapshot = createRunPhaseContinuitySnapshot(input, VERSION)
    expect(snapshot).toEqual(input)
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.runIdentity)).toBe(true)
    expect(hasSameRunPhaseContinuity(snapshot, createRunPhaseContinuitySnapshot(input, VERSION))).toBe(true)
  })

  it.each([
    { ...input, currentDay: 0 },
    { ...input, currentDay: Number.MAX_SAFE_INTEGER + 1 },
    { ...input, sceneInstanceId: '' },
    { ...input, unknown: true },
    { ...input, runIdentity: { ...input.runIdentity, unknown: true } },
  ])('rejects malformed or unknown continuity facts', (candidate) => {
    expect(() => createRunPhaseContinuitySnapshot(candidate, VERSION)).toThrow()
  })

  it('rejects a rules version different from the bound configuration', () => {
    expect(() => createRunPhaseContinuitySnapshot(input, 'rules-v2')).toThrow()
  })

  it('rebinds only the explicitly supplied scene instance', () => {
    const rebound = bindRunPhaseContinuityToScene(
      createRunPhaseContinuitySnapshot(input, VERSION),
      'scene-y',
      VERSION,
    )
    expect(rebound).toEqual({ ...input, sceneInstanceId: 'scene-y' })
    expect(() => bindRunPhaseContinuityToScene(rebound, '', VERSION)).toThrow()
  })
})
