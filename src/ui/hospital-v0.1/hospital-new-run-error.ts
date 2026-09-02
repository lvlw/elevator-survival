import { HospitalNewRunTransactionError } from '../../app/new-run'

export type PlayerSafeHospitalNewRunError =
  | Readonly<{ kind: 'player-error'; message: string }>
  | Readonly<{ kind: 'stale-origin' }>

/** Whitelists expected application outcomes; implementation failures remain fatal. */
export function mapPlayerSafeHospitalNewRunError(
  error: unknown,
): PlayerSafeHospitalNewRunError {
  if (error instanceof HospitalNewRunTransactionError) {
    if (error.code === 'IDENTITY_UNAVAILABLE') return Object.freeze({
      kind: 'player-error',
      message: '当前无法安全生成新一局，请重新确认后再试。',
    })
    if (error.code === 'IDENTITY_REUSED') return Object.freeze({
      kind: 'player-error',
      message: '本次生成的新一局身份不可用，请重新明确确认创建。',
    })
    if (error.code === 'ORIGIN_NOT_AVAILABLE') {
      return Object.freeze({ kind: 'stale-origin' })
    }
  }
  throw error
}
