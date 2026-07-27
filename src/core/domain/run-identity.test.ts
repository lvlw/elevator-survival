import { describe, expect, it } from 'vitest'
import {
  createRunIdentity,
  UnregisteredRulesVersionError,
} from './run-identity'

const REGISTERED_RULES_VERSION = 'registered-test-version'
const hasRegisteredTestVersion = (rulesVersion: string) =>
  rulesVersion === REGISTERED_RULES_VERSION

describe('createRunIdentity', () => {
  it('binds caller-provided identity data to a registered rules version', () => {
    const identity = createRunIdentity(
      {
        runId: 'run-001',
        seed: 'seed-001',
        rulesVersion: REGISTERED_RULES_VERSION,
      },
      hasRegisteredTestVersion,
    )

    expect(identity).toEqual({
      runId: 'run-001',
      seed: 'seed-001',
      rulesVersion: REGISTERED_RULES_VERSION,
    })
    expect(Object.isFrozen(identity)).toBe(true)
  })

  it.each([
    ['empty run ID', { runId: '', seed: 'seed-001' }],
    ['empty seed', { runId: 'run-001', seed: '' }],
  ])('rejects %s', (_name, values) => {
    expect(() =>
      createRunIdentity(
        {
          ...values,
          rulesVersion: REGISTERED_RULES_VERSION,
        },
        hasRegisteredTestVersion,
      ),
    ).toThrow()
  })

  it('rejects an unregistered rules version', () => {
    expect(() =>
      createRunIdentity(
        {
          runId: 'run-001',
          seed: 'seed-001',
          rulesVersion: 'hospital-slice-v9.9',
        },
        hasRegisteredTestVersion,
      ),
    ).toThrow(UnregisteredRulesVersionError)
  })
})
