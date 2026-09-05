import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_SLICE_RULES_VERSION,
  createHospitalNewRunInitialCurrentDayHub,
} from './content'
import { createCurrentDayHubSnapshot } from './core/current-day-hub'
import {
  createProductionHospitalNewRunDependencies,
  productionPresentationDependencies,
} from './app/production-composition'
import type { HospitalNewRunTransactionDependencies } from './app/new-run'
import { bootstrapProductionRun } from './app/production-bootstrap'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  serializeRunSave,
  type RunSaveStorage,
} from './state/run-save'
import { createStableRunStore, type StableRunStore } from './state/run-store'
import { createHospitalDevelopmentPreviewScenario } from './ui/dev-preview/hospital-preview-scenarios'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

class UiStorage implements RunSaveStorage {
  public reads = 0
  public writes = 0
  public clears = 0
  public failRead = false
  public clearFailures = 0
  public writeFailures = 0

  public constructor(public value: string | null) {}

  public read(): string | null {
    this.reads += 1
    if (this.failRead) throw new Error('read-secret-message')
    return this.value
  }

  public write(serialized: string): void {
    this.writes += 1
    if (this.writeFailures > 0) {
      this.writeFailures -= 1
      throw new Error('write-secret-message')
    }
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
  newRunDependencies = createProductionHospitalNewRunDependencies(storage),
) {
  const container = document.createElement('div')
  const root = createRoot(container)
  roots.push(root)
  const app = <App
    initialBootstrapResult={initialBootstrapResult}
    storage={storage}
    rulesRegistry={hospitalRunSaveRulesRegistry}
    presentationDependencies={productionPresentationDependencies}
    newRunDependencies={newRunDependencies}
  />
  act(() => { root.render(strict ? <StrictMode>{app}</StrictMode> : app) })
  return container
}

function radio(container: HTMLElement, label: string): HTMLInputElement {
  const found = [...container.querySelectorAll('label')]
    .find((candidate) => candidate.textContent?.trim().startsWith(label))
    ?.querySelector('input')
  if (!(found instanceof HTMLInputElement)) throw new Error(`missing radio: ${label}`)
  return found
}

function newRunHarness(
  storage: UiStorage,
  materials: readonly Readonly<{ runId: string; seed: string }>[] = [
    { runId: 'private-new-run-id', seed: 'private-new-seed' },
  ],
  sourceError?: Error,
) {
  const counters = {
    identity: 0,
    constructor: 0,
    stores: 0,
    dispatches: 0,
  }
  let materialIndex = 0
  const base = createProductionHospitalNewRunDependencies(storage)
  const dependencies: HospitalNewRunTransactionDependencies = {
    ...base,
    identityMaterialSource: {
      generateRunIdentityMaterial: () => {
        counters.identity += 1
        if (sourceError) throw sourceError
        const material = materials[Math.min(materialIndex, materials.length - 1)]
        materialIndex += 1
        if (!material) throw new Error('missing test identity material')
        return material
      },
    },
    createInitialPhase: (input, dependencies) => {
      counters.constructor += 1
      return createHospitalNewRunInitialCurrentDayHub(input, dependencies)
    },
    createStore: (input) => {
      counters.stores += 1
      const inner = createStableRunStore(input)
      return Object.freeze({
        ...inner,
        dispatch: (command: unknown) => {
          counters.dispatches += 1
          return inner.dispatch(command)
        },
      })
    },
  }
  return { counters, dependencies }
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
  it('shows the formal no-run Setup without selecting or creating a Run', () => {
    const storage = new UiStorage(null)
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, false, harness.dependencies)
    expect(container.textContent).toContain('开始新的医院行动')
    expect(container.textContent).toContain('专长系统在当前医院一日验证版本中暂缓')
    expect(container.textContent).toContain('较安静、可控地处理隔离区防火门')
    expect(container.textContent).toContain('属于开门用实用装备，不提供金属管的战斗攻击')
    expect(container.textContent).toContain('为三个低照明搜索节点提供照明，使搜索更快')
    expect(container.textContent).toContain('不会增加物品数量、提高稀有掉落概率或改变搜索随机结果')
    expect(container.textContent).toContain('处理隔离区防火门，并在成功后揭示电子元件')
    expect(container.textContent).toContain('操作比撬棍更慢，并消耗工具箱耐久')
    expect(button(container, '预览新一局').disabled).toBe(true)
    expect([...container.querySelectorAll('input[type="radio"]')]
      .every((candidate) => !(candidate as HTMLInputElement).checked)).toBe(true)
    expect(container.textContent).not.toContain('开发预览')
    for (const internal of ['Run', 'Scene', 'CTB', 'safe-returned', 'forced-returned']) {
      expect(container.textContent).not.toContain(internal)
    }
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it.each([
    ['hub', '电梯中枢'],
    ['scene', '当前位置：电梯前室'],
    ['failure', '本局已终止'],
  ] as const)('renders a strictly resumed %s Store', (kind, visibleText) => {
    const storage = new UiStorage(savedScenario(kind))
    const container = renderApp(storage)
    expect(container.textContent).toContain(visibleText)
    expect(container.textContent).not.toContain('当前没有活动 Run')
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
    for (const internal of ['Run Failure', 'dead Scene Session', 'settle-terminal-scene']) {
      expect(container.textContent).not.toContain(internal)
    }
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

describe('Production hospital New Run Setup', () => {
  it('opens Setup after the current Store formally transitions to Failure without rerendering App', () => {
    const returned = createHospitalDevelopmentPreviewScenario('hub-returned')
      .store.getState().phase
    if (returned.kind !== 'current-day-hub') throw new Error('expected returned Hub')
    const activePhase = {
      kind: 'current-day-hub' as const,
      payload: createCurrentDayHubSnapshot({
        ...returned.payload,
        playerCondition: {
          ...returned.payload.playerCondition,
          currentHealth: 2,
          bleeding: true,
        },
      }, hospitalCurrentDayHubDependencies),
    }
    const storage = new UiStorage(serializeRunSave(activePhase, hospitalRunSaveRulesRegistry))
    const inner = createStableRunStore({
      initialPhase: activePhase,
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    let activeStoreDispatches = 0
    const store: StableRunStore = Object.freeze({
      ...inner,
      dispatch: (command: unknown) => {
        activeStoreDispatches += 1
        return inner.dispatch(command)
      },
    })
    const harness = newRunHarness(storage)
    const container = renderApp(
      storage,
      Object.freeze({ kind: 'ready', store }),
      false,
      harness.dependencies,
    )

    expect(container.textContent).toContain('电梯中枢')
    expect(container.textContent).not.toContain('开始新一局')
    act(() => {
      store.dispatch({ kind: 'lifecycle', command: { kind: 'end-day' } })
    })
    const failurePhase = store.getState().phase
    expect(failurePhase).toMatchObject({
      kind: 'run-failure',
      payload: { reason: 'health-depleted' },
    })
    expect(container.textContent).toContain('本局已终止')
    expect(container.textContent).toContain('开始新一局')
    expect(activeStoreDispatches).toBe(1)
    expect(storage).toMatchObject({ writes: 1, clears: 0 })

    act(() => button(container, '开始新一局').click())
    expect(container.textContent).toContain('开始新的医院行动')
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(activeStoreDispatches).toBe(1)
    expect(storage).toMatchObject({ writes: 1, clears: 0 })

    act(() => button(container, '返回终止摘要').click())
    expect(container.textContent).toContain('本局已终止')
    expect(store.getState().phase).toBe(failurePhase)
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(activeStoreDispatches).toBe(1)
    expect(storage).toMatchObject({ writes: 1, clears: 0 })
  })

  it('rereads the current Store before opening Setup from a stale Failure view', () => {
    const failure = createHospitalDevelopmentPreviewScenario('failure').store.getState().phase
    const active = createHospitalDevelopmentPreviewScenario('hub').store.getState().phase
    let current = Object.freeze({ phase: failure })
    const store: StableRunStore = Object.freeze({
      getState: () => current,
      getInitialState: () => Object.freeze({ phase: failure }),
      subscribe: () => () => undefined,
      dispatch: () => { throw new Error('gameplay dispatch must not run') },
    })
    const storage = new UiStorage(savedScenario('failure'))
    const harness = newRunHarness(storage)
    const container = renderApp(
      storage,
      Object.freeze({ kind: 'ready', store }),
      false,
      harness.dependencies,
    )
    const request = button(container, '开始新一局')

    current = Object.freeze({ phase: active })
    act(() => request.click())

    expect(container.querySelector('#new-run-heading')).toBeNull()
    expect(container.textContent).not.toContain('固定初始配装')
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ writes: 0, clears: 0 })
  })

  it('opens and cancels Preview with no identity, Store, save, clear, or dispatch', () => {
    const storage = new UiStorage(null)
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, true, harness.dependencies)
    act(() => radio(container, '手电筒').click())
    act(() => button(container, '预览新一局').click())
    expect(container.textContent).toContain('确认开始新的医院行动')
    expect(container.textContent).toContain('初始实用装备手电筒')
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
    act(() => button(container, '取消').click())
    expect(container.textContent).not.toContain('确认开始新的医院行动')
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
  })

  it.each([
    ['撬棍', '撬棍'],
    ['手电筒', '手电筒'],
    ['工具箱', '工具箱'],
  ] as const)('creates a complete Day 1 Hub with explicitly selected %s', (choice, expected) => {
    const storage = new UiStorage(null)
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, false, harness.dependencies)
    act(() => radio(container, choice).click())
    act(() => button(container, '预览新一局').click())
    act(() => button(container, '确认创建').click())
    expect(container.textContent).toContain('第 1 日')
    expect(container.textContent).toContain('金属管')
    expect(container.textContent).toContain('厚实外套')
    expect(container.textContent).toContain(expected)
    expect(container.textContent).toContain('取得密封病原样本箱并安全带回电梯')
    expect(container.textContent).not.toContain('第 2 日及之后仍可用于工程回归测试')
    expect(container.textContent).toContain('绷带 ×1')
    expect(container.textContent).toContain('主场景尚未进入')
    expect(container.textContent).toContain('进入 封锁医院·急诊楼一层')
    expect(container.textContent).not.toContain('结束本日')
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 1, clears: 0 })
  })

  it('executes one transaction for a rapid double Confirm under StrictMode', () => {
    const storage = new UiStorage(null)
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, true, harness.dependencies)
    act(() => radio(container, '工具箱').click())
    act(() => button(container, '预览新一局').click())
    const confirm = button(container, '确认创建')
    act(() => {
      confirm.click()
      confirm.click()
    })
    expect(container.textContent).toContain('第 1 日')
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 1, clears: 0 })
  })

  it('enters and cancels Failure Setup without changing the terminal Store or save', () => {
    const oldSave = savedScenario('failure')
    const storage = new UiStorage(oldSave)
    const harness = newRunHarness(storage)
    const initial = bootstrapProductionRun({ storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    if (initial.kind !== 'ready') throw new Error('expected Failure Store')
    const originalStore = initial.store
    const originalPhase = originalStore.getState().phase
    const container = renderApp(storage, initial, false, harness.dependencies)
    act(() => button(container, '开始新一局').click())
    expect(container.textContent).toContain('返回终止摘要')
    act(() => button(container, '返回终止摘要').click())
    expect(container.textContent).toContain('本局已终止')
    expect(originalStore.getState().phase).toBe(originalPhase)
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0, value: oldSave })
  })

  it('shows Failure replacement warnings and directly replaces the sole save without clear', () => {
    const oldSave = savedScenario('failure')
    const storage = new UiStorage(oldSave)
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, false, harness.dependencies)
    act(() => button(container, '开始新一局').click())
    act(() => radio(container, '撬棍').click())
    act(() => button(container, '预览新一局').click())
    expect(container.textContent).toContain('新一局将替换当前保存的终止摘要')
    expect(container.textContent).toContain('尚未实现跨局历史记录')
    expect(storage.value).toBe(oldSave)
    act(() => button(container, '确认创建').click())
    expect(container.textContent).toContain('第 1 日')
    expect(container.textContent).toContain('撬棍')
    expect(container.textContent).not.toContain('本局已终止')
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 1, clears: 0 })
    expect(storage.value).not.toBe(oldSave)
  })

  it.each([
    ['no-run', null],
    ['run-failure', savedScenario('failure')],
  ] as const)('keeps the committed new Store and honest storage truth after %s first-save failure', (_origin, oldSave) => {
    const storage = new UiStorage(oldSave)
    storage.writeFailures = 1
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, false, harness.dependencies)
    if (oldSave !== null) act(() => button(container, '开始新一局').click())
    act(() => radio(container, '手电筒').click())
    act(() => button(container, '预览新一局').click())
    act(() => button(container, '确认创建').click())
    expect(container.textContent).toContain('第 1 日')
    expect(container.textContent).toContain('保存失败：新一局已在当前会话中建立')
    expect(storage.value).toBe(oldSave)
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 1, clears: 0 })
    act(() => button(container, '关闭提示').click())
    expect(container.textContent).not.toContain('保存失败：新一局已在当前会话中建立')
    expect(harness.counters).toEqual({ identity: 1, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 1, clears: 0 })
  })

  it('keeps Setup and maps identity source failure to player-safe copy without leaking details', () => {
    const storage = new UiStorage(null)
    const harness = newRunHarness(
      storage,
      undefined,
      new Error('private-new-run-id private-new-seed raw-crypto-bytes'),
    )
    const container = renderApp(storage, undefined, false, harness.dependencies)
    act(() => radio(container, '工具箱').click())
    act(() => button(container, '预览新一局').click())
    act(() => button(container, '确认创建').click())
    expect(container.textContent).toContain('当前无法安全生成新一局，请重新确认后再试')
    for (const secret of [
      'IDENTITY_UNAVAILABLE',
      'private-new-run-id',
      'private-new-seed',
      'raw-crypto-bytes',
    ]) expect(container.innerHTML).not.toContain(secret)
    expect(harness.counters).toEqual({ identity: 1, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })
    act(() => button(container, '确认创建').click())
    expect(harness.counters.identity).toBe(2)
  })

  it('maps reused Failure identity safely and only retries after another explicit Confirm', () => {
    const oldSave = savedScenario('failure')
    const storage = new UiStorage(oldSave)
    const harness = newRunHarness(storage, [
      { runId: 'dev-ui-preview', seed: 'fresh-seed' },
      { runId: 'fresh-run-after-retry', seed: 'fresh-seed-after-retry' },
    ])
    const container = renderApp(storage, undefined, false, harness.dependencies)
    act(() => button(container, '开始新一局').click())
    act(() => radio(container, '撬棍').click())
    act(() => button(container, '预览新一局').click())
    act(() => button(container, '确认创建').click())
    expect(container.textContent).toContain('本次生成的新一局身份不可用，请重新明确确认创建')
    expect(container.innerHTML).not.toContain('IDENTITY_REUSED')
    expect(harness.counters).toEqual({ identity: 1, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0, value: oldSave })
    act(() => button(container, '确认创建').click())
    expect(container.textContent).toContain('第 1 日')
    expect(harness.counters).toEqual({ identity: 2, constructor: 1, stores: 1, dispatches: 0 })
    expect(storage).toMatchObject({ reads: 1, writes: 1, clears: 0 })
  })

  it('rereads the current Failure Store origin and rejects a stale active phase before entropy', () => {
    const failure = createHospitalDevelopmentPreviewScenario('failure').store.getState().phase
    const active = createHospitalDevelopmentPreviewScenario('hub').store.getState().phase
    let current = Object.freeze({ phase: failure })
    const store: StableRunStore = Object.freeze({
      getState: () => current,
      getInitialState: () => Object.freeze({ phase: failure }),
      subscribe: () => () => undefined,
      dispatch: () => { throw new Error('gameplay dispatch must not run') },
    })
    const storage = new UiStorage(savedScenario('failure'))
    const harness = newRunHarness(storage)
    const container = renderApp(
      storage,
      Object.freeze({ kind: 'ready', store }),
      false,
      harness.dependencies,
    )
    act(() => button(container, '开始新一局').click())
    act(() => radio(container, '工具箱').click())
    act(() => button(container, '预览新一局').click())
    current = Object.freeze({ phase: active })
    act(() => button(container, '确认创建').click())
    expect(container.textContent).toContain('电梯中枢')
    expect(container.textContent).not.toContain('确认开始新的医院行动')
    expect(harness.counters).toEqual({ identity: 0, constructor: 0, stores: 0, dispatches: 0 })
    expect(storage).toMatchObject({ writes: 0, clears: 0 })
  })

  it('keeps internal identities and formal definition IDs out of ordinary Setup DOM', () => {
    const storage = new UiStorage(null)
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, false, harness.dependencies)
    act(() => radio(container, '手电筒').click())
    act(() => button(container, '预览新一局').click())
    for (const secret of [
      'private-new-run-id',
      'private-new-seed',
      HOSPITAL_SLICE_RULES_VERSION,
      'sceneInstanceId',
      'returnLedger',
      'instanceId',
      ...Object.values(HOSPITAL_ITEM_IDS),
    ]) expect(container.innerHTML).not.toContain(secret)
  })

  it('keeps the restored Failure identity private while entering Setup', () => {
    const storage = new UiStorage(savedScenario('failure'))
    const harness = newRunHarness(storage)
    const container = renderApp(storage, undefined, false, harness.dependencies)
    act(() => button(container, '开始新一局').click())
    for (const secret of [
      'dev-ui-preview',
      'dev-ui-preview-seed',
      HOSPITAL_SLICE_RULES_VERSION,
      'sceneInstanceId',
      'returnLedger',
      'instanceId',
    ]) expect(container.innerHTML).not.toContain(secret)
  })
})

