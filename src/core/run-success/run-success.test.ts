import { describe, expect, it } from 'vitest'
import { hospitalSliceV01RuleConfig as config } from '../../content'
import {
  createRunSuccessSnapshot,
  RunSuccessError,
  type RunSuccessSnapshot,
} from '.'

const dependencies = Object.freeze({ config })

function success(overrides: Partial<RunSuccessSnapshot> = {}): RunSuccessSnapshot {
  return createRunSuccessSnapshot({
    kind: 'run-success',
    source: {
      kind: 'future-success-resolver',
      resolverId: 'future-main-objective-resolver',
      auditId: 'success-audit-test-001',
    },
    reason: null,
    runIdentity: {
      runId: 'run-success-framework-test',
      seed: 'success-framework-seed',
      rulesVersion: config.metadata.rulesVersion,
    },
    terminalDay: config.dailySettlement.finalPlayableDay,
    ...overrides,
  }, dependencies)
}

describe('Run Success terminal framework', () => {
  it('strictly creates and restores an audited terminal without deciding success', () => {
    const snapshot = success()
    expect(createRunSuccessSnapshot(snapshot, dependencies)).toEqual(snapshot)
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(snapshot).toEqual({
      kind: 'run-success',
      source: {
        kind: 'future-success-resolver',
        resolverId: 'future-main-objective-resolver',
        auditId: 'success-audit-test-001',
      },
      reason: null,
      runIdentity: {
        runId: 'run-success-framework-test',
        seed: 'success-framework-seed',
        rulesVersion: config.metadata.rulesVersion,
      },
      terminalDay: config.dailySettlement.finalPlayableDay,
    })
  })

  it('rejects malformed terminal structures, identities, dates, and non-success kinds', () => {
    const base = success()
    const invalidInputs: readonly unknown[] = [
      (() => {
        const draft = structuredClone(base) as unknown as Record<string, unknown>
        delete draft.source
        return draft
      })(),
      { ...base, extra: true },
      {
        ...base,
        runIdentity: { ...base.runIdentity, runId: '' },
      },
      { ...base, terminalDay: 0 },
      { ...base, terminalDay: config.dailySettlement.finalPlayableDay + 1 },
      { ...base, status: 'active' },
      { ...base, kind: 'run-failure' },
      {
        ...base,
        source: { ...base.source, kind: 'scene-defeat' },
      },
    ]
    for (const input of invalidInputs) {
      expect(() => createRunSuccessSnapshot(input, dependencies))
        .toThrowError(RunSuccessError)
    }
  })
})
