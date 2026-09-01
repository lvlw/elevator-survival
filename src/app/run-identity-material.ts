export interface RunIdentityMaterial {
  readonly runId: string
  readonly seed: string
}

export interface RunIdentityMaterialSource {
  generateRunIdentityMaterial(): RunIdentityMaterial
}

export type WebCryptoRandomSource = Pick<Crypto, 'getRandomValues'>

export class RunIdentityMaterialError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'RunIdentityMaterialError'
  }
}

const BYTES_PER_VALUE = 32

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
}

/** Creates a lazy Production entropy boundary; construction consumes no entropy. */
export function createProductionRunIdentityMaterialSource(
  getCrypto: () => WebCryptoRandomSource | null | undefined = () => globalThis.crypto,
): RunIdentityMaterialSource {
  return Object.freeze({
    generateRunIdentityMaterial(): RunIdentityMaterial {
      let cryptoSource: WebCryptoRandomSource | null | undefined
      try {
        cryptoSource = getCrypto()
      } catch (error) {
        throw new RunIdentityMaterialError(
          error instanceof Error ? error.message : '无法访问Web Crypto安全随机源',
        )
      }
      if (!cryptoSource || typeof cryptoSource.getRandomValues !== 'function') {
        throw new RunIdentityMaterialError('当前环境不支持Web Crypto安全随机源')
      }
      const material = new Uint8Array(BYTES_PER_VALUE * 2)
      try {
        cryptoSource.getRandomValues(material)
      } catch (error) {
        throw new RunIdentityMaterialError(
          error instanceof Error ? error.message : 'Web Crypto安全随机生成失败',
        )
      }
      const runId = `run_${hex(material.slice(0, BYTES_PER_VALUE))}`
      const seed = `seed_${hex(material.slice(BYTES_PER_VALUE))}`
      return Object.freeze({ runId, seed })
    },
  })
}
