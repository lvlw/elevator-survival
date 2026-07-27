import { describe, expect, it } from 'vitest'
import {
  RANDOM_ALGORITHM_VERSION,
  RandomInputError,
  createRandomCursor,
  createStreamId,
  drawChance,
  drawFloat01,
  drawIntInclusive,
  drawUint32,
  type RandomCursor,
} from '.'

const SEARCH_STREAM = createStreamId('scene', 'emergency-hall', 'search')
const INJURY_STREAM = createStreamId(
  'combat',
  'infected-orderly',
  'injury-risk',
)

function drawUint32Sequence(
  initialCursor: RandomCursor,
  count: number,
): { readonly values: readonly number[]; readonly cursor: RandomCursor } {
  const values: number[] = []
  let cursor = initialCursor

  for (let index = 0; index < count; index += 1) {
    const draw = drawUint32(cursor)
    values.push(draw.value)
    cursor = draw.nextCursor
  }

  return { values, cursor }
}

describe('versioned random algorithm golden outputs', () => {
  it.each([
    {
      seed: 'alpha-seed',
      streamId: SEARCH_STREAM,
      expected: [
        1_578_259_410, 2_845_424_974, 1_114_229_421, 2_568_269_331,
        1_681_688_645,
      ],
    },
    {
      seed: 'alpha-seed',
      streamId: INJURY_STREAM,
      expected: [
        2_991_008_225, 2_178_993_513, 3_025_672_391, 752_016_186,
        3_852_117_935,
      ],
    },
    {
      seed: 'beta-seed',
      streamId: SEARCH_STREAM,
      expected: [
        2_908_751_577, 1_620_044_478, 627_922_792, 1_374_751_607,
        516_554_015,
      ],
    },
    {
      seed: 'beta-seed',
      streamId: INJURY_STREAM,
      expected: [
        2_508_856_100, 3_349_876_917, 1_453_837_229, 3_001_425_790,
        1_892_509_298,
      ],
    },
  ])('keeps $seed / $streamId stable', ({ seed, streamId, expected }) => {
    expect(
      drawUint32Sequence(createRandomCursor(seed, streamId), expected.length)
        .values,
    ).toEqual(expected)
  })
})

describe('random cursors and named streams', () => {
  it('replays the same sequence from the same cursor', () => {
    const cursor = createRandomCursor('repeatable', SEARCH_STREAM)
    const first = drawUint32(cursor)
    const replay = drawUint32(cursor)

    expect(drawUint32Sequence(cursor, 20).values).toEqual(
      drawUint32Sequence(cursor, 20).values,
    )
    expect(replay).toEqual(first)
    expect(replay.nextCursor).not.toBe(cursor)
  })

  it('changes output when seed, stream, or draw index changes', () => {
    const baseline = drawUint32(createRandomCursor('seed-a', SEARCH_STREAM)).value

    expect(drawUint32(createRandomCursor('seed-b', SEARCH_STREAM)).value).not.toBe(
      baseline,
    )
    expect(drawUint32(createRandomCursor('seed-a', INJURY_STREAM)).value).not.toBe(
      baseline,
    )
    expect(
      drawUint32(createRandomCursor('seed-a', SEARCH_STREAM, 1)).value,
    ).not.toBe(baseline)
  })

  it('returns immutable cursors without mutating the input cursor', () => {
    const cursor = createRandomCursor('immutable', SEARCH_STREAM, 12)
    const draw = drawUint32(cursor)

    expect(cursor.drawIndex).toBe(12)
    expect(draw.nextCursor.drawIndex).toBe(13)
    expect(Object.isFrozen(cursor)).toBe(true)
    expect(Object.isFrozen(draw)).toBe(true)
    expect(Object.isFrozen(draw.nextCursor)).toBe(true)
  })

  it('keeps one named stream independent from draws in another stream', () => {
    const searchCursor = createRandomCursor('shared-seed', SEARCH_STREAM)
    const injuryCursor = createRandomCursor('shared-seed', INJURY_STREAM)
    const injuryBefore = drawUint32Sequence(injuryCursor, 2).values

    drawUint32Sequence(searchCursor, 5)
    const injuryAfterFiveSearchDraws = drawUint32Sequence(injuryCursor, 2).values
    drawUint32Sequence(searchCursor, 20)
    const injuryAfterTwentySearchDraws = drawUint32Sequence(injuryCursor, 2).values

    expect(injuryAfterFiveSearchDraws).toEqual(injuryBefore)
    expect(injuryAfterTwentySearchDraws).toEqual(injuryBefore)
  })

  it('encodes stream segments without separator ambiguity', () => {
    expect(createStreamId('ab', 'c')).toBe('2:ab|1:c')
    expect(createStreamId('a', 'bc')).toBe('1:a|2:bc')
    expect(createStreamId('ab', 'c')).not.toBe(createStreamId('a', 'bc'))
    expect(createStreamId('空 格', 'a|b', '123', '😀')).toBe(
      '3:空 格|3:a|b|3:123|2:😀',
    )
    expect(createStreamId('same', 'segments')).toBe(
      createStreamId('same', 'segments'),
    )
  })
})

