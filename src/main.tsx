import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { selectApplicationEntry } from './app/application-entry'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('缺少应用挂载节点')
}

const root = createRoot(rootElement)
const render = (content: ReactNode) => root.render(<StrictMode>{content}</StrictMode>)
const entry = selectApplicationEntry({
  isDevelopment: import.meta.env.DEV,
  search: window.location.search,
})

if (entry === 'development-preview' && import.meta.env.DEV) {
  void import('./styles.css')
  void import('./ui/dev-preview/development-ui-preview').then(({ default: Preview }) => {
    render(<Preview />)
  })
} else if (entry === 'infected-world-playtest' && import.meta.env.DEV) {
  void import('./ui/infected-world').then(({ InfectedWorldApp }) => render(<InfectedWorldApp />))
} else {
  const [{ default: App }, composition, { bootstrapProductionRun }, { hospitalRunSaveRulesRegistry }] = await Promise.all([
    import('./App'), import('./app/production-composition'), import('./app/production-bootstrap'), import('./state/run-save'), import('./styles.css'),
  ])
  const { createProductionBrowserRunSaveStorage, createProductionHospitalNewRunDependencies, productionPresentationDependencies } = composition
  const storage = createProductionBrowserRunSaveStorage()
  const newRunDependencies = createProductionHospitalNewRunDependencies(storage)
  const initialBootstrapResult = bootstrapProductionRun({
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
  })
  const appProps = {
    initialBootstrapResult,
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
    presentationDependencies: productionPresentationDependencies,
    newRunDependencies,
  }
  if (import.meta.env.DEV) {
    void import('./app/dev-playtest-shell').then(({ default: DevPlaytestShell }) => {
      render(<DevPlaytestShell {...appProps} />)
    })
  } else {
    render(<App {...appProps} />)
  }
}
