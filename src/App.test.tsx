import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { productionPresentationDependencies } from './app/production-composition'
import { bootstrapProductionRun } from './app/production-bootstrap'
import {
  hospitalRunSaveRulesRegistry,
  serializeRunSave,
  type RunSaveStorage,
} from './state/run-save'
import { createHospitalDevelopmentPreviewScenario } from './ui/dev-preview/hospital-preview-scenarios'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

class UiStorage implements RunSaveStorage {
  public reads = 0
  public writes = 0
  public clears = 0
  public failRead = false
  public clearFailures = 0

  public constructor(public value: string | null) {}

  public read(): string | null {
    this.reads += 1
    if (this.failRead) throw new Error('read-secret-message')
    return this.value
  }

  public write(serialized: string): void {
    this.writes += 1
    this.value = serialized
  }

  public clear(): void {
    this.clears += 1
    if (this.clearFailures > 0) {
      this.clearFailures -= 1
      throw new Error('clear-secret-message')
    }
    this.value = null
  }
}

const roots: ReturnType<typeof createRoot>[] = []
afterEach(() => {
  act(() => { while (roots.length > 0) roots.pop()!.unmount() })
})

function renderApp(
  storage: UiStorage,
  initialBootstrapResult = bootstrapProductionRun({
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
  }),
  strict = false,
) {
  const container = document.createElement('div')
  const root = createRoot(container)
  roots.push(root)
  const app = <App
    initialBootstrapResult={initialBootstrapResult}
    storage={storage}
    rulesRegistry={hospitalRunSaveRulesRegistry}
    presentationDependencies={productionPresentationDependencies}
  />
  act(() => { root.render(strict ? <StrictMode>{app}</StrictMode> : app) })
  return container
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')]
    .find((candidate) => candidate.textContent === label)
  if (!(found instanceof HTMLButtonElement)) throw new Error(`missing button: ${label}`)
  return found
}

function savedScenario(kind: 'hub' | 'scene' | 'failure'): string {
  const phase = createHospitalDevelopmentPreviewScenario(kind).store.getState().phase
  return serializeRunSave(phase, hospitalRunSaveRulesRegistry)
}

describe('Production App Shell stable states', () => {
  it('shows an honest no-run state without a New Run action or identity generation', () => {
    const storage = new UiStorage(null)
    const container = renderApp(storage)
    expect(container.textContent).toContain('当前没有活动 Run')
    expect(container.textContent).toContain('医院一日 New Run 将在后续任务接入')
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.textContent).not.toContain('开发预览')
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it.each([
    ['hub', '电梯中枢'],
    ['scene', '当前位置：电梯前室'],
    ['failure', 'Run 已终止'],
  ] as const)('renders a strictly resumed %s Store', (kind, visibleText) => {
    const storage = new UiStorage(savedScenario(kind))
    const container = renderApp(storage)
    expect(container.textContent).toContain(visibleText)
    expect(container.textContent).not.toContain('当前没有活动 Run')
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it('does not repeat bootstrap work under StrictMode', () => {
    const storage = new UiStorage(savedScenario('hub'))
    const initial = bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    expect(storage.reads).toBe(1)
    const container = renderApp(storage, initial, true)
    expect(container.textContent).toContain('电梯中枢')
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })
})

describe('player-safe load error UI', () => {
  it.each([
    ['{private-invalid-json', '存档内容损坏，无法严格恢复'],
    [savedScenario('hub')
      .replace('"saveFormatVersion":1', '"saveFormatVersion":999')
      .replaceAll('dev-ui-preview-flashlight', 'private-instance-id')
      .replaceAll('hospital-slice-v0.1', 'rules-secret-value')
      .replaceAll('dev-ui-preview-seed', 'seed-secret-value')
      .replaceAll('dev-ui-preview', 'run-secret-id'), '存档版本与当前游戏不兼容'],
  ] as const)('keeps the raw save private and offers explicit clear', (raw, heading) => {
    const storage = new UiStorage(raw)
    const container = renderApp(storage)
    expect(container.textContent).toContain(heading)
    expect(container.textContent).toContain('清除无法恢复的存档')
    for (const secret of [
      raw,
      'INVALID_JSON',
      'INVALID_ENVELOPE',
      'UNKNOWN_SAVE_FORMAT',
      'run-secret-id',
      'seed-secret-value',
      'rules-secret-value',
      'private-instance-id',
    ]) {
      expect(container.innerHTML).not.toContain(secret)
    }
    expect(storage.value).toBe(raw)
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it('offers only one explicit retry for a storage read failure', () => {
    const storage = new UiStorage('private serialized save')
    storage.failRead = true
    const container = renderApp(storage)
    expect(container.textContent).toContain('当前无法读取浏览器 Run 存档')
    expect(container.textContent).toContain('重新尝试读取')
    expect(container.textContent).not.toContain('清除无法恢复的存档')
    expect(container.innerHTML).not.toContain('read-secret-message')
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })

    storage.failRead = false
    storage.value = null
    act(() => button(container, '重新尝试读取').click())
    expect(container.textContent).toContain('当前没有活动 Run')
    expect(storage).toMatchObject({ reads: 2, writes: 0, clears: 0 })
  })

  it('can retry into ready and can remain in read-error without automatic loops', () => {
    const storage = new UiStorage('private serialized save')
    storage.failRead = true
    const container = renderApp(storage)
    act(() => button(container, '重新尝试读取').click())
    expect(container.textContent).toContain('当前无法读取浏览器 Run 存档')
    expect(storage.reads).toBe(2)

    storage.failRead = false
    storage.value = savedScenario('scene')
    act(() => button(container, '重新尝试读取').click())
    expect(container.textContent).toContain('当前位置：电梯前室')
    expect(storage).toMatchObject({ reads: 3, writes: 0, clears: 0 })
  })
})

describe('explicit unrecoverable save clearing', () => {
  it('opens and cancels the irreversible preview with zero clear attempts', () => {
    const storage = new UiStorage('{broken')
    const container = renderApp(storage)
    act(() => button(container, '清除无法恢复的存档').click())
    expect(container.textContent).toContain('删除后无法恢复其中内容')
    expect(storage.clears).toBe(0)
    act(() => button(container, '取消').click())
    expect(container.textContent).not.toContain('删除后无法恢复其中内容')
    expect(storage).toMatchObject({ writes: 0, clears: 0 })
  })

  it('confirms exactly one clear and enters no-run under StrictMode', () => {
    const storage = new UiStorage('{broken')
    const initial = bootstrapProductionRun({
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = renderApp(storage, initial, true)
    act(() => button(container, '清除无法恢复的存档').click())
    act(() => button(container, '确认清除').click())
    expect(container.textContent).toContain('当前没有活动 Run')
    expect(storage.value).toBeNull()
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 1 })
  })

  it('keeps the blocking state after clear failure and requires another explicit confirm', () => {
    const storage = new UiStorage('{broken')
    storage.clearFailures = 1
    const container = renderApp(storage)
    act(() => button(container, '清除无法恢复的存档').click())
    act(() => button(container, '确认清除').click())
    expect(container.textContent).toContain('存档清除失败，请稍后重新确认')
    expect(container.textContent).toContain('存档内容损坏，无法严格恢复')
    expect(storage.value).toBe('{broken')
    expect(storage.clears).toBe(1)

    act(() => button(container, '清除无法恢复的存档').click())
    expect(storage.clears).toBe(1)
    act(() => button(container, '确认清除').click())
    expect(container.textContent).toContain('当前没有活动 Run')
    expect(storage.clears).toBe(2)
    expect(storage.writes).toBe(0)
  })
})
