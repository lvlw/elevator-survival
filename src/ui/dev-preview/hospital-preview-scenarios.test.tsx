import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { hospitalRunSaveRulesRegistry } from '../../state/run-save'
import { hospitalV01UiLabels } from '../hospital-v0.1'
import { StableRunUiApp } from '../stable-run-ui-app'
import DevelopmentUiPreviewHarness from './development-ui-preview'
import {
  createHospitalDevelopmentPreviewScenario,
  type DevelopmentPreviewScenarioKind,
} from './hospital-preview-scenarios'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const roots: ReturnType<typeof createRoot>[] = []
afterEach(() => { act(() => { while (roots.length > 0) roots.pop()!.unmount() }) })

const expectedPhaseKinds: Readonly<Record<DevelopmentPreviewScenarioKind, string>> = {
  hub: 'current-day-hub',
  scene: 'scene-session',
  combat: 'scene-session',
  failure: 'run-failure',
}

const expectedUiHeadings: Readonly<Record<DevelopmentPreviewScenarioKind, string>> = {
  hub: '电梯中枢',
  scene: '场景导航',
  combat: '战斗',
  failure: '失败',
}

describe('development UI preview scenarios', () => {
  it.each<DevelopmentPreviewScenarioKind>(['hub', 'scene', 'combat', 'failure'])(
    'creates and renders the %s example through a real strict-restored Store without saving',
    (kind) => {
      const scenario = createHospitalDevelopmentPreviewScenario(kind)
      expect(scenario.store.getState().phase.kind).toBe(expectedPhaseKinds[kind])
      expect(scenario.storage.writes).toBe(0)
      const container = document.createElement('div')
      const root = createRoot(container); roots.push(root)
      act(() => {
        root.render(<StableRunUiApp
          store={scenario.store}
          presentationDependencies={{
            rulesRegistry: hospitalRunSaveRulesRegistry,
            labels: hospitalV01UiLabels,
          }}
        />)
      })
      expect(container.textContent).toContain(expectedUiHeadings[kind])
    },
  )

  it('switches displayed development scenarios without gameplay dispatch or storage writes', () => {
    const created = [] as ReturnType<typeof createHospitalDevelopmentPreviewScenario>[]
    let storeNotifications = 0
    const createObservedScenario = (kind: DevelopmentPreviewScenarioKind) => {
      const scenario = createHospitalDevelopmentPreviewScenario(kind)
      scenario.store.subscribe(() => { storeNotifications += 1 })
      created.push(scenario)
      return scenario
    }
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<DevelopmentUiPreviewHarness createScenario={createObservedScenario} />) })
    expect(container.textContent).toContain('开发预览')
    expect(container.textContent).toContain('电梯中枢')
    const combatButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'Combat 示例')
    if (!combatButton) throw new Error('expected Combat scenario selector')
    act(() => { combatButton.click() })
    expect(container.textContent).toContain('战斗')
    const sceneButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'Scene 示例')
    if (!sceneButton) throw new Error('expected Scene scenario selector')
    act(() => { sceneButton.click() })
    expect(container.textContent).toContain('当前可通行相邻节点')
    expect(container.textContent).not.toContain('可见相邻节点')
    expect(storeNotifications).toBe(0)
    expect(created).toHaveLength(3)
    expect(created.every(({ storage }) => storage.writes === 0)).toBe(true)
  })
})
