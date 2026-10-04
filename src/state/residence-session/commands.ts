import { createLocationCommand } from '../../core/residence-location'
import { ResidenceSessionError, type ResidenceMoveCommand } from './types'

export function createResidenceSessionCommand(input: unknown): ResidenceMoveCommand {
  const command = createLocationCommand(input)
  if (command.kind !== 'move') throw new ResidenceSessionError('INVALID_COMMAND', 'Only one-edge move is supported')
  return command
}
