import { describe, expect, it } from 'vitest'
import { deriveSceneInstanceIdFromRunFacts } from './scene-instance-identity'

const facts = {
  runIdentity: {
    runId: 'run/a',
    seed: 'seed a',
    rulesVersion: 'hospital-slice-v0.1',
  },
  currentDay: 1,
  sceneDefinitionId: 'scene_blockaded_hospital_emergency_floor_1',
}

describe('shared Scene instance identity', () => {
  it('preserves the existing deterministic encoded golden output', () => {
    expect(deriveSceneInstanceIdFromRunFacts(facts)).toBe(
      'scene:run%2Fa:seed%20a:hospital-slice-v0.1:1:scene_blockaded_hospital_emergency_floor_1',
    )
  })

  it('changes for a different Run identity, day, or Scene definition', () => {
    const base = deriveSceneInstanceIdFromRunFacts(facts)
    expect(deriveSceneInstanceIdFromRunFacts({
      ...facts,
      runIdentity: { ...facts.runIdentity, runId: 'run-b' },
    })).not.toBe(base)
    expect(deriveSceneInstanceIdFromRunFacts({ ...facts, currentDay: 2 })).not.toBe(base)
    expect(deriveSceneInstanceIdFromRunFacts({
      ...facts,
      sceneDefinitionId: 'scene-other',
    })).not.toBe(base)
  })

  it.each([
    null,
    [],
    { ...facts, extra: true },
    { ...facts, currentDay: 0 },
    { ...facts, runIdentity: { ...facts.runIdentity, seed: '' } },
    { ...facts, sceneDefinitionId: '' },
  ])('strictly rejects malformed derivation facts', (input) => {
    expect(() => deriveSceneInstanceIdFromRunFacts(input)).toThrow()
  })
})
