// TEST ONLY. Existing maintenance producer/boundary + strict codec + real React/BrowserOwner.
import { act, createElement, Profiler } from 'react'
import { createRoot } from 'react-dom/client'
import { vi } from 'vitest'
import { browserFixture } from '../../app/infected-browser/test-fixtures'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../app/infected-browser/schema'
import type { BrowserOwner } from '../../app/infected-browser/types'
import type { PlayerReadyView } from '../../state/residence-session/player-types'
import { maintenanceReady, bodyBoundary } from '../../state/residence-save/combat-test-fixtures'
import { strictRecords } from './committed-presentation-test-fixtures'
import { createUiDriver } from './route-test-fixtures'
import { InfectedWorldApp } from './app'

export function maintenanceRecords(lethal = false) {
  const { h, v } = maintenanceReady()
  // Exactly the existing combat-terminal.test.ts immediate-maintenance-death boundary.
  // The final death is produced by the real command, never by a rendered fake terminal view.
  const before = lethal ? bodyBoundary(v, h.deps, { energy: 1,
    condition: { ...v.character.body.condition, currentHealth: 1, bleeding: true } }) : v
  return strictRecords(before, h.deps)
}

export async function mountReview(lethal = false) {
  const fixture = browserFixture(), records = maintenanceRecords(lethal)
  fixture.disk.set(RESERVATION_KEY, records.reservation); fixture.disk.set(CHECKPOINT_KEY, records.checkpoint)
  const owners: BrowserOwner[] = [], host = document.createElement('div'); document.body.append(host)
  const factory = vi.fn(() => { const owner = fixture.make(); owners.push(owner); return owner })
  const commits: { terminal: string | null; utilityLayers: number }[] = []
  const onRender = () => commits.push({ terminal: host.querySelector('[aria-label="终局摘要"] h1')?.textContent ?? null,
    utilityLayers: document.querySelectorAll('[role="dialog"][aria-label="药食与维护"]').length })
  let root = createRoot(host)
  const render = async () => { await act(async () => {
    root.render(createElement(Profiler, { id: 'R1-real-commit-before-passive-effects', onRender }, createElement(InfectedWorldApp, { ownerFactory: factory })))
    await Promise.resolve()
  }) }
  await render()
  const view = () => {
    const value = owners.at(-1)!.getSnapshot().preplay?.view
    if (value?.status !== 'ready') throw new Error('TEST requires real ready view')
    return value as PlayerReadyView
  }
  const flush = async (action: () => void) => { await act(async () => { action(); await Promise.resolve() }) }
  const d = createUiDriver({ document, getView: view, flush })
  return { ...fixture, host, owners, factory, commits, render, view, flush, d, owner: () => owners.at(-1)!,
    unmount: async () => { await act(async () => root.unmount()); host.remove(); fixture.owner.dispose() },
    remount: async () => { await act(async () => root.unmount()); await Promise.resolve(); root = createRoot(host); await render() } }
}

export async function fillMechanical(h: Awaited<ReturnType<typeof mountReview>>) {
  await h.d.button('机械维护')
  await h.d.input('金属零件来源1用量', '1'); await h.d.input('金属管分配', '15')
}
