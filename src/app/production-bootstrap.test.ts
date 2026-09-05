import { describe, expect, it } from 'vitest'
import {
  hospitalRunSaveRulesRegistry,
  RunSaveError,
  serializeRunSave,
  type RunSaveRulesRegistry,
  type RunSaveStorage,
  type StableRunPhase,
} from '../state/run-save'
import { createHospitalDevelopmentPreviewScenario } from '../ui/dev-preview/hospital-preview-scenarios'
import {
  bootstrapProductionRun,
  clearUnrecoverableRunSave,
} from './production-bootstrap'

class TrackedStorage implements RunSaveStorage {
  public reads = 0
  public writes = 0
  public clears = 0
  public failRead = false
  public failClear = false

  public constructor(public value: string | null) {}

  public read(): string | null {
    this.reads += 1
    if (this.failRead) throw new Error('private read failure')
    return this.value
  }

  public write(serialized: string): void {
    this.writes += 1
    this.value = serialized
  }

  public clear(): void {
    this.clears += 1
    if (this.failClear) throw new Error('private clear failure')
    this.value = null
  }
}

function phase(kind: 'hub' | 'scene' | 'failure'): StableRunPhase {
  return createHospitalDevelopmentPreviewScenario(kind).store.getState().phase
}

function serialized(kind: 'hub' | 'scene' | 'failure'): string {
  return serializeRunSave(phase(kind), hospitalRunSaveRulesRegistry)
}

describe('production strict bootstrap', () => {
  it('returns no-run after exactly one read and no mutation', () => {
    const storage = new TrackedStorage(null)
    expect(bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toEqual({ kind: 'no-run' })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it.each([
    ['hub', 'current-day-hub'],
    ['scene', 'scene-session'],
    ['failure', 'run-failure'],
  ] as const)('strictly restores the saved %s phase into one Store', (fixture, expectedKind) => {
    const storage = new TrackedStorage(serialized(fixture))
    const result = bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') throw new Error('expected ready')
    expect(result.store.getState().phase.kind).toBe(expectedKind)
    expect(result.store.getState().phase).toEqual(phase(fixture))
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it.each([
    ['{private-invalid-json', 'corrupt-save'],
    [JSON.stringify({ private: 'run-secret-id' }), 'corrupt-save'],
  ] as const)('classifies corrupt storage without clearing it', (value, category) => {
    const storage = new TrackedStorage(value)
    expect(bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toEqual({ kind: 'load-error', category, canClear: true })
    expect(storage.value).toBe(value)
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it('classifies invalid stable payloads as corrupt without repairing them', () => {
    const envelope = JSON.parse(serialized('hub')) as Record<string, unknown>
    envelope.payload = { privateInstanceId: 'private-instance-id' }
    const value = JSON.stringify(envelope)
    const storage = new TrackedStorage(value)
    expect(bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toEqual({ kind: 'load-error', category: 'corrupt-save', canClear: true })
    expect(storage.value).toBe(value)
    expect(storage.clears).toBe(0)
  })

  it.each([
    ['saveFormatVersion', 1],
    ['saveFormatVersion', 999],
    ['rulesVersion', 'rules-secret-value'],
  ] as const)('classifies an incompatible %s without clearing it', (field, value) => {
    const envelope = JSON.parse(serialized('hub')) as Record<string, unknown>
    envelope[field] = value
    const raw = JSON.stringify(envelope)
    const storage = new TrackedStorage(raw)
    expect(bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toEqual({ kind: 'load-error', category: 'incompatible-save', canClear: true })
    expect(storage.value).toBe(raw)
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it('classifies storage read failure without offering clear', () => {
    const storage = new TrackedStorage('private serialized value')
    storage.failRead = true
    expect(bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toEqual({
      kind: 'load-error',
      category: 'storage-read-failed',
      canClear: false,
    })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it.each([
    new Error('unexpected implementation failure'),
    new RunSaveError('STORAGE_WRITE_FAILED', 'unexpected bootstrap write failure'),
  ])('rethrows unexpected bootstrap failures', (failure) => {
    const storage = new TrackedStorage(serialized('hub'))
    const registry: RunSaveRulesRegistry = Object.freeze({
      has: () => { throw failure },
      get: () => { throw failure },
      versions: () => [],
    })
    expect(() => bootstrapProductionRun({ storage, rulesRegistry: registry })).toThrow(failure)
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })
})

describe('explicit unrecoverable save clear', () => {
  it('clears exactly once on success', () => {
    const storage = new TrackedStorage('{broken')
    expect(clearUnrecoverableRunSave(storage)).toEqual({ kind: 'cleared' })
    expect(storage.value).toBeNull()
    expect(storage).toMatchObject({ reads: 0, writes: 0, clears: 1 })
  })

  it('reports one clear failure without pretending success', () => {
    const storage = new TrackedStorage('{broken')
    storage.failClear = true
    expect(clearUnrecoverableRunSave(storage)).toEqual({ kind: 'clear-failed' })
    expect(storage.value).toBe('{broken')
    expect(storage).toMatchObject({ reads: 0, writes: 0, clears: 1 })
  })
})
