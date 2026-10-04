import { describe, expect, it, vi } from 'vitest'
import { planResidenceTerminal } from '../../core/residence-terminal/controlled'
import { createTerminalResidenceEnvelope, deserializeTerminalResidenceSave, serializeTerminalResidenceSave } from './terminal-index'
import { fixture, initial, normal, death, command, roundTrip, mutable, assertRejected, terminal } from './terminal-test-fixtures'

describe('B01 B02 B06 native four-state string persistence', () => {
  it('real first facts -> G1 departure -> activate -> G2 site round trips without fabricating an active fresh', () => {
    const f = initial()
    expect(f.fresh.missions[0].status).toBe('unaccepted')
    expect(roundTrip(f.fresh, f.policy).phase).toBe('fresh-hub')
    const actual = f.depart()
    expect(actual.value.character.clock).toMatchObject({ kind: 'active', taskDay: 1 })
    expect(actual.value.character.revision).toBe(1)
    expect(actual.cyclePlan.steps).toEqual([])
    expect(roundTrip(actual.value, f.policy)).toEqual(actual.value)
  })
  it.each([1, 7])('Day %i genuine normal success and failure preserve steps=[] and unadvanced body', (day) => {
    for (const success of [false, true]) {
      const f = fixture({ day, complete: success })
      const result = normal(f, success)
      expect(result.receipts[0].steps).toEqual([])
      expect(result.character.body).toEqual(f.value.character.body)
      expect(roundTrip(result, f.policy).phase).toBe('living-hub')
    }
  })
  it('real deadline living returns D8 / old T7 without executing another cycle on decode', () => {
    const f = fixture({ day: 7, node: 'b', balance: 47 })
    const result = planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot
    expect(result.character).toMatchObject({ cycle: 8, clock: { kind: 'deadline-ready', source: { taskDay: 7, endCycle: 7 } } })
    expect(result.receipts[0].steps.map((s) => s.kind)).toEqual(['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    roundTrip(result, f.policy)
  })
  it.each(['move', 'reveal', 'rest'] as const)('real G2 %s death retains producer body and source steps', (mode) => {
    const f = fixture({ hp: 1, bleeding: true, balance: 47 })
    const result = death(f, mode)
    expect(result.value.character).toEqual(result.original.snapshot.character)
    expect(result.value.receipts[0].steps).toEqual(result.original.steps)
    expect(result.value.character.clock.kind).toBe('active')
    expect(roundTrip(result.value, f.policy).phase).toBe('dead')
  })
  it.each([
    { bleeding: true, cause: 'cycle-bleeding' }, { infection: 60, cause: 'infection' }, { satiety: 1, cause: 'hunger' },
  ])('real deadline $cause death is complete, no resurrection or fake closure', ({ cause, ...options }) => {
    const f = fixture({ ...options, day: 7, node: 'b', hp: 1, balance: 47 })
    const result = planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot
    expect(result.character.cycle).toBe(7)
    expect(result.receipts[0].deathCause).toBe(cause)
    expect(roundTrip(result, f.policy).phase).toBe('dead')
  })
  it('real primary arrival death preserves passive combat-required archive', () => {
    const f = fixture({ hp: 1, arrivalDamage: 1, encounterOnArrival: true })
    const result = death(f).value
    expect(result.archives[0].site.pending).toEqual({ kind: 'combat-required', enemyId: 'guard' })
    expect(result.receipts[0].steps.map((s) => s.kind)).toEqual(['primary'])
    roundTrip(result, f.policy)
  })
  it.each([[0, 0], [19, 19], [20, 20], [47, 20]])('P%i real failure debits %i exactly once across repeated codec reads', (balance, penalty) => {
    const f = fixture({ balance, sample: true })
    const result = normal(f)
    expect(result.receipts[0].penalty).toBe(penalty)
    expect(result.balance).toBe(balance - penalty)
    roundTrip(roundTrip(result, f.policy), f.policy)
  })
  it('full reward exactly at maximum passes; over-capacity active input rejects', () => {
    const balance = terminal.config.balance_max - terminal.config.success_reward
    const f = fixture({ balance, complete: true })
    roundTrip(f.value, f.policy)
    const result = normal(f, true)
    expect(result.balance).toBe(terminal.config.balance_max)
    roundTrip(result, f.policy)
    const bad = mutable(f.value); bad.balance++
    assertRejected(bad, f.policy)
  })
})

describe('B09 B10 strict codec before JSON normalization', () => {
  it.each([
    ['{', 'INVALID_JSON'], ['null', 'INVALID_ENVELOPE'], ['[]', 'INVALID_ENVELOPE'], ['{}', 'INVALID_ENVELOPE'],
  ])('rejects %s with stable %s', (text, code) => {
    const f = initial()
    expect(() => deserializeTerminalResidenceSave(text, f.policy)).toThrowError(expect.objectContaining({ name: 'TerminalResidenceSaveError', code }))
  })
  it.each(['format', 'v1', 'future-version', 'missing-version', 'missing-state', 'extra', 'bad-version'])('rejects envelope %s', (fault) => {
    const f = initial(); const envelope = mutable(createTerminalResidenceEnvelope(f.fresh, f.policy))
    let code = 'INVALID_ENVELOPE'
    if (fault === 'format') { Reflect.set(envelope, 'format', 'other'); code = 'UNKNOWN_FORMAT' }
    if (fault === 'v1' || fault === 'future-version') { Reflect.set(envelope, 'formatVersion', fault === 'v1' ? 1 : 3); code = 'UNKNOWN_VERSION' }
    if (fault === 'missing-version') Reflect.deleteProperty(envelope, 'formatVersion')
    if (fault === 'missing-state') Reflect.deleteProperty(envelope, 'state')
    if (fault === 'extra') Object.assign(envelope, { nextPhase: 'fresh-hub' })
    if (fault === 'bad-version') Reflect.set(envelope, 'formatVersion', '2')
    expect(() => deserializeTerminalResidenceSave(JSON.stringify(envelope), f.policy)).toThrowError(expect.objectContaining({ code }))
  })
  it.each([null, [], {}, 1, undefined])('nonstring %j is not no-save', (input) => {
    const f = initial()
    // @ts-expect-error public runtime boundary must reject nonstring input
    expect(() => deserializeTerminalResidenceSave(input, f.policy)).toThrowError(expect.objectContaining({ code: 'INVALID_JSON' }))
  })
  it.each(['null', 'array', 'class', 'getter', 'nested-getter', 'non-enumerable', 'symbol', 'cycle', 'sparse', 'decorated-array', 'extra', 'missing'])('raw %s cannot be washed through JSON', (fault) => {
    const f = fixture(); const raw = mutable(f.value); const getter = vi.fn(() => 0)
    if (fault === 'getter') Object.defineProperty(raw, 'balance', { enumerable: true, get: getter })
    if (fault === 'nested-getter') Object.defineProperty(raw.character.body, 'energy', { enumerable: true, get: getter })
    if (fault === 'non-enumerable') Object.defineProperty(raw, 'private', { value: true })
    if (fault === 'symbol') Reflect.set(raw, Symbol('extra'), true)
    if (fault === 'cycle') Object.assign(raw, { cycle: raw })
    if (fault === 'sparse') raw.missions.length++
    if (fault === 'decorated-array') Object.assign(raw.missions, { note: true })
    if (fault === 'extra') Object.assign(raw, { result: {} })
    if (fault === 'missing') Reflect.deleteProperty(raw, 'receipts')
    const input = fault === 'null' ? null : fault === 'array' ? [] : fault === 'class' ? Object.assign(new (class {})(), raw) : raw
    expect(() => serializeTerminalResidenceSave(input, f.policy)).toThrowError(expect.objectContaining({ name: 'TerminalResidenceSaveError', code: 'INVALID_STATE' }))
    expect(getter).not.toHaveBeenCalled()
  })
  it.each([-1, true, '0', 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, undefined])('illegal scalar %s is rejected before serialization', (value) => {
    const f = fixture(); const raw = mutable(f.value); Reflect.set(raw, 'balance', value)
    expect(() => serializeTerminalResidenceSave(raw, f.policy)).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
  })
})