describe('random value helpers', () => {
  it('draws uint32 and float values inside their documented ranges', () => {
    let uintCursor = createRandomCursor('range', SEARCH_STREAM)
    let floatCursor = createRandomCursor('range', INJURY_STREAM)

    for (let index = 0; index < 1_000; index += 1) {
      const uintDraw = drawUint32(uintCursor)
      const floatDraw = drawFloat01(floatCursor)

      expect(Number.isInteger(uintDraw.value)).toBe(true)
      expect(uintDraw.value).toBeGreaterThanOrEqual(0)
      expect(uintDraw.value).toBeLessThanOrEqual(0xffff_ffff)
      expect(floatDraw.value).toBeGreaterThanOrEqual(0)
      expect(floatDraw.value).toBeLessThan(1)

      uintCursor = uintDraw.nextCursor
      floatCursor = floatDraw.nextCursor
    }
  })

  it('draws inclusive integers, including a single negative value', () => {
    let cursor = createRandomCursor('integer-range', SEARCH_STREAM)

    for (let index = 0; index < 1_000; index += 1) {
      const draw = drawIntInclusive(cursor, -7, 11)
      expect(Number.isInteger(draw.value)).toBe(true)
      expect(draw.value).toBeGreaterThanOrEqual(-7)
      expect(draw.value).toBeLessThanOrEqual(11)
      cursor = draw.nextCursor
    }

    const single = drawIntInclusive(cursor, -3, -3)
    expect(single.value).toBe(-3)
    expect(single.nextCursor.drawIndex).toBe(cursor.drawIndex + 1)
  })

  it('rejects out-of-bucket values and advances by every actual draw', () => {
    const cursor = createRandomCursor('rejection-seed', SEARCH_STREAM)
    const draw = drawIntInclusive(cursor, 0, 2_147_483_648)

    expect(draw.value).toBe(1_937_122_019)
    expect(draw.nextCursor.drawIndex).toBe(8)
  })

  it('handles impossible, certain, and intermediate integer-ratio chances', () => {
    const cursor = createRandomCursor('chance', SEARCH_STREAM)
    const impossible = drawChance(cursor, 0, 7)
    const certain = drawChance(cursor, 7, 7)
    const intermediate = drawChance(cursor, 3, 7)

    expect(impossible).toEqual({ value: false, nextCursor: cursor })
    expect(certain).toEqual({ value: true, nextCursor: cursor })
    expect(intermediate.value).toBe(true)
    expect(intermediate.nextCursor.drawIndex).toBe(1)
  })
})

describe('random input validation', () => {
  it.each([
    () => createRandomCursor('', SEARCH_STREAM),
    () => createRandomCursor('seed', ''),
    () => createRandomCursor('seed', SEARCH_STREAM, -1),
    () => createRandomCursor('seed', SEARCH_STREAM, 0.5),
    () => createRandomCursor('seed', SEARCH_STREAM, 0, 'unknown-v1'),
    () => createStreamId(),
    () => createStreamId('valid', ''),
    () => drawIntInclusive(createRandomCursor('seed', SEARCH_STREAM), 2, 1),
    () => drawIntInclusive(createRandomCursor('seed', SEARCH_STREAM), 0.5, 2),
    () =>
      drawIntInclusive(
        createRandomCursor('seed', SEARCH_STREAM),
        0,
        0x1_0000_0000,
      ),
    () => drawChance(createRandomCursor('seed', SEARCH_STREAM), -1, 10),
    () => drawChance(createRandomCursor('seed', SEARCH_STREAM), 11, 10),
    () => drawChance(createRandomCursor('seed', SEARCH_STREAM), 1, 0),
  ])('rejects invalid input %#', (operation) => {
    expect(operation).toThrow(RandomInputError)
  })

  it('rejects a cursor that cannot advance safely', () => {
    expect(() =>
      drawUint32({
        algorithmVersion: RANDOM_ALGORITHM_VERSION,
        seed: 'seed',
        streamId: SEARCH_STREAM,
        drawIndex: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrow(RandomInputError)
  })
})
