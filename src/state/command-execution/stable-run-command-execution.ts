import {
  canonicalizeStableRunPhase,
  getStableRunPhaseIdentity,
  RunSaveError,
  saveRunPhase,
  type RunSaveEnvelope,
  type RunSaveRulesRegistry,
  type RunSaveStorage,
  type StableRunPhase,
} from '../run-save'

export type StableRunCommandExecutionErrorCode =
  | 'TERMINAL_PHASE'
  | 'RUN_IDENTITY_MISMATCH'

export class StableRunCommandExecutionError extends Error {
  public constructor(
    public readonly code: StableRunCommandExecutionErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'StableRunCommandExecutionError'
  }
}

export type NonTerminalStableRunPhase = Exclude<
  StableRunPhase,
  Readonly<{ kind: 'run-failure'; payload: unknown }>
>

/**
 * A lifecycle-specific adapter owns command parsing and core resolution.  This
 * boundary only receives its already committed stable Run phase.
 */
export type StableRunCommandHandler<TResult> = (
  currentPhase: NonTerminalStableRunPhase,
) => Readonly<{
  result: TResult
  phase: StableRunPhase
}>

export interface ExecuteStableRunCommandInput<TResult> {
  readonly currentPhase: StableRunPhase
  readonly handler: StableRunCommandHandler<TResult>
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export type StableRunCommandExecution<TResult> =
  | Readonly<{
      kind: 'executed'
      result: TResult
      phase: StableRunPhase
      persistence: Readonly<{ kind: 'saved'; envelope: RunSaveEnvelope }>
    }>
  | Readonly<{
      kind: 'executed-with-save-failure'
      result: TResult
      phase: StableRunPhase
      persistence: Readonly<{ kind: 'save-failed'; error: RunSaveError }>
    }>

/**
 * Executes one state-changing formal command and persists its canonical stable
 * phase. Terminal input is rejected before the handler; rejected handlers and
 * invalid transitions never touch storage. A write failure is reported after
 * the committed result and never rolls that result back.
 */
export function executeStableRunCommand<TResult>(
  input: ExecuteStableRunCommandInput<TResult>,
): StableRunCommandExecution<TResult> {
  const currentPhase = canonicalizeStableRunPhase(
    input.currentPhase,
    input.rulesRegistry,
  )
  if (currentPhase.kind === 'run-failure') {
    throw new StableRunCommandExecutionError(
      'TERMINAL_PHASE',
      'Run终止阶段不能执行普通状态变更命令',
    )
  }
  const currentIdentity = getStableRunPhaseIdentity(currentPhase)
  const execution = input.handler(currentPhase)
  const nextPhase = canonicalizeStableRunPhase(
    execution.phase,
    input.rulesRegistry,
  )
  const nextIdentity = getStableRunPhaseIdentity(nextPhase)
  if (
    currentIdentity.runId !== nextIdentity.runId ||
    currentIdentity.seed !== nextIdentity.seed ||
    currentIdentity.rulesVersion !== nextIdentity.rulesVersion
  ) {
    throw new StableRunCommandExecutionError(
      'RUN_IDENTITY_MISMATCH',
      '状态变更命令不能切换Run身份',
    )
  }

  try {
    const envelope = saveRunPhase(
      input.storage,
      nextPhase,
      input.rulesRegistry,
    )
    return Object.freeze({
      kind: 'executed',
      result: execution.result,
      phase: nextPhase,
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
        phase: nextPhase,
        persistence: Object.freeze({ kind: 'save-failed', error }),
      })
    }
    throw error
  }
}
