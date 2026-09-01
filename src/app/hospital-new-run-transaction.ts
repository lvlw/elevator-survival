import {
  HOSPITAL_SLICE_RULES_VERSION,
  createHospitalNewRunInitialCurrentDayHub,
  createHospitalNewRunSetup,
  type HospitalNewRunSetup,
} from '../content'
import { createRunIdentity, type RunIdentity } from '../core/domain'
import {
  RunSaveError,
  canonicalizeStableRunPhase,
  getStableRunPhaseIdentity,
  saveRunPhase,
  type RunSaveRulesRegistry,
  type RunSaveStorage,
  type StableRunPhase,
} from '../state/run-save'
import {
  createStableRunStore,
  type StableRunStore,
} from '../state/run-store'
import type { CurrentDayHubDependencies, CurrentDayHubSnapshot } from '../core/current-day-hub'
import type { RunIdentityMaterialSource } from './run-identity-material'

export type HospitalNewRunOrigin =
  | Readonly<{ kind: 'no-run' }>
  | StableRunPhase

export interface HospitalNewRunTransactionDependencies {
  readonly identityMaterialSource: RunIdentityMaterialSource
  readonly rulesRegistry: RunSaveRulesRegistry
  readonly storage: RunSaveStorage
  readonly rulesVersion: string
  readonly createInitialPhase?: (
    input: Readonly<{ runIdentity: RunIdentity; utilityDefinitionId: HospitalNewRunSetup['utilityDefinitionId'] }>,
    dependencies: CurrentDayHubDependencies,
  ) => CurrentDayHubSnapshot
  readonly createStore?: typeof createStableRunStore
}

export interface ExecuteHospitalNewRunTransactionInput {
  readonly origin: unknown
  readonly setup: unknown
  readonly dependencies: HospitalNewRunTransactionDependencies
}

export type HospitalNewRunTransactionResult =
  | Readonly<{
      kind: 'created-and-saved'
      phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>
      store: StableRunStore
    }>
  | Readonly<{
      kind: 'created-with-save-failure'
      phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>
      store: StableRunStore
    }>

export class HospitalNewRunTransactionError extends Error {
  public readonly code:
    | 'INVALID_INPUT'
    | 'ORIGIN_NOT_AVAILABLE'
    | 'IDENTITY_UNAVAILABLE'
    | 'IDENTITY_REUSED'
    | 'OUTPUT_IDENTITY_MISMATCH'

