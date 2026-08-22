import { appMetadata } from './app/app-metadata'
import type { StableRunStore } from './state/run-store'
import { StableRunUiApp } from './ui/stable-run-ui-app'
import type { StableRunUiPresentationDependencies } from './ui/presentation'

export interface AppProps {
  readonly store?: StableRunStore
  readonly presentationDependencies?: StableRunUiPresentationDependencies
}

export default function App({ store, presentationDependencies }: AppProps = {}) {
  if (store && presentationDependencies) {
    return <StableRunUiApp
      store={store}
      presentationDependencies={presentationDependencies}
    />
  }
  return (
    <main className="app-shell">
      <article className="status-card">
        <p className="eyebrow">{appMetadata.verticalSliceVersion}</p>
        <h1>{appMetadata.name}</h1>
        <p className="subtitle">医院纵向切片 {appMetadata.verticalSliceVersion}</p>
        <p className="status">当前没有已接入的活动 Run</p>
        <section aria-labelledby="current-stage-heading">
          <h2 id="current-stage-heading">当前开发阶段</h2>
          <p>
            {appMetadata.stage}。New Run bootstrap 与 React 启动接线尚未实现；此入口不会创建或伪造 Run。
          </p>
        </section>
      </article>
    </main>
  )
}
