import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemResourceCatalog,
} from '../../content'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState } from '../../core/item-state'
import {
  createSceneExplorationSnapshot,
  resolveSceneMoveCommand,
} from '../../core/scene-exploration'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
} from '../../core/scene-launch'
import { hospitalRunSaveRulesRegistry, hospitalSceneLaunchDependencies } from '../../state/run-save'
import { createHospitalDevelopmentPreviewScenario } from '../dev-preview/hospital-preview-scenarios'
import { hospitalV01UiLabels } from '../hospital-v0.1'
import { createStableRunUiInteractionModel } from './stable-run-ui-actions'

const dependencies = {
  rulesRegistry: hospitalRunSaveRulesRegistry,
  labels: hospitalV01UiLabels,
}

const item = (instanceId: string, definitionId: string): ItemInstance =>
  ({ instanceId, definitionId, quantity: 1 })

function launchScene() {
  const scenario = createHospitalDevelopmentPreviewScenario('scene')
  const phase = scenario.store.getState().phase
  if (phase.kind !== 'scene-session') throw new Error('expected Scene session')
  return phase
}

function moveToSecurityOffice() {
  const phase = launchScene()
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const hall = resolveSceneMoveCommand(phase.payload.scene, {
    edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
  }, runtime.dependencies).snapshot
  const security = resolveSceneMoveCommand(hall, {
    edgeId: HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice,
  }, runtime.dependencies).snapshot
  const card = item('ui-interaction-access-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
  const backpack = createBackpackSnapshot({
    width: runtime.dependencies.config.backpack.width,
    height: runtime.dependencies.config.backpack.height,
    items: [card],
    placements: [{ instanceId: card.instanceId, x: 0, y: 0, rotated: false }],
  }, hospitalItemCatalog)
  const scene = createSceneExplorationSnapshot({
    ...security,
    backpack,
    itemStates: {
      states: [...security.itemStates.states, createFullItemState(card, hospitalItemResourceCatalog)],
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

describe('stable Run UI interaction model', () => {
  it('derives a frozen, repeatable, safe Launch action from the formal launch preview', () => {
    const scenario = createHospitalDevelopmentPreviewScenario('hub')
    const phase = scenario.store.getState().phase
    const before = JSON.stringify(phase)
    const first = createStableRunUiInteractionModel(phase, dependencies)
    const second = createStableRunUiInteractionModel(phase, dependencies)

    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(first.actions).toHaveLength(1)
    expect(first.actions[0]?.kind).toBe('launch-main-scene')
    expect(first.actions[0]?.preview.facts).toEqual(expect.arrayContaining([
      { label: '当前游戏日', value: '第 2 日' },
      { label: '今日主要场景', value: '确认后将被使用' },
    ]))
    expect(JSON.stringify(phase)).toBe(before)
    const visible = JSON.stringify(first.actions.map(({ id, kind, label, preview }) => ({ id, kind, label, preview })))
    for (const forbidden of ['runId', 'seed', 'rulesVersion', 'sceneInstanceId', 'preparedOutcome', 'randomTrace', 'instanceId']) {
      expect(visible).not.toContain(forbidden)
    }
  })

  it('uses the same formal effective-edge adapter for display and Move availability, including backpack permission access', () => {
    const phase = moveToSecurityOffice()
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    const moves = interaction.actions.filter(({ kind }) => kind === 'scene-move')
    expect(moves.map(({ label }) => label)).toContain('前往 隔离走廊')
    expect(moves.find(({ label }) => label === '前往 隔离走廊')?.command).toMatchObject({
      kind: 'scene',
      command: { kind: 'scene-move', command: { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor } },
    })
    expect(phase.payload.scene.enabledEdgeIds).not.toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
    expect(phase.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      definitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard,
    }))
  })

  it('offers only formally previewable Move and Search actions without leaking materialized search outcomes', () => {
    const initial = launchScene()
    const runtime = getRunSceneRuntime(initial.payload, hospitalSceneLaunchDependencies)
    const hall = resolveSceneMoveCommand(initial.payload.scene, {
      edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
    }, runtime.dependencies).snapshot
    const phase = {
      kind: 'scene-session' as const,
      payload: createRunSceneSessionSnapshot({ context: initial.payload.context, scene: hall }, hospitalSceneLaunchDependencies),
    }
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    expect(interaction.actions.map(({ label }) => label)).toEqual(expect.arrayContaining([
      '前往 电梯前室',
      '主要搜索 · 使用手电筒',
      '主要搜索 · 无照明',
    ]))
    const flashlightSearch = interaction.actions.find(({ label }) => label === '主要搜索 · 使用手电筒')
    expect(flashlightSearch?.preview.facts).toContainEqual({ label: '照明资源', value: '3 → 2' })
    const visible = JSON.stringify(interaction.actions.map(({ id, kind, label, preview }) => ({ id, kind, label, preview })))
    for (const forbidden of ['金属零件', 'preparedOutcome', 'revealedItemSummary', 'revealedIntelIds', 'randomTrace', 'riskPercent']) {
      expect(visible).not.toContain(forbidden)
    }
    expect(phase.payload.scene.currentNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
  })
})
