// TEST ONLY. Observe original return values once; never a production event bus or UI projector.
import { expect } from 'vitest'
import { observe } from './combat-test-observers'
import type { PlayerHarness } from './player-test-fixtures'
import type { PlayerRequest } from './player-types'
import type { CombatSessionCommit } from './combat-types'

export function probeMotion(h: PlayerHarness, label: string, request: PlayerRequest) {
  const observer = observe(h), before = h.owner.getState().current!
  observer.clear(); h.dispatch.mockClear()
  const execution = h.player.execute(request)
  expect(execution.kind).toBe('committed')
  expect(h.dispatch).toHaveBeenCalledTimes(1)
  const result = h.dispatch.mock.results[0]
  expect(result.type).toBe('return')
  const commit = result.value as CombatSessionCommit, value = commit.current
  expect(value).toBe(h.owner.getState().current)
  expect(value.character.revision).toBe(before.character.revision + 1)
  expect(Object.keys(execution).sort()).toEqual(['kind', 'preview', 'view'])
  expect(Object.keys(commit).sort()).toEqual(['current', 'kind', 'maintenance', 'notificationErrors', 'persistence'])
  expect(observer.counts()).toMatchObject({ combat: 1, ctb: 1, current: 1, write: 1, batches: 1 })
  const pure = observer.spies.combat.mock.results[0].value!
  expect(pure.snapshot).toEqual(value)
  const decision = value.battle?.decision ?? value.combatDeaths.at(-1)?.decision ?? value.battles.at(-1)?.decision
  expect(decision?.revision).toBe(value.character.revision)
  // Internal kinds/counts below are audit evidence, not proposed public per-response facts.
  console.log('B-SOURCE ' + JSON.stringify({ label, pureKeys: Object.keys(pure).sort(), commitKeys: Object.keys(commit).sort(),
    executionKeys: Object.keys(execution).sort(), phase: value.phase, persistence: commit.persistence,
    internal: { command: decision!.command.kind, enemyResponses: decision!.enemyResponses,
      traceKinds: decision!.trace.map(t => t.kind), queueReasons: decision!.queue.map(q => q.reason) }, counts: observer.counts() }))
  return { execution, commit, pure, decision: decision!, observer }
}
