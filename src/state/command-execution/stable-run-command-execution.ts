import {
  RunSaveError,
  saveRunPhase,
  type RunSaveEnvelope,
  type RunSaveRulesRegistry,
  type RunSaveStorage,
  type StableRunPhase,
} from '../run-save'

/** The only two persistence choices available after a formal command has committed. */
export type StableRunCommandSavePolicy = 'save-on-success' | 'no-save'

/**
 * A lifecycle-specific adapter owns command parsing and core resolution.  This
 * boundary only receives its already committed stable Run phase.
 */
export type StableRunCommandHandler<TResult> = (
  currentPhase: StableRunPhase,
) => Readonly<{
  result: TResult
  phase: StableRunPhase
}>

export interface ExecuteStableRunCommandInput<TResult> {
  readonly currentPhase: StableRunPhase
  readonly handler: StableRunCommandHandler<TResult>
  readonly savePolicy: StableRunCommandSavePolicy
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export type StableRunCommandExecution<TResult> =
  | Readonly<{
      kind: 'executed'
      result: TResult
      phase: StableRunPhase
      persistence: Readonly<
        | { kind: 'saved'; envelope: RunSaveEnvelope }
        | { kind: 'not-requested' }
      >
    }>
  | Readonly<{
      kind: 'executed-with-save-failure'
      result: TResult
      phase: StableRunPhase
      persistence: Readonly<{ kind: 'save-failed'; error: RunSaveError }>
    }>

/**
 * Connects one already-formal command handler to the one stable Run save
 * boundary.  The handler is run first; if it rejects, this function never
 * touches storage.  A write failure is reported after its committed result and
 * never rolls that result back.
 */
export function executeStableRunCommand<TResult>(
  input: ExecuteStableRunCommandInput<TResult>,
): StableRunCommandExecution<TResult> {
  const execution = input.handler(input.currentPhase)

  if (input.savePolicy === 'no-save') {
    return Object.freeze({
      kind: 'executed',
      result: execution.result,
      phase: execution.phase,
      persistence: Object.freeze({ kind: 'not-requested' }),
    })
  }

  try {
    const envelope = saveRunPhase(
      input.storage,
      execution.phase,
      input.rulesRegistry,
    )
    return Object.freeze({
      kind: 'executed',
      result: execution.result,
      phase: execution.phase,
      persistence: Object.freeze({ kind: 'saved', envelope }),
    })
  } catch (error) {
    if (
      error instanceof RunSaveError &&
      error.code === 'STORAGE_WRITE_FAILED'
    ) {
      return Object.freeze({
        kind: 'executed-with-save-failure',
        result: execution.result,
        phase: execution.phase,
        persistence: Object.freeze({ kind: 'save-failed', error }),
      })
    }
    throw error
  }
}
