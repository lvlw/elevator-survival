import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { parseResidence } from '../../core/residence-config/validation'
import { terminalCommandSchema } from '../../core/residence-terminal/plans'
import { createResidenceSessionCommand } from './commands'
import type { TerminalResidenceSessionCommand } from './terminal-types'

const tag = z.object({ kind: z.enum(['launch', 'move', 'reveal', 'pickup', 'drop', 'rest', 'deliver', 'withdraw', 'deadline']) })
export function createTerminalResidenceSessionCommand(input: unknown): TerminalResidenceSessionCommand {
  const { kind } = parseResidence(tag, input)
  return kind === 'deliver' || kind === 'withdraw' || kind === 'deadline'
    ? deepFreeze(parseResidence(terminalCommandSchema, input)) : createResidenceSessionCommand(input)
}
