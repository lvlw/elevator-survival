import { describe, expect, it, vi } from 'vitest'
import { MemoryRunSaveStorage, hospitalRunSaveRulesRegistry } from '../state/run-save'
import { bootstrapProductionRun } from './production-bootstrap'
import {
  RunIdentityMaterialError,
  createProductionRunIdentityMaterialSource,
  type WebCryptoRandomSource,
} from './run-identity-material'

function cryptoWith(bytes: readonly number[]) {
  let calls = 0
  let lastLength = 0
  const source: WebCryptoRandomSource = {
    getRandomValues<T extends Exclude<BufferSource, ArrayBuffer>>(array: T): T {
      calls += 1
      const view = array as unknown as Uint8Array
      lastLength = view.length
      view.set(bytes)
      return array
    },
  }
  return {
    source,
    get calls() { return calls },
    get lastLength() { return lastLength },
  }
}

describe('Production RunIdentity material source', () => {
  it('is lazy across adapter construction and production bootstrap', () => {
    const fake = cryptoWith(Array.from({ length: 64 }, (_, index) => index))
    const getCrypto = vi.fn(() => fake.source)
    const source = createProductionRunIdentityMaterialSource(getCrypto)
    expect(getCrypto).not.toHaveBeenCalled()
    expect(fake.calls).toBe(0)
    expect(bootstrapProductionRun({
      storage: new MemoryRunSaveStorage(),
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })).toEqual({ kind: 'no-run' })
    expect(getCrypto).not.toHaveBeenCalled()
    expect(fake.calls).toBe(0)
    source.generateRunIdentityMaterial()
    expect(getCrypto).toHaveBeenCalledTimes(1)
    expect(fake.calls).toBe(1)
  })

  it('uses one 64-byte draw, stable hexadecimal encoding, and prefix domain separation', () => {
    const bytes = Array.from({ length: 64 }, (_, index) => index)
    const fake = cryptoWith(bytes)
    const result = createProductionRunIdentityMaterialSource(() => fake.source)
      .generateRunIdentityMaterial()
    expect(result).toEqual({
      runId: `run_${bytes.slice(0, 32).map((value) => value.toString(16).padStart(2, '0')).join('')}`,
      seed: `seed_${bytes.slice(32).map((value) => value.toString(16).padStart(2, '0')).join('')}`,
    })
    expect(result.runId).not.toBe(result.seed)
    expect(fake.lastLength).toBe(64)
  })

  it('fails explicitly without Web Crypto and never falls back', () => {
    expect(() => createProductionRunIdentityMaterialSource(() => undefined)
      .generateRunIdentityMaterial()).toThrow(RunIdentityMaterialError)
  })

  it('surfaces secure-random failures without retrying', () => {
    let calls = 0
    const crypto: WebCryptoRandomSource = {
      getRandomValues<T extends Exclude<BufferSource, ArrayBuffer>>(_array: T): T {
        calls += 1
        throw new Error('entropy denied')
      },
    }
    const source = createProductionRunIdentityMaterialSource(() => crypto)
    expect(() => source.generateRunIdentityMaterial()).toThrow(/entropy denied/)
    expect(calls).toBe(1)
  })
})
