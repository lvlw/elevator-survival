import { appMetadata } from './app/app-metadata'

export default function App() {
  return (
    <main className="app-shell">
      <article className="status-card">
        <p className="eyebrow">{appMetadata.verticalSliceVersion}</p>
        <h1>{appMetadata.name}</h1>
        <p className="subtitle">医院纵向切片 {appMetadata.verticalSliceVersion}</p>
        <p className="status">{appMetadata.stage}</p>
        <section aria-labelledby="current-stage-heading">
          <h2 id="current-stage-heading">当前开发阶段</h2>
          <p>
            工程初始化。纯 TypeScript 规则核心将在后续任务实现。
          </p>
        </section>
      </article>
    </main>
  )
}
