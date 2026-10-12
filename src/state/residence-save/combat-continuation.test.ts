import { describe, expect, it } from 'vitest'
import { entered, roundtrip, maintenanceReady, maintain, bodyBoundary, win, rest } from './combat-test-fixtures'

describe('R05 genuine P continuation after codec', () => {
  it.each(['orderly', 'porter', 'technician'] as const)('%s next actual CTB command has equal complete value and cursor', enemy => {
    const h = entered(enemy), v = h.action(h.value, { kind: 'metal-pipe-basic-attack' }).snapshot
    const decoded = roundtrip(h, v).candidate.value
    // Authority is explicitly granted by the TEST coordinator, not the codec.
    const direct = h.action(v, { kind: 'defend' }).snapshot, restored = h.action(decoded, { kind: 'defend' }).snapshot
    expect(restored).toEqual(direct)
  })
  it.each(['orderly', 'porter', 'technician'] as const)('%s real retreat heal rest reentry roundtrip -> victory stays equal', enemy => {
    const h = entered(enemy, { hp: 10 })
    let v = h.action(h.value, { kind: 'metal-pipe-basic-attack' }).snapshot
    v = h.action(v, { kind: 'escape' }).snapshot
    v = roundtrip(h, v).candidate.value
    v = h.medical(v, v.carried.quickSlots.slots[0]!.instanceId).snapshot
    v = rest(h, v)
    v = h.move(v, h.value.battle!.entry.to).snapshot
    expect(v.battle!.entry.previouslyEncountered).toBe(true)
    const decoded = roundtrip(h, v).candidate.value
    const direct = win(h, v), restored = win(h, decoded)
    expect(restored).toEqual(direct); expect(restored.battles.map(b => b.outcome)).toEqual(['escaped', 'victory'])
  })
  it('legal E0 actual active battle can roundtrip without free retreat or night', () => {
    const h = entered(), v = bodyBoundary(h.value, h.deps, { energy: 0 })
    const restored = roundtrip(h, v).candidate.value
    expect(restored.battle).toEqual(v.battle); expect(restored.character).toEqual(v.character)
    expect(h.action(restored, { kind: 'metal-pipe-basic-attack' }).snapshot).toEqual(h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot)
  })
  it('retreat -> immediate real pipe repair -> roundtrip -> real reentry is equal', () => {
    const { h, v } = maintenanceReady(), repaired = maintain(h, v, 'mechanical')
    const decoded = roundtrip(h, repaired).candidate.value
    const direct = h.move(repaired, 'H4').snapshot, restored = h.move(decoded, 'H4').snapshot
    expect(restored).toEqual(direct); expect(restored.battle!.entry.previouslyEncountered).toBe(true)
    expect(restored.battles).toHaveLength(1)
  })
  it('victory -> immediate coat repair -> roundtrip -> stable move is equal', () => {
    const { h, v } = maintenanceReady('victory'), repaired = maintain(h, v, 'coat')
    expect(repaired.battles[0].outcome).toBe('victory')
    const decoded = roundtrip(h, repaired).candidate.value
    expect(h.move(decoded, 'H1').snapshot).toEqual(h.move(repaired, 'H1').snapshot)
  })
  it('actual post-exit maintenance death retains repaired state in v4', () => {
    const { h, v } = maintenanceReady()
    const start = bodyBoundary(v, h.deps, { energy: 1, condition: { ...v.character.body.condition, currentHealth: 1, bleeding: true } })
    const dead = maintain(h, start, 'mechanical')
    expect(dead.phase).toBe('dead'); expect(dead.receipts[0].source).toBe('supply-death')
    expect(roundtrip(h, dead).candidate.value).toEqual(dead)
  })
  it('real later battle after victory anchors its own death, not first entry', () => {
    const h = entered(), first = win(h, h.value)
    let v = first
    for (const n of ['H1', 'H7', 'L0', 'L1']) v = h.move(v, n).snapshot
    v = bodyBoundary(v, h.deps, { condition: { ...v.character.body.condition, currentHealth: 1, bleeding: false } })
    v = h.move(v, 'L2').snapshot
    let dead = h.action(v, { kind: 'defend' }).snapshot
    if (dead.phase !== 'dead') dead = h.action(dead, { kind: 'defend' }).snapshot
    expect(dead.phase).toBe('dead'); expect(dead.combatDeaths[0].entry.enemyId).toBe('porter')
    expect(dead.combatDeaths[0].entry.revision).toBeGreaterThan(first.battles[0].exitRevision)
    const r = roundtrip(h, dead); expect(r.e.closure!.combat!.battleId).toBe(dead.combatDeaths[0].entry.id)
    expect(r.candidate.value.battles).toEqual(first.battles)
  })
})
