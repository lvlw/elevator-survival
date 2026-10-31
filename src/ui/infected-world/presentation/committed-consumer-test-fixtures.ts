// TEST ONLY. Genuine B1 controller result, then explicitly marked protocol perturbations.
import { expect } from 'vitest'
import { committedCase } from '../../../state/residence-session/player-committed-presentation-test-fixtures'
import { createPreplayController } from '../../../app/infected-preplay/controller'
import type { CommittedCombatPresentation } from '../../../app/infected-preplay/committed-presentation'

export function nativePresentation() {
  const { h, request } = committedCase('defend')
  const result = createPreplayController(h).execute(request)
  expect(result.kind).toBe('committed'); expect(result.presentation).toBeDefined()
  return result.presentation!
}
export function tokenAt(p: CommittedCombatPresentation, ordinal: number, scope = p.token.scope): CommittedCombatPresentation {
  return Object.freeze({ ...p, token: Object.freeze({ scope, ordinal }) })
}
