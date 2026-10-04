export { TERMINAL_RESIDENCE_FORMAT, TERMINAL_RESIDENCE_FORMAT_VERSION, TerminalResidenceSaveError } from './terminal-types'
export { createTerminalResidenceEnvelope, serializeTerminalResidenceSave, deserializeTerminalResidenceSave } from './terminal-codec'
export { validateTerminalResidenceAggregate } from './terminal-validation'
export { restoreTerminalResidenceCandidate } from './terminal-expected'
export type { TerminalResidenceAggregate, FreshTerminalResidenceHub, TerminalResidenceSavePolicy,
  TerminalResidenceEnvelope, TerminalResidenceCandidate } from './terminal-types'
