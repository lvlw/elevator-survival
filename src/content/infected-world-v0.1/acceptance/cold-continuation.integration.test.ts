import { expect, test, afterEach, vi } from 'vitest'
import { executeRoute } from './e03-test-routes'
import { witnesses } from './e03-test-seeds'
import { observe } from './e03-test-observers'
import { emitReport } from './e03-test-report'
import { expectation } from '../../../state/residence-save/combat-test-fixtures'
afterEach(() => vi.restoreAllMocks())
const executions = new Map<string, ReturnType<typeof executeRoute>>()
for (const w of witnesses) test(`E03 cold checkpoint setup from true null ${w.route}`, () => {
  const execution = executeRoute(w.seed, w.tool, w.specialty, w.route)
  expect(execution.result.outcome).toBe('success'); executions.set(w.route, execution)
})
for (const w of witnesses) test(`E03 cold continuation complete-value equality ${w.route}`, async () => {
  const { h, result } = executions.get(w.route)!
  expect(result.outcome).toBe('success')
  const index = w.route === 'route-segmented' ? h.ledger.findIndex(l => l.family === 'maintenance') :
    w.route === 'route-toolbox' ? h.ledger.findIndex(l => l.family === 'maintenance') :
      w.route === 'route-hotel-benefit' ? h.ledger.findIndex(l => l.family === 'source' && JSON.stringify(l.command).includes('T1-exchange')) :
        h.checkpoints.findIndex(p => p.value.battle !== null)
  expect(index).toBeGreaterThan(0)
  const o = observe(h); o.clear()
  const cold = h.cold(h.checkpoints[index])
  expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(() => 0))
  for (const step of h.ledger.slice(index + 1)) {
    const before = cold.owner.getState().current!
    const result = cold.owner.dispatch(step.command)
    expect(result.current.character.revision).toBe(before.character.revision + 1)
  }
  expect(cold.owner.getState().current).toEqual(h.current())
  expect(cold.writes).toHaveBeenCalledTimes(h.ledger.length - index - 1)
  await emitReport('cold-' + w.route, { checkpoint: index, coldReads: 1, coldWrites: 0,
    continuationCommands: cold.writes.mock.calls.length, completeEquality: true })
})
for (const stop of ['retreat','component','installed','terminal'] as const) test(`E03 additional native saved ${stop} boundary resumes full result`,()=>{
  const h=executions.get(stop==='retreat'?'route-segmented':'route-hotel-bypass')!.h
  const index=stop==='retreat'?h.checkpoints.findIndex(p=>p.value.battles.at(-1)?.outcome==='escaped'):
    stop==='component'?h.ledger.findIndex(l=>l.family==='task'&&JSON.stringify(l.command).includes('"component"')):
      stop==='installed'?h.ledger.findIndex(l=>l.family==='task'&&JSON.stringify(l.command).includes('"install"')):h.checkpoints.length-1
  expect(index).toBeGreaterThan(0);const cold=h.cold(h.checkpoints[index])
  for(const step of h.ledger.slice(index+1))cold.owner.dispatch(step.command)
  expect(cold.owner.getState().current).toEqual(h.current())
})
test('E03 mixed-route save failure retains latest memory and retry never replays', async () => {
  const { h } = executeRoute('E03-A-seed-01', 'crow', 'engineer')
  const checkpoint = h.checkpoints.find(p => p.value.battle !== null)!
  const cold = h.cold(checkpoint), o = observe(h); o.clear()
  let fail = true, disk = checkpoint.text, writes = 0, notifications = 0, dispatches = 0
  // Independent domain uses exactly the saved bytes/expected; only the port fails.
  const { createCombatSession, createResidenceSessionDomain } = await import('../../../state/residence-session/combat-controlled')
  const owner = createCombatSession(createResidenceSessionDomain(), { policy: h.policy, startup: 'existing',
    provideColdExpectation: () => checkpoint.expected, storage: { read: () => disk, write: text => { writes++; if (fail) throw new Error('disk'); disk = text } } })
  owner.bootstrap(); owner.subscribe(() => { notifications++ })
  const start = owner.getState().current!, command = { kind: 'combat', command: { kind: 'combat-action',
    expectedRevision: start.character.revision, expectedBattleId: start.battle!.entry.id, command: { kind: 'metal-pipe-charged-strike' } } }
  expect(owner.dispatch(command).persistence).toBe('save-failed');dispatches++
  expect(writes).toBe(1); expect(notifications).toBe(1)
  for(let n=0;owner.getState().current!.battle&&n<5;n++) {
    const v=owner.getState().current!
    expect(owner.dispatch({kind:'combat',command:{kind:'combat-action',expectedRevision:v.character.revision,
      expectedBattleId:v.battle!.entry.id,command:{kind:'metal-pipe-basic-attack'}}}).persistence).toBe('save-failed');dispatches++
  }
  let latest=owner.getState().current!;expect(latest.battle).toBeNull()
  const wound=latest.character.body.condition.openWounds.find(w=>w.treatment==='untreated')
  expect(owner.dispatch({kind:'medical',command:{kind:'medical',expectedRevision:latest.character.revision,
    instanceId:latest.carried.quickSlots.slots[0]!.instanceId,...(wound?{woundId:wound.id}:{})}}).persistence).toBe('save-failed');dispatches++
  latest=owner.getState().current!
  expect(owner.dispatch({kind:'move',command:{kind:'move',expectedRevision:latest.character.revision,edgeId:'L1-L2:reverse'}}).persistence).toBe('save-failed');dispatches++
  const committed = owner.getState().current!, counts = o.counts(); fail = false
  const independentlyRetained = expectation(committed,h.deps,h.initial)
  expect(owner.retrySave().persistence).toBe('saved')
  expect(owner.getState().current).toBe(committed); expect(o.counts()).toEqual(counts)
  expect(writes).toBe(dispatches+1); expect(notifications).toBe(dispatches)
  expect(cold.owner.getState().current).toEqual(start) // last successful old checkpoint is not latest unsaved memory
  const { deserializeCombatResidenceSave }=await import('../../../state/residence-save/combat-codec')
  expect(deserializeCombatResidenceSave(disk,independentlyRetained,h.policy).value).toEqual(committed)
  await emitReport('mixed-save-failure', { dispatch: dispatches, writeAttempts: writes, notifications, retryGameplay: 0, beforeRetry:counts })
})
