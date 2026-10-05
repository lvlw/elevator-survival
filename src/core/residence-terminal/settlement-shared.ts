import { safeAdd } from '../residence-config/validation'
import type { TerminalConfig, TerminalOutcome } from './types'
/** Single wallet settlement owner shared by old A and explicit supply protocol. */
export function settleTerminalBalance(before: number, outcome: TerminalOutcome, config: TerminalConfig['config']) {
  const reward = outcome === 'success' ? config.success_reward : 0
  const penalty = outcome === 'voluntary-failure' || outcome === 'deadline-failure' ? Math.min(before, config.failure_penalty) : 0
  const forfeited = outcome === 'death' ? before : 0
  return { before, reward, penalty, forfeited, balance: safeAdd(before - penalty - forfeited, reward) }
}
