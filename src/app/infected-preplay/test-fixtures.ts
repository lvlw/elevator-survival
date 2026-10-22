// TEST ONLY. Player decisions use cached safe views; raw S is an independent oracle.
import { expect } from 'vitest'
import { createPreplayController } from './controller'
import { playerHarness, fromValue, allActions } from '../../state/residence-session/player-test-fixtures'
import { nativePlayer } from '../../state/residence-session/player-test-routes'
import type { PlayerReadyView, PlayerRequest, PlayerSession, PlayerView } from '../../state/residence-session/player-types'
import type { PreplayController, PreplayResult } from './types'

export function appHarness(options: Parameters<typeof playerHarness>[0] = {}) {
  const h = playerHarness(options), app = createPreplayController(h)
  return { ...h, app }
}
export function appFromValue(...args: Parameters<typeof fromValue>) {
  const h = fromValue(...args), app = createPreplayController(h)
  return { ...h, app }
}
export function appReady(app: PreplayController): PlayerReadyView {
  const v = app.getSnapshot().view
  if (v?.status !== 'ready') throw new Error('TEST expected ready presentation')
  return v
}
export function appChoose(app: PreplayController, family: string, label: string, method?: string) {
  const a = allActions(appReady(app)).find(a => a.family === family && a.label === label && (method === undefined || a.method === method))
  if (!a) throw new Error('Missing public app choice '+family+'/'+label+'/'+method)
  return a.selector
}
export function commit(app: PreplayController, request: PlayerRequest): PreplayResult {
  const attempted = app.execute(request)
  // This test driver makes the separate explicit protected confirmation step.
  const result = attempted.kind === 'confirmation-required' ? app.confirm(attempted.confirmation!) : attempted
  expect(result.kind).toBe('committed'); return result
}
export function startApp(h: ReturnType<typeof appHarness>) {
  expect(h.app.bootstrap().snapshot.view?.status).toBe('no-current')
  expect(h.app.createFirst().snapshot.view?.status).toBe('ready')
  commit(h.app, { action: appChoose(h.app, 'depart', '进入封锁区') })
}
export function applicationRouteHarness() {
  const h = nativePlayer(), app = createPreplayController(h)
  const view = (): PlayerView => { const q = app.getSnapshot().view; if (!q) throw new Error('Projection missing'); return q }
  const bridge: PlayerSession = Object.freeze({ ...h.player, query: view,
    preview: r => app.preview(r).qualification, resolve: r => app.preview(r).qualification,
    execute: r => {
      const attempted = app.execute(r)
      const result = attempted.kind === 'confirmation-required' ? app.confirm(attempted.confirmation!) : attempted
      return Object.freeze({ kind: result.kind === 'committed' ? 'committed' : 'rejected', view: view(), preview: null })
    }, retrySave: () => { app.retrySave(); return view() } })
  return { ...h, app, player: bridge, bootstrap: () => { app.bootstrap(); return view() }, createFirst: () => { app.createFirst(); return view() } }
}
