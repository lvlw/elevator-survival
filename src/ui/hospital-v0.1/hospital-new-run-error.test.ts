import { describe, expect, it } from 'vitest'
import { HospitalNewRunTransactionError } from '../../app/new-run'
import { mapPlayerSafeHospitalNewRunError } from './hospital-new-run-error'

describe('hospital New Run player-safe error whitelist', () => {
  it('maps only expected identity and stale-origin outcomes', () => {
    expect(mapPlayerSafeHospitalNewRunError(new HospitalNewRunTransactionError(
      'IDENTITY_UNAVAILABLE',
      'private unavailable message',
    ))).toEqual({
      kind: 'player-error',
      message: '当前无法安全生成新的 Run 身份，请重新确认后再试。',
    })
    expect(mapPlayerSafeHospitalNewRunError(new HospitalNewRunTransactionError(
      'IDENTITY_REUSED',
      'private reused message',
    ))).toEqual({
      kind: 'player-error',
      message: '本次生成的 Run 身份不可用，请重新明确确认创建。',
    })
    expect(mapPlayerSafeHospitalNewRunError(new HospitalNewRunTransactionError(
      'ORIGIN_NOT_AVAILABLE',
      'private origin message',
    ))).toEqual({ kind: 'stale-origin' })
  })

  it.each([
    new HospitalNewRunTransactionError('INVALID_INPUT', 'private invalid input'),
    new HospitalNewRunTransactionError(
      'OUTPUT_IDENTITY_MISMATCH',
      'private output mismatch',
    ),
    new Error('private unknown implementation failure'),
  ])('rethrows implementation failures instead of presenting them as retryable', (error) => {
    expect(() => mapPlayerSafeHospitalNewRunError(error)).toThrow(error)
  })
})
