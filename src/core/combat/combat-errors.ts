import type { CombatErrorCode } from './combat-types'

export class CombatError extends Error {
  readonly code: CombatErrorCode
  constructor(code: CombatErrorCode, message: string) {
    super(message)
    this.name = 'CombatError'
    this.code = code
  }
}
