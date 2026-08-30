import { useMemo, useState } from 'react'
import { hospitalRunSaveRulesRegistry } from '../../state/run-save'
import { hospitalV01UiLabels } from '../hospital-v0.1'
import { StableRunUiApp } from '../stable-run-ui-app'
import {
  createHospitalDevelopmentPreviewScenario,
  type DevelopmentPreviewScenario,
  type DevelopmentPreviewScenarioKind,
} from './hospital-preview-scenarios'

const scenarios: readonly Readonly<{
  kind: DevelopmentPreviewScenarioKind
  label: string
}>[] = Object.freeze([
  { kind: 'hub', label: 'Hub 示例' },
  { kind: 'hub-returned', label: '已返程 Hub 示例' },
  { kind: 'hub-maintenance', label: 'Hub 维护示例' },
  { kind: 'scene', label: 'Scene 示例' },
  { kind: 'combat', label: 'Combat 示例' },
  { kind: 'failure', label: 'Failure 示例' },
])

export interface DevelopmentUiPreviewHarnessProps {
  /** Test-only observation seam; production uses the formal scenario factory. */
  readonly createScenario?: (kind: DevelopmentPreviewScenarioKind) => DevelopmentPreviewScenario
}

/** Development observation harness, not a Run lifecycle or gameplay command surface. */
export default function DevelopmentUiPreviewHarness({
  createScenario = createHospitalDevelopmentPreviewScenario,
}: DevelopmentUiPreviewHarnessProps) {
  const [selected, setSelected] = useState<DevelopmentPreviewScenarioKind>('hub')
  const scenario = useMemo(
    () => createScenario(selected),
    [createScenario, selected],
  )
  return <>
    <aside className="development-preview-banner" aria-label="开发预览">
      <strong>开发预览</strong>
      <span>不是活动 Run · 使用内存状态</span>
      <div className="development-preview-selector">
        {scenarios.map(({ kind, label }) => <button
          key={kind}
          type="button"
          aria-pressed={selected === kind}
          onClick={() => setSelected(kind)}
        >{label}</button>)}
      </div>
    </aside>
    <StableRunUiApp
      store={scenario.store}
      presentationDependencies={{
        rulesRegistry: hospitalRunSaveRulesRegistry,
        labels: hospitalV01UiLabels,
      }}
    />
  </>
}
