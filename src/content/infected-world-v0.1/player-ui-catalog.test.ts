import { describe, expect, it } from 'vitest'
import { infectedWorldUiCatalog } from './player-ui-catalog'
describe('static approved setup vocabulary', () => {
  it('contains all nine explicit combinations without a default or identity', () => {
    expect(infectedWorldUiCatalog.tools.map(x => x.value)).toEqual(['crow', 'lamp', 'toolbox'])
    expect(infectedWorldUiCatalog.specialties.map(x => x.value)).toEqual(['scout', 'engineer', 'survival'])
    expect(infectedWorldUiCatalog.tools.flatMap(t => infectedWorldUiCatalog.specialties.map(s => [t.value, s.value]))).toHaveLength(9)
    expect(JSON.stringify(infectedWorldUiCatalog)).not.toMatch(/seed|execution|instanceId|default|Storage/)
    expect(Object.isFrozen(infectedWorldUiCatalog.tools[0])).toBe(true)
  })
})
