import { describe, expect, it } from 'vitest'
import { entered, fixture, mutable, rejectAll, atDay, rest, maintenanceReady, context } from './combat-test-fixtures'
import { readCombatValue } from '../../core/residence-combat/validation'
import { validateCombatResidenceHistory } from './combat-history'
import { deserializeCombatResidenceSave } from './combat-codec'
import { planCombatTerminal } from '../../core/residence-combat/controlled'
import { wire } from './combat-test-fixtures'

describe('R06 R07 R08 joint chronological and source history', () => {
  it.each(['entry-revision', 'edge', 'execution', 'repeat-exit', 'fee', 'elapsed', 'enemy-reset', 'risk',
    'count', 'use', 'quota', 'first-bandage', 'source-share', 'wallet', 'archive'] as const)('rejects joint %s', fault => {
      const h = entered('orderly', { hp: 8 }), hit = h.action(h.value, { kind: 'use-quick-slot-item', quickSlotIndex: 0 },
        { instanceId: h.value.carried.quickSlots.slots[0]!.instanceId }).snapshot
      const v = h.action(hit, { kind: 'escape' }).snapshot, bad = mutable(v), b = bad.battles[0]
      if (fault === 'entry-revision') b.entry.revision++
      if (fault === 'edge') b.entry.edgeId = 'H0-H1:forward'
      if (fault === 'execution') b.entry.binding.execution.runId = 'foreign'
      if (fault === 'repeat-exit') bad.battles.push(structuredClone(b))
      if (fault === 'fee') b.requestedEnergy++
      if (fault === 'elapsed') b.elapsed++
      if (fault === 'enemy-reset') bad.site!.enemies.find(e => e.id === 'orderly')!.state.hasBeenEncountered = false
      if (fault === 'risk') b.decision.riskAfter++
      if (fault === 'count') b.decision.actionCountAfter++
      if (fault === 'use') b.decision.uses = [{ instanceId: 'missing', definitionId: 'missing', slot: 0,
        dispositionIds: ['missing'], kind: 'bandage', quantity: 1 }]
      if (fault === 'quota') bad.character.body.quotasRemaining.pipe_signature = 999
      if (fault === 'first-bandage') bad.choices.firstBandageUsed = false
      if (fault === 'source-share') bad.allocations[0].ranges[0].end++
      if (fault === 'wallet') bad.balance++
      if (fault === 'archive') bad.archives.push({ site: bad.site!, itemStates: bad.itemStates, witnesses: [] })
      expect(rejectAll(h, v, bad)).toEqual(Array(3).fill('INVALID_STATE'))
    })
  it('R-only historical fee body capacity rejects even when actual P aggregate accepts', () => {
    const { h, v } = maintenanceReady(), bad = mutable(v), b = bad.battles[0]
    b.energyBefore = h.deps.supply.residence.configuration.config.limits.energy + 1
    b.energyAfter = b.energyBefore - b.requestedEnergy
    expect(readCombatValue(bad, h.deps)).toEqual(bad)
    expect(rejectAll(h, v, bad)).toEqual(Array(3).fill('INVALID_STATE'))
  })
  it.each(['primary-fields', 'arrival-exposure', 'bleeding-amplitude'] as const)('entry %s is checked without replay', fault => {
    const h = entered('orderly', { hp: 12, bleeding: true }), bad = mutable(h.value)
    const e = bad.battle!.entry
    if (fault === 'primary-fields') e.steps[0].facts.extra = 0
    if (fault === 'arrival-exposure') e.steps[0].facts.exposuresAdded = 1
    if (fault === 'bleeding-amplitude') e.steps[1].facts.damage = 2
    expect(readCombatValue(bad, h.deps)).toEqual(bad)
    expect(rejectAll(h, h.value, bad)).toEqual(Array(3).fill('INVALID_STATE'))
  })
  it.each(['action-amplitude', 'night-amplitude', 'Day7-rest-source'] as const)('retains old G1/P %s rejection', fault => {
    const h = fixture({ hp: fault === 'action-amplitude' ? 1 : 12, bleeding: fault === 'action-amplitude' })
    let v
    if (fault === 'action-amplitude') v = h.move(h.value, 'H1').snapshot
    else {
      const arrived = h.move(h.value, 'H1').snapshot
      const start = atDay({ ...arrived, character: { ...arrived.character, body: { ...arrived.character.body,
        condition: { ...arrived.character.body.condition, currentHealth: 1, bleeding: true } } } }, h, 7)
      v = planCombatTerminal(start, { kind: 'deadline', expectedRevision: start.character.revision }, h.authorize(start)).snapshot
    }
    const bad = mutable(v)
    if (fault === 'action-amplitude') {
      const [p, b] = bad.receipts[0].steps; p.healthBefore = p.healthAfter = b.healthBefore = 2; b.facts.damage = 2
    } else if (fault === 'night-amplitude') {
      bad.receipts[0].steps[0].healthBefore = 3; bad.receipts[0].steps[0].facts.damage = 3
    } else bad.receipts[0].source = 'supply-death'
    expect(readCombatValue(bad, h.deps)).toEqual(bad)
    expect(() => validateCombatResidenceHistory(bad, h.deps)).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
    const { e, policy } = context(h, v)
    // A contradictory external source does not waive the stored-history constraints.
    if (fault === 'Day7-rest-source') e.closure!.source = 'supply-death'
    expect(() => deserializeCombatResidenceSave(wire(bad), e, policy)).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
  })
  it('reentry retained prior count/risk cannot borrow first-entry anchors', () => {
    const h = entered(), escaped = h.action(h.value, { kind: 'escape' }).snapshot
    const next = h.move(escaped, 'H4').snapshot, bad = mutable(next)
    bad.battle!.entry.previouslyEncountered = false
    expect(rejectAll(h, next, bad)).toEqual(Array(3).fill('INVALID_STATE'))
  })
  it('actual Day6 rest death is not broadly banned', () => {
    const h = fixture(), arrived = h.move(h.value, 'H1').snapshot
    const start = atDay({ ...arrived, character: { ...arrived.character, body: { ...arrived.character.body,
      condition: { ...arrived.character.body.condition, currentHealth: 1, bleeding: true } } } }, h, 6)
    expect(rest(h, start).phase).toBe('dead')
  })
})

