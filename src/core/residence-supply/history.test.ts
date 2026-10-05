import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
import { fixture as makeFixture } from './test-fixtures'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { twoDeclarationFixture, atNode, resolvedDanger, searchAt, pickAlias } from '../residence-task/test-fixtures'
import { planSupplyTaskAction } from '../residence-task/actions'
import { planSupplyRest } from './controlled'
import { planSupplyTerminal, consumeSupplyDeath } from '../residence-terminal/supply-terminal'
import { readSupplyValue } from './validation'
describe('P12 two TEST declarations preserve actual prior history', () => {
  it.each(['success', 'voluntary-failure'] as const)('old %s closure remains unchanged through new real source and death', outcome => {
    const { f, next } = twoDeclarationFixture(fixture())
    let v = resolvedDanger(f)
    const act = (id: string, extra = {}) => { v = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: id, ...extra }, f.authorize(v)).snapshot }
    if (outcome === 'success') {
      v = atNode(f, v, 'P1'); act('power-survey'); act('power')
      v = atNode(f, v, 'L2'); act('verify', { method: 'full' }); act('fix', { method: 'manual' })
      act('component', { placement: { x: 0, y: 0, rotated: false } })
      v = atNode(f, v, 'C1'); act('match', { method: 'fast' })
      v = atNode(f, v, 'C3'); act('module', { placement: { x: 2, y: 0, rotated: false } })
      v = searchAt(f, v, 'C4-cabinet'); v = pickAlias(f, v, 'metal', 4); v = pickAlias(f, v, 'electronic', 5)
      v = atNode(f, v, 'H8')
      act('install', { inputs: v.carried.backpack.items.map(i => ({ instanceId: i.instanceId, quantity: 1 })) })
      v = planSupplyRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
      v = atNode(f, v, 'H5'); act('sample', { method: 'cautious', placement: { x: 0, y: 0, rotated: false } })
    }
    v = atNode(f, v, 'H0')
    const old = planSupplyTerminal(v, { kind: outcome === 'success' ? 'deliver' : 'withdraw', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    const oldHistory = JSON.stringify({ receipts: old.receipts, dispositions: old.dispositions, archives: old.archives })
    const second = next(old)
    let s = searchAt(second, second.value, 'H1-search')
    expect(s.origins.filter(o => o.producerId === 'H1-search')).toHaveLength(1)
    expect(s.character.identity).toEqual(old.character.identity)
    s = readSupplyValue({ ...s, character: { ...s.character, body: { ...s.character.body, condition: { ...s.character.body.condition, currentHealth: 1, bleeding: true } } } }, second.dependencies)
    const action = planSupplyTaskAction(s, { kind: 'task', expectedRevision: s.character.revision, actionId: 'fire-door', method: 'toolbox',
      toolInstanceId: s.carried.equipment.utility!.instanceId }, second.authorize(s))
    const death = consumeSupplyDeath(s, action, second.authorize(s)).snapshot
    expect(death.balance).toBe(0); expect(death.phase).toBe('dead')
    expect(JSON.stringify({ receipts: death.receipts.slice(0, 1), dispositions: death.dispositions.slice(0, old.dispositions.length), archives: death.archives.slice(0, 1) })).toBe(oldHistory)
    expect(death.character.revision).toBe(s.character.revision + 1)
    expect(() => readSupplyValue({ ...death, receipts: death.receipts.map((r, n) => n ? r : { ...r, reward: 999 }) }, second.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...death, origins: death.origins.map(o => o.producerId === 'H1-toolbox' ? { ...o, binding: old.archives[0].site.binding } : o) }, second.dependencies)).toThrow()
  })
})
