import { describe, expect, it } from 'vitest'
import { infectedWorldOpponentPresentation as resolve } from './player-opponent-catalog'

describe('A content closed presentation catalog', () => {
  it.each([['orderly', '感染护工'], ['porter', '感染装卸工'], ['technician', '感染技术员']])('maps only exact %s definition', (key, name) => {
    const value = resolve('infected-world-' + key)
    expect(value).toEqual({ kind: 'known', visualKey: 'infected-' + key, name })
    expect(Reflect.ownKeys(value).sort()).toEqual(['kind', 'name', 'visualKey'])
    expect(Object.isFrozen(value)).toBe(true)
  })
  it.each(['', 'H4', 'orderly', 'infected-world-orderly:private', '__proto__', 'constructor', 'infected-world-new'])('fixed unknown for %s', input => {
    expect(resolve(input)).toEqual({ kind: 'unknown', visualKey: null, name: '当前对手' })
  })
})