import { completeSuccess, roundtrip } from './combat-test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { createCombatAuthority, createResidenceCombatDependencies, planCombatMove, planCombatTask, resolveResidenceCombatAction } from '../../core/residence-combat/controlled'
import { fixture as legacyFixture } from '../../core/residence-supply/test-fixtures'
import { twoDeclarationFixture, resolvedDanger, atNode, searchAt, pickAlias } from '../../core/residence-task/test-fixtures'
import { planSupplyTaskAction } from '../../core/residence-task/actions'
import { planSupplyRest } from '../../core/residence-supply/controlled'
import { planSupplyTerminal } from '../../core/residence-terminal/supply-terminal'
import { cycleContext } from '../../core/residence-supply/shared-validation'

describe('R08 actual sample install and prior-declaration material history', () => {
  it('complete real three-enemy success roundtrip keeps actual installed inputs and delivered sample', () => {
    const {h,end,sample}=completeSuccess()
    expect(end.phase).toBe('living-hub');expect(end.balance).toBe(120)
    expect(end.battles.map(b=>b.entry.enemyId).sort()).toEqual(['orderly','porter','technician'])
    expect(end.battles.every(b=>b.outcome==='victory')).toBe(true)
    expect(end.dispositions.filter(d=>d.kind==='installed')).toHaveLength(4)
    expect(end.dispositions.find(d=>d.kind==='delivered')!.item).toEqual(sample)
    const restored=roundtrip(h,end,{runId:'combat-test-execution',seed:'combat-seed',tool:'toolbox',specialty:'engineer'})
    expect(restored.candidate.value).toEqual(end)
    for(const fault of ['installed','delivered','origin','wallet'] as const) {
      const bad=mutable(end)
      if(fault==='installed') bad.dispositions.find(d=>d.kind==='installed')!.kind='consumed'
      if(fault==='delivered') bad.dispositions.find(d=>d.kind==='delivered')!.kind='partial-delivery'
      if(fault==='origin') bad.origins.find(o=>o.kind==='task')!.quantity++
      if(fault==='wallet') bad.balance++
      expect(rejectAll(h,end,bad,{runId:'combat-test-execution',seed:'combat-seed',tool:'toolbox',specialty:'engineer'})).toEqual(Array(3).fill('INVALID_STATE'))
    }
  })
  it.each(['success','voluntary-failure'] as const)('R08 old actual %s history plus second-declaration true CTB death roundtrips without rewrites',outcome=>{
    const original=createInfectedCombatDependencies('two-declaration-test')
    const {f,next}=twoDeclarationFixture(legacyFixture(original.supply))
    // Only the OLDER archived execution uses the existing isolated danger-cleared TEST fixture.
    // The second execution enters and kills through real movement/CTB; no enemy is cleared there.
    let old=resolvedDanger(f)
    const task=(id:string,extra={})=>{old=planSupplyTaskAction(old,{kind:'task',expectedRevision:old.character.revision,actionId:id,...extra},f.authorize(old)).snapshot}
    if(outcome==='success'){
      old=atNode(f,old,'P1');task('power-survey');task('power')
      old=atNode(f,old,'L2');task('verify',{method:'full'});task('fix',{method:'manual'});task('component',{placement:{x:0,y:0,rotated:false}})
      old=atNode(f,old,'C1');task('match',{method:'fast'})
      old=atNode(f,old,'C3');task('module',{placement:{x:2,y:0,rotated:false}})
      old=searchAt(f,old,'C4-cabinet');old=pickAlias(f,old,'metal',4);old=pickAlias(f,old,'electronic',5)
      old=atNode(f,old,'H8');task('install',{inputs:old.carried.backpack.items.map(i=>({instanceId:i.instanceId,quantity:1}))})
      old=planSupplyRest(old,{kind:'rest',expectedRevision:old.character.revision},f.authorize(old)).snapshot
      old=atNode(f,old,'H5');task('sample',{method:'cautious',placement:{x:0,y:0,rotated:false}})
    }
    old=atNode(f,old,'H0')
    const closed=planSupplyTerminal(old,{kind:outcome==='success'?'deliver':'withdraw',expectedRevision:old.character.revision},f.authorize(old)).snapshot
    const second=next(closed),deps=createResidenceCombatDependencies(second.dependencies,original.profiles)
    // Explicit TEST older-history material import, not a production protocol conversion API.
    let v=readCombatValue({...second.value,protocol:'residence-combat-pure-v1',battle:null,battles:[],combatDeaths:[]},deps)
    const auth=(x:typeof v)=>createCombatAuthority(x,{cycle:cycleContext(x.character,deps.supply,x.site?.nodeId??null),missions:x.missions},deps)
    v=planCombatMove(v,{kind:'move',edgeId:'H0-H1:forward',expectedRevision:v.character.revision},auth(v)).snapshot
    v=planCombatTask(v,{kind:'task',actionId:'fire-door',method:'toolbox',toolInstanceId:v.carried.equipment.utility!.instanceId,expectedRevision:v.character.revision},auth(v)).snapshot
    v=readCombatValue({...v,character:{...v.character,body:{...v.character.body,condition:{...v.character.body.condition,currentHealth:1}}}},deps)
    v=planCombatMove(v,{kind:'move',edgeId:'H1-H4:forward',expectedRevision:v.character.revision},auth(v)).snapshot
    const end=resolveResidenceCombatAction(v,{kind:'combat-action',command:{kind:'use-quick-slot-item',quickSlotIndex:0},
      instanceId:v.carried.quickSlots.slots[0]!.instanceId,expectedRevision:v.character.revision},auth(v)).snapshot
    expect(end.phase).toBe('dead');expect(end.balance).toBe(0)
    expect(end.receipts[0]).toEqual(closed.receipts[0]);expect(end.archives[0]).toEqual(closed.archives[0])
    expect(end.dispositions.slice(0,closed.dispositions.length)).toEqual(closed.dispositions)
    expect(end.receipts[1].forfeited).toBe(closed.balance)
    expect(end.combatDeaths[0].entry.binding.execution.runId).toBe('TEST-second-execution')
    expect(readCombatValue(end,deps)).toEqual(end)
    const restored=roundtrip({deps},end,{runId:'test-execution',seed:'test-seed',tool:'toolbox',specialty:'engineer'})
    expect(restored.candidate.value).toEqual(end)
    const corrupt=mutable(end);corrupt.receipts[0].before++
    expect(rejectAll({deps},end,corrupt,{runId:'test-execution',seed:'test-seed',tool:'toolbox',specialty:'engineer'})).toEqual(Array(3).fill('INVALID_STATE'))
  })
})