  public constructor(code: HospitalNewRunTransactionError['code'], message: string) {
    super(message)
    this.name = 'HospitalNewRunTransactionError'
    this.code = code
  }
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function normalizeOrigin(
  input: unknown,
  registry: RunSaveRulesRegistry,
): RunIdentity | null {
  if (exact(input, ['kind']) && input.kind === 'no-run') return null
  if (!exact(input, ['kind', 'payload'])) {
    throw new HospitalNewRunTransactionError('INVALID_INPUT', 'New Run来源结构无效')
  }
  if (input.kind === 'current-day-hub' || input.kind === 'scene-session') {
    throw new HospitalNewRunTransactionError('ORIGIN_NOT_AVAILABLE', '活动Run不能创建New Run')
  }
  if (input.kind !== 'run-failure') {
    throw new HospitalNewRunTransactionError('INVALID_INPUT', 'New Run来源类型无效')
  }
  const phase = canonicalizeStableRunPhase(input, registry)
  if (phase.kind !== 'run-failure') {
    throw new HospitalNewRunTransactionError('INVALID_INPUT', 'New Run失败终止来源无效')
  }
  return getStableRunPhaseIdentity(phase)
}

function normalizeMaterial(input: unknown): Readonly<{ runId: string; seed: string }> {
  if (!exact(input, ['runId', 'seed']) ||
    typeof input.runId !== 'string' || !input.runId.trim() ||
    typeof input.seed !== 'string' || !input.seed.trim()) {
    throw new HospitalNewRunTransactionError('IDENTITY_UNAVAILABLE', 'New Run身份材料无效')
  }
  return Object.freeze({ runId: input.runId, seed: input.seed })
}

function sameRunIdentity(left: RunIdentity, right: RunIdentity): boolean {
  return left.runId === right.runId &&
    left.seed === right.seed &&
    left.rulesVersion === right.rulesVersion
}

function sameStableRunPhase(left: StableRunPhase, right: StableRunPhase): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function outputIdentityMismatch(message: string): never {
  throw new HospitalNewRunTransactionError('OUTPUT_IDENTITY_MISMATCH', message)
}

/** Creates one new Run lifecycle; this is deliberately not a gameplay command. */
export function executeHospitalNewRunTransaction(
  input: ExecuteHospitalNewRunTransactionInput,
): HospitalNewRunTransactionResult {
  if (!exact(input, ['dependencies', 'origin', 'setup'])) {
    throw new HospitalNewRunTransactionError('INVALID_INPUT', 'New Run事务输入结构无效')
  }
  const dependencies = input.dependencies
  if (!dependencies || typeof dependencies !== 'object' ||
    dependencies.rulesVersion !== HOSPITAL_SLICE_RULES_VERSION) {
    throw new HospitalNewRunTransactionError('INVALID_INPUT', 'New Run事务依赖无效')
  }

  // All deterministic validation precedes the sole environment entropy call.
  const previousIdentity = normalizeOrigin(input.origin, dependencies.rulesRegistry)
  const setup = createHospitalNewRunSetup(input.setup)
  const ruleDependencies = dependencies.rulesRegistry.get(dependencies.rulesVersion)
  if (ruleDependencies.currentDayHub.mainSceneDefinitionId !==
    ruleDependencies.sceneLaunch.content.sceneDefinitionId) {
    throw new HospitalNewRunTransactionError('INVALID_INPUT', 'New Run场景内容依赖不一致')
  }

  let runIdentity: RunIdentity
  try {
    const material = normalizeMaterial(
      dependencies.identityMaterialSource.generateRunIdentityMaterial(),
    )
    runIdentity = createRunIdentity({
      ...material,
      rulesVersion: dependencies.rulesVersion,
    }, (rulesVersion) => dependencies.rulesRegistry.has(rulesVersion))
  } catch (error) {
    if (error instanceof HospitalNewRunTransactionError) throw error
    throw new HospitalNewRunTransactionError(
      'IDENTITY_UNAVAILABLE',
      'New Run身份生成失败',
    )
  }
  if (runIdentity.runId === runIdentity.seed) {
    throw new HospitalNewRunTransactionError('IDENTITY_UNAVAILABLE', 'New Run身份材料无效')
  }
  if (previousIdentity &&
    (runIdentity.runId === previousIdentity.runId || runIdentity.seed === previousIdentity.seed)) {
    throw new HospitalNewRunTransactionError('IDENTITY_REUSED', 'New Run不能复用旧Run身份')
  }
  const createInitialPhase = dependencies.createInitialPhase ??
    createHospitalNewRunInitialCurrentDayHub
  const payload = createInitialPhase({
    runIdentity,
    utilityDefinitionId: setup.utilityDefinitionId,
  }, ruleDependencies.currentDayHub)
  const phase = canonicalizeStableRunPhase({
    kind: 'current-day-hub',
    payload,
  }, dependencies.rulesRegistry)
  if (phase.kind !== 'current-day-hub') {
    outputIdentityMismatch('New Run初始阶段输出不一致')
  }
  if (!sameRunIdentity(getStableRunPhaseIdentity(phase), runIdentity)) {
    outputIdentityMismatch('New Run初始阶段身份与生成身份不一致')
  }
  const createStore = dependencies.createStore ?? createStableRunStore
  const store = createStore({
    initialPhase: phase,
    storage: dependencies.storage,
    rulesRegistry: dependencies.rulesRegistry,
  })
  const storePhase = store.getState().phase
  let verifiedStorePhase: StableRunPhase
  try {
    verifiedStorePhase = canonicalizeStableRunPhase(
      storePhase,
      dependencies.rulesRegistry,
    )
  } catch {
    outputIdentityMismatch('New Run Store阶段输出不一致')
  }
  if (storePhase.kind !== 'current-day-hub' ||
    verifiedStorePhase.kind !== 'current-day-hub' ||
    !sameRunIdentity(getStableRunPhaseIdentity(verifiedStorePhase), runIdentity) ||
    !sameStableRunPhase(verifiedStorePhase, phase)) {
    outputIdentityMismatch('New Run Store阶段与初始阶段不一致')
  }
  try {
    saveRunPhase(dependencies.storage, storePhase, dependencies.rulesRegistry)
    return Object.freeze({ kind: 'created-and-saved', phase: storePhase, store })
  } catch (error) {
    if (error instanceof RunSaveError && error.code === 'STORAGE_WRITE_FAILED') {
      return Object.freeze({
        kind: 'created-with-save-failure',
        phase: storePhase,
        store,
      })
    }
    throw error
  }
}
