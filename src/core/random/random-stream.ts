import { RandomInputError } from './random-errors'
import type { RandomCursor, RandomDraw } from './random-types'

export const RANDOM_ALGORITHM_VERSION = 'counter32-v1'

const UINT32_RANGE = 0x1_0000_0000
const MAX_DRAW_INDEX = Number.MAX_SAFE_INTEGER

function assertNonEmpty(value: string, code: 'EMPTY_SEED' | 'EMPTY_STREAM'): void {
  if (value.length === 0) {
    throw new RandomInputError(code, code === 'EMPTY_SEED' ? '种子不能为空' : '子流标识不能为空')
  }
}

function assertSupportedAlgorithm(algorithmVersion: string): void {
  if (algorithmVersion !== RANDOM_ALGORITHM_VERSION) {
    throw new RandomInputError(
      'UNSUPPORTED_ALGORITHM',
      `不支持的随机算法版本：${algorithmVersion}`,
    )
  }
}

function assertDrawIndex(drawIndex: number): void {
  if (!Number.isSafeInteger(drawIndex) || drawIndex < 0) {
    throw new RandomInputError('INVALID_DRAW_INDEX', '抽取序号必须是非负安全整数')
  }
}

function freezeCursor(cursor: RandomCursor): RandomCursor {
  return Object.freeze(cursor)
}

/**
 * FNV-1a hashes stable JavaScript UTF-16 code units into 32 bits.
 * The counter is then mixed with fixed 32-bit avalanche constants.
 * Changing either step requires a new algorithm version and golden outputs.
 */
function hashString32(value: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

function mixCounter32(baseHash: number, drawIndex: number): number {
  const low = drawIndex >>> 0
  const high = Math.floor(drawIndex / UINT32_RANGE) >>> 0
  let value =
    baseHash ^
    Math.imul(low + 1, 0x9e3779b9) ^
    Math.imul(high + 1, 0x85ebca6b)

  value ^= value >>> 16
  value = Math.imul(value, 0x21f0aaad)
  value ^= value >>> 15
  value = Math.imul(value, 0x735a2d97)
  value ^= value >>> 15

  return value >>> 0
}

function baseHashFor(cursor: RandomCursor): number {
  return hashString32(
    createStreamId(cursor.algorithmVersion, cursor.seed, cursor.streamId),
  )
}

export function createStreamId(...segments: readonly string[]): string {
  if (segments.length === 0) {
    throw new RandomInputError(
      'EMPTY_STREAM_SEGMENT',
      '子流标识至少需要一个非空片段',
    )
  }

  for (const segment of segments) {
    if (segment.length === 0) {
      throw new RandomInputError('EMPTY_STREAM_SEGMENT', '子流片段不能为空')
    }
  }

  return segments.map((segment) => `${segment.length}:${segment}`).join('|')
}

export function createRandomCursor(
  seed: string,
  streamId: string,
  drawIndex = 0,
  algorithmVersion = RANDOM_ALGORITHM_VERSION,
): RandomCursor {
  assertNonEmpty(seed, 'EMPTY_SEED')
  assertNonEmpty(streamId, 'EMPTY_STREAM')
  assertDrawIndex(drawIndex)
  assertSupportedAlgorithm(algorithmVersion)

  return freezeCursor({
    algorithmVersion,
    seed,
    streamId,
    drawIndex,
  })
}

export function drawUint32(cursor: RandomCursor): RandomDraw<number> {
  assertSupportedAlgorithm(cursor.algorithmVersion)
  assertNonEmpty(cursor.seed, 'EMPTY_SEED')
  assertNonEmpty(cursor.streamId, 'EMPTY_STREAM')
  assertDrawIndex(cursor.drawIndex)

  if (cursor.drawIndex === MAX_DRAW_INDEX) {
    throw new RandomInputError(
      'INVALID_DRAW_INDEX',
      '抽取序号已达到安全整数上限，无法生成下一游标',
    )
  }

  return Object.freeze({
    value: mixCounter32(baseHashFor(cursor), cursor.drawIndex),
    nextCursor: createRandomCursor(
      cursor.seed,
      cursor.streamId,
      cursor.drawIndex + 1,
      cursor.algorithmVersion,
    ),
  })
}

export function drawFloat01(cursor: RandomCursor): RandomDraw<number> {
  const draw = drawUint32(cursor)
  return Object.freeze({
    value: draw.value / UINT32_RANGE,
    nextCursor: draw.nextCursor,
  })
}

export function drawIntInclusive(
  cursor: RandomCursor,
  min: number,
  max: number,
): RandomDraw<number> {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
    throw new RandomInputError(
      'INVALID_INTEGER_RANGE',
      '整数区间边界必须是安全整数且 min 不得大于 max',
    )
  }

  const span = max - min + 1
  if (!Number.isSafeInteger(span) || span <= 0 || span > UINT32_RANGE) {
    throw new RandomInputError(
      'UNSUPPORTED_INTEGER_SPAN',
      '整数区间跨度必须介于1和2^32之间',
    )
  }

  const acceptanceLimit = Math.floor(UINT32_RANGE / span) * span
  let currentCursor = cursor

  for (;;) {
    const draw = drawUint32(currentCursor)
    currentCursor = draw.nextCursor

    if (draw.value < acceptanceLimit) {
      return Object.freeze({
        value: min + (draw.value % span),
        nextCursor: currentCursor,
      })
    }
  }
}

export function drawChance(
  cursor: RandomCursor,
  numerator: number,
  denominator: number,
): RandomDraw<boolean> {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0 ||
    numerator < 0 ||
    numerator > denominator
  ) {
    throw new RandomInputError(
      'INVALID_CHANCE',
      '概率必须使用满足 0 <= numerator <= denominator 的安全整数比例',
    )
  }

  if (numerator === 0 || numerator === denominator) {
    return Object.freeze({
      value: numerator === denominator,
      nextCursor: cursor,
    })
  }

  const draw = drawIntInclusive(cursor, 1, denominator)
  return Object.freeze({
    value: draw.value <= numerator,
    nextCursor: draw.nextCursor,
  })
}
