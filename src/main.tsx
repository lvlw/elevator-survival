import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { selectApplicationEntry } from './app/application-entry'
import {
  createProductionBrowserRunSaveStorage,
  createProductionHospitalNewRunDependencies,
  productionPresentationDependencies,
} from './app/production-composition'
import { bootstrapProductionRun } from './app/production-bootstrap'
import { hospitalRunSaveRulesRegistry } from './state/run-save'
import './styles.css'

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
  void import('./ui/dev-preview/development-ui-preview').then(({ default: Preview }) => {
    render(<Preview />)
  })
} else {
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
