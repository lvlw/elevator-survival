import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from './initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import source from '../../../docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/infected-world-entry-content-v0.1.json'
import { infectedSupplyTasks } from './catalog'
import { fixture as makeFixture } from '../../core/residence-supply/test-fixtures'
import { createTaskCatalog } from '../../core/residence-task/catalog'
describe('P01 real five-location catalog', () => {
  it('matches approved content bytes semantically and retains 24 nodes/29 bidirectional connections/3 enemies', () => {
    expect(infectedSupplyTasks.data).toEqual(source.data)
    const f = fixture()
    expect(Object.keys(f.dependencies.tasks.data.maps)).toHaveLength(5)
    expect(f.dependencies.catalog.data.nodes).toHaveLength(24)
    expect(f.dependencies.tasks.data.edges).toHaveLength(29)
    expect(f.dependencies.catalog.data.edges).toHaveLength(58)
    expect(f.value.site!.enemies).toHaveLength(3)
  })
  it('rejects dependency version mismatch, missing nodes and unknown parameters', () => {
    const f = fixture(), c = structuredClone(f.dependencies.tasks)
    expect(() => createTaskCatalog({ ...c, configurationId: 'wrong' }, f.dependencies.configuration)).toThrow()
    expect(() => createTaskCatalog({ ...c, data: { ...c.data, nodes: c.data.nodes.slice(1) } }, f.dependencies.configuration)).toThrow()
    expect(() => createTaskCatalog({ ...c, data: { ...c.data, actions: c.data.actions.map((a, n) => n ? a : { ...a, cost: 'new-rule' }) } }, f.dependencies.configuration)).toThrow()
  })
})
