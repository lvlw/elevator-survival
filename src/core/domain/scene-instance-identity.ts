import { deepFreeze } from '../config'
import type { RunIdentity } from './run-identity'

export interface SceneInstanceIdentityFacts {
  readonly runIdentity: RunIdentity
  readonly currentDay: number
  readonly sceneDefinitionId: string
}

export class SceneInstanceIdentityError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'SceneInstanceIdentityError'
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

/** The sole deterministic owner of Scene instance identity derivation. */
export function deriveSceneInstanceIdFromRunFacts(input: unknown): string {
  if (!exact(input, ['currentDay', 'runIdentity', 'sceneDefinitionId']) ||
    !exact(input.runIdentity, ['rulesVersion', 'runId', 'seed']) ||
    typeof input.runIdentity.runId !== 'string' || !input.runIdentity.runId.trim() ||
    typeof input.runIdentity.seed !== 'string' || !input.runIdentity.seed.trim() ||
    typeof input.runIdentity.rulesVersion !== 'string' || !input.runIdentity.rulesVersion.trim() ||
    !Number.isSafeInteger(input.currentDay) || (input.currentDay as number) < 1 ||
    typeof input.sceneDefinitionId !== 'string' || !input.sceneDefinitionId.trim()) {
    throw new SceneInstanceIdentityError('场景实例身份派生事实无效')
  }
  const facts = input as unknown as SceneInstanceIdentityFacts
  return deepFreeze([
    'scene',
    facts.runIdentity.runId,
    facts.runIdentity.seed,
    facts.runIdentity.rulesVersion,
    String(facts.currentDay),
    facts.sceneDefinitionId,
  ].map((part) => encodeURIComponent(part)).join(':'))
}
