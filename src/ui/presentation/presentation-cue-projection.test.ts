import { describe, expect, it } from 'vitest'
import { createHospitalDevelopmentPreviewScenario } from '../dev-preview/hospital-preview-scenarios'
import { hospitalV01PresentationAssets, hospitalV01UiLabels } from '../hospital-v0.1'
import { createStableRunUiInteractionModel } from '../interaction'
import { didPlayerSustainVisibleCombatHurt, projectStableRunPresentationCues } from './presentation-cue-projection'
import { hospitalRunSaveRulesRegistry } from '../../state/run-save'
import { createStableRunStore } from '../../state/run-store'
import type { StableRunUiAction } from '../interaction'

function actionFor(
  phase: Parameters<typeof createStableRunUiInteractionModel>[0],
  kind: StableRunUiAction['kind'],
  commandKind?: string,
): StableRunUiAction {
  const action = createStableRunUiInteractionModel(phase, dependencies).actions.find((candidate) =>
    candidate.kind === kind && (!commandKind ||
      (candidate.command.kind === 'scene' &&
        candidate.command.command.kind === 'scene-combat-action' &&
        candidate.command.command.command.kind === commandKind)))
  if (!action) throw new Error(`missing formal ${kind} action`)
  return action
}

const dependencies = {
  rulesRegistry: hospitalRunSaveRulesRegistry,
  labels: hospitalV01UiLabels,
  assets: hospitalV01PresentationAssets,
}

describe('committed presentation cue projection', () => {
  it('classifies health loss or a newly public open wound, but not an unchanged combat condition', () => {
    const phase = createHospitalDevelopmentPreviewScenario('combat').store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected combat Scene')
    const before = phase.payload.scene.condition
    expect(didPlayerSustainVisibleCombatHurt(before, before)).toBe(false)
    expect(didPlayerSustainVisibleCombatHurt(before, { ...before, currentHealth: before.currentHealth - 1 })).toBe(true)
    expect(didPlayerSustainVisibleCombatHurt(before, {
      ...before,
      openWounds: [...before.openWounds, { id: 'new-public-wound', kind: 'bite', treatment: 'untreated' }],
    })).toBe(true)
  })
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
    const searchAction = actionFor(execution.phase, 'scene-main-search')
    const searchExecution = scenario.store.dispatch(searchAction.command)
    expect(projectStableRunPresentationCues({
      beforePhase: execution.phase,
      action: searchAction,
      execution: searchExecution,
      assets: hospitalV01PresentationAssets,
    })).toEqual(['scene-search-complete'])
    expect(searchExecution.phase.kind).toBe('scene-session')
    if (searchExecution.phase.kind !== 'scene-session') throw new Error('expected scene')
    expect(searchExecution.phase.payload.scene.currentNodeId).toBe(
      (execution.phase.kind === 'scene-session' ? execution.phase.payload.scene.currentNodeId : null),
    )
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
    if (execution.phase.kind !== 'scene-session') throw new Error('expected committed combat Scene')
    expect(execution.phase.payload.scene.condition.currentHealth)
      .toBeLessThan(beforePhase.payload.scene.condition.currentHealth)
    expect(cues).toContain('combat-player-hurt')
  })

  it('does not play the basic cue for a formally committed charged strike', () => {
    const scenario = createHospitalDevelopmentPreviewScenario('combat')
    const beforePhase = scenario.store.getState().phase
    const action = actionFor(beforePhase, 'scene-combat-action', 'metal-pipe-charged-strike')
    const execution = scenario.store.dispatch(action.command)
    expect(projectStableRunPresentationCues({ beforePhase, action, execution, assets: hospitalV01PresentationAssets }))
      .not.toContain('combat-player-basic')
  })

  it('preserves the committed scene-move cue after one storage write failure', () => {
    const scenario = createHospitalDevelopmentPreviewScenario('scene')
    const beforePhase = scenario.store.getState().phase
    const action = actionFor(beforePhase, 'scene-move')
    let writes = 0
    const store = createStableRunStore({
      initialPhase: beforePhase,
      rulesRegistry: hospitalRunSaveRulesRegistry,
      storage: {
        read: () => null,
        clear: () => undefined,
        write: () => { writes += 1; throw new Error('storage unavailable') },
      },
    })
    const execution = store.dispatch(action.command)
    expect(execution.kind).toBe('executed-with-save-failure')
    expect(writes).toBe(1)
    expect(projectStableRunPresentationCues({ beforePhase, action, execution, assets: hospitalV01PresentationAssets }))
      .toEqual(['scene-move'])
    expect(store.getState().phase).toBe(execution.phase)
  })
})