describe('player-safe load error UI', () => {
  it.each([
    ['{private-invalid-json', '存档内容损坏，无法严格恢复'],
    [savedScenario('hub')
      .replace('"saveFormatVersion":2', '"saveFormatVersion":999')
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
    expect(container.textContent).toContain('当前无法读取浏览器中的本局存档')
    expect(container.textContent).toContain('重新尝试读取')
    expect(container.textContent).not.toContain('清除无法恢复的存档')
    expect(container.innerHTML).not.toContain('read-secret-message')
    expect(storage).toMatchObject({ reads: 1, writes: 0, clears: 0 })

    storage.failRead = false
    storage.value = null
    act(() => button(container, '重新尝试读取').click())
    expect(container.textContent).toContain('开始新的医院行动')
    expect(storage).toMatchObject({ reads: 2, writes: 0, clears: 0 })
  })

  it('can retry into ready and can remain in read-error without automatic loops', () => {
    const storage = new UiStorage('private serialized save')
    storage.failRead = true
    const container = renderApp(storage)
    act(() => button(container, '重新尝试读取').click())
    expect(container.textContent).toContain('当前无法读取浏览器中的本局存档')
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
    expect(container.textContent).toContain('开始新的医院行动')
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
    expect(container.textContent).toContain('开始新的医院行动')
    expect(storage.clears).toBe(2)
    expect(storage.writes).toBe(0)
  })
})
