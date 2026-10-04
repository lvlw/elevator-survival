import approved from '../../../docs/content/infected-terminal-core-test-config-v0.1.json'
import { expect, it } from 'vitest'
import { infectedTerminalCoreConfig } from './config'

it('T12 sole executable terminal producer matches the approved document oracle exactly', () => {
  expect(infectedTerminalCoreConfig.configurationId).toBe(approved.configurationId)
  expect(infectedTerminalCoreConfig.config).toEqual(approved.config)
  expect(Object.keys(infectedTerminalCoreConfig.config).sort()).toEqual(['balance_max', 'failure_penalty', 'initial_balance', 'success_reward'])
})
