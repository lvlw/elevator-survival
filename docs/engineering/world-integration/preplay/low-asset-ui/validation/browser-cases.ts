// TEST ONLY. Route progress is made exclusively by shared React DOM controls/events.
import type { BrowserSnapshot } from '../../../../../../src/app/infected-browser/types'
import type { PlayerReadyView } from '../../../../../../src/state/residence-session/player-types'
import { createUiDriver, domRouteA, domRouteB } from '../../../../../../src/ui/infected-world/route-test-fixtures'

type ReadSnapshot = () => BrowserSnapshot | null
const publicReceipt = (view: PlayerReadyView) => ({
  phase: view.phase, point: view.point, location: view.location?.name ?? null,
  day: view.taskDay, hp: view.body.hp.current, energy: view.body.energy.current,
  sample: view.tasks.sample, persistence: view.persistence.feedback,
  outcome: view.terminal.result?.outcome ?? null,
})
function driver(read: ReadSnapshot) {
  const steps: { operation: string; state: ReturnType<typeof publicReceipt> }[] = []
  const getView = (): PlayerReadyView => {
    const state = read()
    if (state?.status !== 'ready' || state.preplay?.status !== 'stable' || state.preplay.view?.status !== 'ready') throw new Error('DOM route requires the actual ready React state')
    return state.preplay.view
  }
  const controls = createUiDriver({ document, getView,
    flush: async action => {
      action()
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    },
    onStep: (operation, view) => { steps.push({ operation, state: publicReceipt(view) }) },
  })
  return { controls, steps, getView }
}
export async function runDomRouteA(stage: number, read: ReadSnapshot) {
  const { controls, steps, getView } = driver(read)
  await domRouteA(controls, stage)
  return { route: 'A', stage, steps, final: publicReceipt(getView()) }
}
export async function runDomRouteB(stage: number, read: ReadSnapshot) {
  const { controls, steps, getView } = driver(read)
  await domRouteB(controls, stage)
  return { route: 'B', stage, steps, final: publicReceipt(getView()) }
}
