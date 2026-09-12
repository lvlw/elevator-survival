import { describe, expect, it } from 'vitest'
import { createHospitalDevelopmentPreviewScenario } from '../dev-preview/hospital-preview-scenarios'
import { hospitalV01PresentationAssets, hospitalV01UiLabels } from '../hospital-v0.1'
import { createStableRunUiInteractionModel } from '../interaction'
import { projectStableRunPresentationCues } from './presentation-cue-projection'
import { hospitalRunSaveRulesRegistry } from '../../state/run-save'

const dependencies = {
  rulesRegistry: hospitalRunSaveRulesRegistry,
  labels: hospitalV01UiLabels,
  assets: hospitalV01PresentationAssets,
}

describe('committed presentation cue projection', () => {
  it('plays scene move only after a successful node-changing execution', () => {
    const scenario = createHospitalDevelopmentPreviewScenario('scene')
    const beforePhase = scenario.store.getState().phase
    if (beforePhase.kind !== 'scene-session') throw new Error('expected scene fixture')
    const action = createStableRunUiInteractionModel(beforePhase, dependencies).actions
      .find((candidate) => candidate.kind === 'scene-move')
    if (!action) throw new Error('expected move action')
    const execution = scenario.store.dispatch(action.command)
    expect(projectStableRunPresentationCues({
      beforePhase,
      action,
      execution,
      assets: hospitalV01PresentationAssets,
    })).toEqual(['scene-move'])
  })

  it('does not infer a gameplay cue from an unrelated execution', () => {
    const scenario = createHospitalDevelopmentPreviewScenario('scene')
    const beforePhase = scenario.store.getState().phase
    if (beforePhase.kind !== 'scene-session') throw new Error('expected scene fixture')
    const action = createStableRunUiInteractionModel(beforePhase, dependencies).actions
      .find((candidate) => candidate.kind === 'scene-move')
    if (!action) throw new Error('expected move action')
    const execution = scenario.store.dispatch(action.command)
    expect(projectStableRunPresentationCues({
      beforePhase,
      action: { ...action, kind: 'scene-main-search' },
      execution,
      assets: hospitalV01PresentationAssets,
    })).toEqual([])
  })

  it('uses the public combat action kind and committed health facts', () => {
    const scenario = createHospitalDevelopmentPreviewScenario('combat')
    const beforePhase = scenario.store.getState().phase
    if (beforePhase.kind !== 'scene-session') throw new Error('expected combat fixture')
    const action = createStableRunUiInteractionModel(beforePhase, dependencies).actions
      .find((candidate) => {
        if (candidate.kind !== 'scene-combat-action' || candidate.command.kind !== 'scene') return false
        return candidate.command.command.kind === 'scene-combat-action' &&
          candidate.command.command.command.kind === 'metal-pipe-basic-attack'
      })
    if (!action) throw new Error('expected combat action')
    const execution = scenario.store.dispatch(action.command)
    const cues = projectStableRunPresentationCues({
      beforePhase,
      action,
      execution,
      assets: hospitalV01PresentationAssets,
    })
    expect(cues[0]).toBe('combat-player-basic')
  })
})
