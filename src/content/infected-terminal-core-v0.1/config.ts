import { createTerminalConfig } from '../../core/residence-terminal/config'

/** DEC-051 approved trial values. Not a player rules-version registration. */
export const infectedTerminalCoreConfig = createTerminalConfig({
  configurationId: 'infected-terminal-core-test-v0.1',
  config: { success_reward: 120, initial_balance: 0, balance_max: 2147483647, failure_penalty: 20 },
}, 'infected-terminal-core-test-v0.1')
