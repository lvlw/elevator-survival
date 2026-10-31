// TEST ONLY. Production React -> BrowserOwner -> controller -> PlayerSession -> original P/R/S.
import { expect } from 'vitest'
import type { BrowserOwner, BrowserControls } from '../../app/infected-browser/types'
import type { PreplayResult } from '../../app/infected-preplay/types'
import { committedCase, type CompatibilityCase } from '../../state/residence-session/player-committed-presentation-test-fixtures'
import { allActions, ready } from '../../state/residence-session/player-test-fixtures'
import { createReservation } from '../../app/infected-browser/reservation'
import { checkpointFor } from '../../app/infected-browser/checkpoint'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../app/infected-browser/schema'
import { serializeCombatResidenceSave, deserializeCombatResidenceSave } from '../../state/residence-save/combat-codec'
import { expectation } from '../../state/residence-save/combat-test-fixtures'
import type { CombatValue, CombatDependencies } from '../../core/residence-combat/types'
import { mountUi } from './test-fixtures'

export function strictRecords(value: CombatValue, deps: CombatDependencies, seed = 'combat-seed', runId = 'combat-test-execution') {
  // These are the test producer's external construction inputs, never derived from decoded disk data.
  const initial = { runId, seed, tool: 'crow' as const, specialty: 'engineer' as const }
  const { reservation, composition } = createReservation({ characterId: deps.supply.residence.scope.characterId,
    runId: initial.runId, seed, generation: 'C1-TEST-generation' }, { tool: initial.tool, specialty: initial.specialty })
  const expected = expectation(value, deps, initial), text = serializeCombatResidenceSave(value, expected, composition.policy)
  expect(deserializeCombatResidenceSave(text, expected, composition.policy).value).toEqual(value)
  return { reservation: JSON.stringify(reservation), checkpoint: JSON.stringify(checkpointFor(reservation, { text, expected }, composition)) }
}
export function caseRecords(id: CompatibilityCase) {
  const { h, request } = committedCase(id), v = h.owner.getState().current!
  const label = allActions(ready(h.player)).find(a => a.selector === request.action)!.label
  return { ...strictRecords(v, h.deps), label }
}
export async function mountPresentation(options: { id?: CompatibilityCase; strict?: boolean;
  records?: { reservation: string; checkpoint: string }; beforeOwner?(owner: BrowserOwner): void;
  transform?(result: PreplayResult): PreplayResult } = {}) {
  const nativeCase = options.id ? caseRecords(options.id) : null
  const records = options.records ?? nativeCase
  const results: PreplayResult[] = [], originals: PreplayResult[] = [], notifications: string[] = []
  const listeners = new Set<() => void>(), retiredListeners: (() => void)[] = []
  const h = await mountUi('E03-A-seed-01', options.strict ?? false, fixture => {
    if (records) { fixture.disk.set(RESERVATION_KEY, records.reservation); fixture.disk.set(CHECKPOINT_KEY, records.checkpoint) }
    const make = fixture.make
    fixture.make = () => {
      const owner = make(); options.beforeOwner?.(owner)
      owner.subscribe(() => notifications.push(owner.getSnapshot().preplay?.status ?? owner.getSnapshot().status))
      let prior: BrowserControls | null = null, wrapped: BrowserControls | null = null
      const record = (run: () => PreplayResult) => {
        const result = run(); originals.push(result); const delivered = options.transform?.(result) ?? result; results.push(delivered); return delivered
      }
      return Object.freeze({ ...owner, controls: () => {
        const controls = owner.controls()
        if (controls !== prior) { prior = controls; wrapped = controls ? Object.freeze({ ...controls,
          execute: (input: unknown) => record(() => controls.execute(input)), confirm: (token: Parameters<BrowserControls['confirm']>[0]) => record(() => controls.confirm(token)) }) : null }
        return wrapped
      }, subscribe: (listener: () => void) => {
        listeners.add(listener); const off = owner.subscribe(listener)
        return () => { listeners.delete(listener); retiredListeners.push(listener); off() }
      } })
    }
  })
  async function combat(label = nativeCase?.label) {
    expect(label).toBeDefined(); expect(h.view().combat!.actions.some(a => a.label === label)).toBe(true)
    const button = [...h.host.querySelectorAll<HTMLButtonElement>('.iw-battle-actions .iw-action-entry > button:first-child')].find(b => b.textContent?.startsWith(label!))
    expect(button).toBeDefined(); expect(button!.disabled).toBe(false)
    await h.flush(() => button!.click()); await h.d.confirm()
  }
  return { ...h, results, originals, notifications, combat, notifyAgain: () => { for (const f of [...listeners]) f() },
    notifyRetired: () => { for (const f of retiredListeners.splice(0)) f() },
    cue: () => h.host.querySelector<HTMLElement>('.iw-committed-cue')!,
    active: () => h.host.querySelector('.iw-committed-cue--active'),
    direct: () => results.filter(r => r.presentation).at(-1)?.presentation,
    label: nativeCase?.label ?? null }
}
export function completeDom(host: HTMLElement) {
  return { html: host.innerHTML, attributes: [...host.querySelectorAll('*')].map(e => [...e.attributes].map(a => [a.name, a.value])),
    options: [...host.querySelectorAll('option')].map(o => [o.value, o.textContent]) }
}
