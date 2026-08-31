import { useState } from 'react'
import { appMetadata } from './app/app-metadata'
import {
  bootstrapProductionRun,
  clearUnrecoverableRunSave,
  type ProductionLoadError,
  type ProductionRunBootstrapResult,
} from './app/production-bootstrap'
import type {
  RunSaveRulesRegistry,
  RunSaveStorage,
} from './state/run-save'
import { StableRunUiApp } from './ui/stable-run-ui-app'
import type { StableRunUiPresentationDependencies } from './ui/presentation'

export interface AppProps {
  readonly initialBootstrapResult: ProductionRunBootstrapResult
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
  readonly presentationDependencies: StableRunUiPresentationDependencies
}

function NoRunView() {
  return <main className="app-shell">
    <article className="status-card">
      <p className="eyebrow">{appMetadata.verticalSliceVersion}</p>
      <h1>{appMetadata.name}</h1>
      <p className="subtitle">医院纵向切片 {appMetadata.verticalSliceVersion}</p>
      <p className="status">当前没有活动 Run</p>
      <section aria-labelledby="current-stage-heading">
        <h2 id="current-stage-heading">当前开发阶段</h2>
        <p>医院一日 New Run 将在后续任务接入；此入口不会自动创建 Run 或生成身份。</p>
      </section>
    </article>
  </main>
}

function loadErrorCopy(error: ProductionLoadError): Readonly<{
  heading: string
  detail: string
}> {
  if (error.category === 'corrupt-save') {
    return {
      heading: '存档内容损坏，无法严格恢复',
      detail: '原存档仍然保留。你可以显式清除这份无法恢复的唯一 Run 存档。',
    }
  }
  if (error.category === 'incompatible-save') {
    return {
      heading: '存档版本与当前游戏不兼容',
      detail: '原存档仍然保留。你可以显式清除这份无法恢复的唯一 Run 存档。',
    }
  }
  return {
    heading: '当前无法读取浏览器 Run 存档',
    detail: '存档没有被清除。请检查浏览器存储权限后重新尝试读取。',
  }
}

export default function App({
  initialBootstrapResult,
  storage,
  rulesRegistry,
  presentationDependencies,
}: AppProps) {
  const [shellState, setShellState] = useState(initialBootstrapResult)
  const [showClearPreview, setShowClearPreview] = useState(false)
  const [clearFailed, setClearFailed] = useState(false)

  if (shellState.kind === 'ready') {
    return <StableRunUiApp
      store={shellState.store}
      presentationDependencies={presentationDependencies}
    />
  }
  if (shellState.kind === 'no-run') return <NoRunView />

  const copy = loadErrorCopy(shellState)
  const retryLoad = () => {
    setClearFailed(false)
    setShellState(bootstrapProductionRun({ storage, rulesRegistry }))
  }
  const confirmClear = () => {
    const result = clearUnrecoverableRunSave(storage)
    setShowClearPreview(false)
    if (result.kind === 'cleared') {
      setClearFailed(false)
      setShellState(Object.freeze({ kind: 'no-run' }))
      return
    }
    setClearFailed(true)
  }

  return <main className="app-shell">
    <article className="status-card" aria-labelledby="load-error-heading">
      <p className="eyebrow">Run 存档恢复</p>
      <h1 id="load-error-heading">{copy.heading}</h1>
      <p>{copy.detail}</p>
      {clearFailed && <p role="alert">存档清除失败，请稍后重新确认。</p>}
      {shellState.canClear
        ? <button type="button" onClick={() => {
            setClearFailed(false)
            setShowClearPreview(true)
          }}>清除无法恢复的存档</button>
        : <button type="button" onClick={retryLoad}>重新尝试读取</button>}
      {showClearPreview && shellState.canClear && <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-save-heading"
      >
        <h2 id="clear-save-heading">确认清除唯一 Run 存档</h2>
        <p>该操作会删除当前无法恢复的唯一 Run 存档，删除后无法恢复其中内容。</p>
        <button type="button" onClick={() => setShowClearPreview(false)}>取消</button>
        <button type="button" onClick={confirmClear}>确认清除</button>
      </section>}
    </article>
  </main>
}
