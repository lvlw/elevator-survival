import { describe, expect, it } from 'vitest'
import { selectApplicationEntry } from './application-entry'

describe('production and development application entry selection', () => {
  it('uses production bootstrap by default in development', () => {
    expect(selectApplicationEntry({ isDevelopment: true, search: '' })).toBe('production')
  })

  it('uses the preview only for the explicit development query', () => {
    expect(selectApplicationEntry({
      isDevelopment: true,
      search: '?dev-ui-preview=1',
    })).toBe('development-preview')
    expect(selectApplicationEntry({
      isDevelopment: true,
      search: '?dev-ui-preview=0',
    })).toBe('production')
  })

  it('ignores the preview query in production', () => {
    expect(selectApplicationEntry({
      isDevelopment: false,
      search: '?dev-ui-preview=1',
    })).toBe('production')
  })
})
