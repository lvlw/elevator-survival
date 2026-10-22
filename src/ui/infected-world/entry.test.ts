import { describe, expect, it } from 'vitest'
import { selectApplicationEntry } from '../../app/application-entry'

describe('isolated infected-world entry', () => {
  it.each([
    [false, '?dev-infected-world=1', 'production'],
    [false, '?dev-ui-preview=1&dev-infected-world=1', 'production'],
    [true, '', 'production'],
    [true, '?dev-infected-world=0', 'production'],
    [true, '?dev-infected-world=1', 'infected-world-playtest'],
    [true, '?dev-ui-preview=1&dev-infected-world=1', 'development-preview'],
  ])('DEV=%s %s selects %s without composition side effects', (isDevelopment, search, expected) => {
    expect(selectApplicationEntry({ isDevelopment, search })).toBe(expected)
  })
})
