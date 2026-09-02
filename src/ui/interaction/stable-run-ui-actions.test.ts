import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
} from '../../content'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import {
  createSceneExplorationSnapshot,
  resolveMainSearchCommand,
  resolveSceneInventoryCommand,
  resolveSceneMoveCommand,
} from '../../core/scene-exploration'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
} from '../../core/scene-launch'
import { hospitalRunSaveRulesRegistry, hospitalSceneLaunchDependencies } from '../../state/run-save'
import { createHospitalDevelopmentPreviewScenario } from '../dev-preview/hospital-preview-scenarios'
import { hospitalV01UiLabels } from '../hospital-v0.1'
import {
  createStableRunUiInteractionModel,
  previewStableRunUiPickupDraft,
  previewStableRunUiSceneInventoryDraft,
} from './stable-run-ui-actions'

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

function moveToEmergencyHall() {
  const phase = launchScene()
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const scene = resolveSceneMoveCommand(phase.payload.scene, {
    edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
  }, runtime.dependencies).snapshot
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

function combatPhaseWithPipeState(current: number, backpackSpare = false, remainingTime?: number) {
  const scenario = createHospitalDevelopmentPreviewScenario('combat')
  const phase = scenario.store.getState().phase
  if (phase.kind !== 'scene-session') throw new Error('expected combat Scene')
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const pipe = phase.payload.scene.equipment.weapon
  if (!pipe) throw new Error('expected equipped pipe')
  const spare = item('ui-interaction-spare-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const backpack = backpackSpare
    ? createBackpackSnapshot({
        width: runtime.dependencies.config.backpack.width,
        height: runtime.dependencies.config.backpack.height,
        items: [spare],
        placements: [{ instanceId: spare.instanceId, x: 0, y: 0, rotated: false }],
      }, hospitalItemCatalog)
    : phase.payload.scene.backpack
  const states = phase.payload.scene.itemStates.states.map((state) =>
    state.instanceId === pipe.instanceId
      ? { ...state, resource: { kind: 'durability' as const, current } }
      : state)
  if (backpackSpare) states.push(createFullItemState(spare, hospitalItemResourceCatalog))
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    remainingTime: remainingTime ?? phase.payload.scene.remainingTime,
    backpack,
    itemStates: { states },
    combatState: {
      ...phase.payload.scene.combatState,
      encounters: phase.payload.scene.combatState.encounters.map((encounter) =>
        encounter.kind === 'active'
          ? {
              ...encounter,
              combat: {
                ...encounter.combat,
                backpack,
                itemStates: { states },
              },
            }
          : encounter),
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

function withEquippedItem(
  phase: ReturnType<typeof moveToEmergencyHall>,
  slot: 'weapon' | 'armor' | 'utility',
  definitionId: string,
) {
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const equipped = item(`ui-interaction-${slot}`, definitionId)
  const replaced = phase.payload.scene.equipment[slot]
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    equipment: { ...phase.payload.scene.equipment, [slot]: equipped },
    itemStates: {
      states: [
        ...phase.payload.scene.itemStates.states.filter(
          ({ instanceId }) => instanceId !== replaced?.instanceId,
        ),
        createFullItemState(equipped, hospitalItemResourceCatalog),
      ],
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

function withCardAtEmergencyHall(remainingTime?: number) {
  const phase = moveToEmergencyHall()
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const card = item('ui-interaction-hall-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
  const backpack = createBackpackSnapshot({
    ...phase.payload.scene.backpack,
    items: [...phase.payload.scene.backpack.items, card],
    placements: [...phase.payload.scene.backpack.placements, {
      instanceId: card.instanceId,
      x: 0,
      y: 0,
      rotated: false,
    }],
  }, hospitalItemCatalog)
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    ...(remainingTime === undefined ? {} : { remainingTime }),
    backpack,
    itemStates: {
      states: [...phase.payload.scene.itemStates.states, createFullItemState(card, hospitalItemResourceCatalog)],
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

function withRemainingTime(
  phase: ReturnType<typeof moveToEmergencyHall>,
  remainingTime: number,
) {
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    remainingTime,
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

function searchedEmergencyHall() {
  const phase = moveToEmergencyHall()
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const scene = resolveMainSearchCommand(phase.payload.scene, {
    illumination: 'use-equipped-flashlight',
  }, runtime.dependencies).snapshot
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

function sceneInventoryPhase() {
  const phase = moveToEmergencyHall()
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const bandageA = { instanceId: 'ui-inventory-bandage-a', definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 2 }
  const bandageB = { instanceId: 'ui-inventory-bandage-b', definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 }
  const flashlight = item('ui-inventory-flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const sample = item('ui-inventory-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase)
  const quick = item('ui-inventory-quick-painkiller', HOSPITAL_ITEM_IDS.painkiller)
  const carried = [bandageA, bandageB, flashlight, sample]
  const backpack = createBackpackSnapshot({
    width: runtime.dependencies.config.backpack.width,
    height: runtime.dependencies.config.backpack.height,
    items: carried,
    placements: [
      { instanceId: bandageA.instanceId, x: 0, y: 0, rotated: false },
      { instanceId: bandageB.instanceId, x: 1, y: 0, rotated: false },
      { instanceId: flashlight.instanceId, x: 2, y: 0, rotated: false },
      { instanceId: sample.instanceId, x: 3, y: 0, rotated: false },
    ],
  }, hospitalItemCatalog)
  const quickSlots = createQuickSlotSnapshot(
    [quick, null],
    runtime.dependencies.config.backpack.quickSlotCount,
    hospitalItemCatalog,
    hospitalItemQuickSlotCatalog,
  )
  const equipmentIds = new Set(Object.values(phase.payload.scene.equipment)
    .filter((candidate): candidate is ItemInstance => candidate !== null)
    .map(({ instanceId }) => instanceId))
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    backpack,
    quickSlots,
    itemStates: {
      states: [
        ...phase.payload.scene.itemStates.states.filter(({ instanceId }) => equipmentIds.has(instanceId)),
        ...[...carried, quick].map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)),
      ],
    },
  }, runtime.dependencies)
  return {
    phase: {
      kind: 'scene-session' as const,
      payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
    },
    ids: {
      bandageA: bandageA.instanceId,
      bandageB: bandageB.instanceId,
      flashlight: flashlight.instanceId,
      sample: sample.instanceId,
      quick: quick.instanceId,
    },
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
    const launch = first.actions.find(({ kind }) => kind === 'launch-main-scene')
    expect(launch).toBeDefined()
    expect(launch?.preview.facts).toEqual(expect.arrayContaining([
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
    for (const forbidden of ['金属零件', 'preparedOutcome', 'revealedItemSummary', 'revealedIntelIds', 'instanceId', 'randomTrace', 'riskPercent']) {
      expect(visible).not.toContain(forbidden)
    }
    expect(phase.payload.scene.currentNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
  })

  it('routes only formally executable fire-door options into safe labelled previews', () => {
    const base = createStableRunUiInteractionModel(moveToEmergencyHall(), dependencies)
    const obstacleActions = base.actions.filter(({ kind }) => kind === 'scene-obstacle')
    expect(obstacleActions.map(({ label }) => label)).toEqual([
      '隔离区防火门 · 强行撞门',
      '隔离区防火门 · 放弃处理',
    ])
    const force = obstacleActions[0]!
    expect(force.preview.facts).toEqual(expect.arrayContaining([
      { label: '是否触发警觉', value: '是' },
      { label: '轻度挫伤风险', value: '低' },
      { label: '冲击防护', value: '当前防护装备生效' },
    ]))
    expect(force.preview.branches.map(({ title }) => title)).toEqual([
      '若未产生轻度挫伤',
      '若产生轻度挫伤',
    ])
    const decline = obstacleActions[1]!
    expect(decline.preview.facts).toEqual(expect.arrayContaining([
      { label: '行动耗时', value: '0' },
      { label: '是否触发警觉', value: '否' },
    ]))
    expect(decline.command).toMatchObject({
      kind: 'scene',
      command: { kind: 'scene-obstacle', command: expect.any(Object) },
    })
    const visible = JSON.stringify(obstacleActions.map(({ label, preview }) => ({ label, preview })))
    for (const hidden of ['riskPercent', 'riskTrace', 'roll', 'streamId', 'drawIndex', 'causedMinorContusion', 'snapshot', 'effects', 'obstacleId', 'optionId']) {
      expect(visible).not.toContain(hidden)
    }
  })

  it('derives all equipment/card option availability and resource facts from formal previews', () => {
    const cases = [
      [withCardAtEmergencyHall(), '使用门禁卡', null],
      [withEquippedItem(moveToEmergencyHall(), 'utility', HOSPITAL_ITEM_IDS.crowbar), '使用撬棍', '3 → 2'],
      [withEquippedItem(moveToEmergencyHall(), 'utility', HOSPITAL_ITEM_IDS.toolkit), '使用工具箱', '2 → 1'],
      [withEquippedItem(moveToEmergencyHall(), 'weapon', HOSPITAL_ITEM_IDS.fireAxe), '使用消防斧', '2 → 1'],
    ] as const
    for (const [phase, optionName, resource] of cases) {
      const action = createStableRunUiInteractionModel(phase, dependencies).actions.find(
        ({ label }) => label === `隔离区防火门 · ${optionName}`,
      )
      expect(action).toBeDefined()
      if (resource) expect(action?.preview.facts).toContainEqual(expect.objectContaining({ value: resource }))
    }
    const toolkit = createStableRunUiInteractionModel(cases[2][0], dependencies).actions.find(
      ({ label }) => label === '隔离区防火门 · 使用工具箱',
    )
    expect(toolkit?.preview.facts).toContainEqual({ label: '节点地面产物', value: '电子元件 ×1' })
  })

  it('projects deterministic and uncertain near-zero obstacle outcomes without hidden rolls', () => {
    const card = createStableRunUiInteractionModel(withCardAtEmergencyHall(5), dependencies).actions.find(
      ({ label }) => label === '隔离区防火门 · 使用门禁卡',
    )
    expect(card?.preview.facts).toEqual(expect.arrayContaining([
      { label: '行动后剩余时间', value: '0' },
      { label: '超时债务', value: '5' },
      { label: '预计结果', value: '强制返回' },
    ]))
    const force = createStableRunUiInteractionModel(
      withRemainingTime(moveToEmergencyHall(), 5),
      dependencies,
    ).actions.find(({ label }) => label === '隔离区防火门 · 强行撞门')
    expect(force?.preview.branches).toHaveLength(2)
    for (const branch of force?.preview.branches ?? []) {
      expect(branch.facts).toEqual(expect.arrayContaining([
        { label: '行动后剩余时间', value: '0' },
        { label: '超时债务', value: '15' },
      ]))
    }
  })

  it('warns when a continuing action falls below its formal return estimate', () => {
    const phase = withRemainingTime(moveToEmergencyHall(), 25)
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    const search = interaction.actions.find(({ label }) => label === '主要搜索 · 使用手电筒')
    expect(search?.preview.warnings).toContain('行动后剩余时间低于预计安全返程线。')
  })

  it('projects the complete formal over-time consequence allow-list for Move and Search', () => {
    const phase = withRemainingTime(moveToEmergencyHall(), 5)
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    const move = interaction.actions.find(({ label }) => label === '前往 电梯前室')
    const search = interaction.actions.find(({ label }) => label === '主要搜索 · 使用手电筒')
    const expectedLabels = [
      '超时债务',
      '有效紧急撤离时间',
      '强制返程基础损耗',
      '强制返程流血追加',
      '强制返程总损耗',
      '行动后生命',
      '死亡风险',
    ]
    expect(move?.preview.facts.map(({ label }) => label)).toEqual(expect.arrayContaining(expectedLabels))
    expect(search?.preview.facts.map(({ label }) => label)).toEqual(expect.arrayContaining(expectedLabels))
  })

  it('offers only revealed ground items and delegates explicit quantity and placement to the formal pickup preview', () => {
    const phase = searchedEmergencyHall()
    const timeBefore = phase.payload.scene.remainingTime
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    expect(interaction.pickupOpportunities.length).toBeGreaterThan(0)
    const opportunity = interaction.pickupOpportunities.find(({ name }) => name === '金属零件')!
    expect(opportunity.name).toBe('金属零件')
    const preview = previewStableRunUiPickupDraft(phase, {
      opportunityId: opportunity.id,
      quantity: 1,
      x: 0,
      y: 0,
      rotated: false,
    }, dependencies)
    expect(preview).toMatchObject({ canExecute: true })
    expect(preview?.facts).toEqual(expect.arrayContaining([
      { label: '背包负重', value: '0 → 1' },
      { label: '拾取后负重状态', value: '正常' },
    ]))
    expect(preview?.command).toMatchObject({
      kind: 'scene',
      command: { kind: 'scene-node-item-pickup', command: { quantity: 1, placement: { x: 0, y: 0, rotated: false } } },
    })
    expect(phase.payload.scene.remainingTime).toBe(timeBefore)
  })

  it('projects all formal combat commands through player-safe metadata only', () => {
    const scenario = createHospitalDevelopmentPreviewScenario('combat')
    const phase = scenario.store.getState().phase
    const before = structuredClone(phase)
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    expect(interaction.actions.map(({ label }) => label)).toEqual(expect.arrayContaining([
      '挥击',
      '蓄力击打',
      '防御',
      '逃跑',
      '使用绷带 · 处理撕裂伤 1',
    ]))
    expect(interaction.actions.every(({ kind }) => kind === 'scene-combat-action')).toBe(true)
    const charged = interaction.actions.find(({ label }) => label === '蓄力击打')!
    expect(charged.preview.facts).toEqual(expect.arrayContaining([
      { label: '行动时间刻度', value: '180' },
      { label: '预计造成伤害', value: '6' },
      { label: '武器耐久', value: '6 → 3' },
      { label: '敌人行动延后', value: '200' },
    ]))
    const serialized = JSON.stringify(interaction)
    for (const hidden of ['riskPercent', 'roll', 'streamId', 'drawIndex', 'succeeded', 'preparedOutcome', 'nextCycleIndex', 'resolvedActionCount']) {
      expect(serialized).not.toContain(hidden)
    }
    expect(phase).toEqual(before)
    expect(scenario.storage.writes).toBe(0)
  })

  it('allows DEC-036 charged break use and warns for durability 1 → 0', () => {
    const interaction = createStableRunUiInteractionModel(
      combatPhaseWithPipeState(1),
      dependencies,
    )
    const charged = interaction.actions.find(({ label }) => label === '蓄力击打')
    expect(charged?.preview.facts).toContainEqual({ label: '武器耐久', value: '1 → 0' })
    expect(charged?.preview.warnings).toContain('⚠ 本次攻击后金属管将损坏。')
  })

  it('uses DEC-037 slot-only temporary attack eligibility without touching a backpack spare', () => {
    const phase = combatPhaseWithPipeState(0, true)
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    expect(interaction.actions.map(({ label }) => label)).toContain('临时攻击')
    expect(interaction.actions.map(({ label }) => label)).not.toContain('挥击')
    expect(interaction.actions.map(({ label }) => label)).not.toContain('蓄力击打')
    const temporary = interaction.actions.find(({ label }) => label === '临时攻击')!
    expect(temporary.contextNote).toBe('当前装备武器已无法执行攻击，因此可以使用临时攻击。')
    expect(temporary.preview.facts).toEqual(expect.arrayContaining([
      { label: '行动时间刻度', value: '140' },
      { label: '预计造成伤害', value: '2' },
    ]))
    expect(temporary.preview.facts.some(({ label }) => label === '武器耐久')).toBe(false)
  })

  it('projects a near-zero attack terminal as a conditional branch without declaring victory', () => {
    const interaction = createStableRunUiInteractionModel(
      combatPhaseWithPipeState(6, false, 5),
      dependencies,
    )
    const basic = interaction.actions.find(({ label }) => label === '挥击')!
    expect(basic.preview.branches).toHaveLength(1)
    expect(basic.preview.branches[0]).toEqual(expect.objectContaining({
      title: '若本次攻击使敌人失去能力',
      facts: expect.arrayContaining([
        { label: '战斗场景时间', value: '10' },
        { label: '结算后剩余时间', value: '0' },
        { label: '超时债务', value: '5' },
      ]),
    }))
    expect(basic.preview.facts).not.toContainEqual(expect.objectContaining({ label: '敌人剩余生命' }))
    expect(JSON.stringify(basic.preview)).not.toContain('enemy.currentHealth')
  })

  it('projects the formal near-zero escape time, return loss range, and death possibility', () => {
    const interaction = createStableRunUiInteractionModel(
      combatPhaseWithPipeState(6, false, 5),
      dependencies,
    )
    const escape = interaction.actions.find(({ label }) => label === '逃跑')!
    expect(escape.preview.branches).toHaveLength(0)
    expect(escape.preview.facts).toEqual(expect.arrayContaining([
      { label: '战斗场景时间', value: '10' },
      { label: '完成节点', value: '急诊大厅' },
      { label: '当前剩余场景时间', value: '5' },
      { label: '结算后剩余时间', value: '0' },
      { label: '超时债务', value: '5' },
      { label: '预计返程时间', value: '11' },
      { label: '有效紧急撤离时间', value: '16' },
      { label: '强制返程基础损耗', value: '1' },
      { label: '强制返程流血追加', value: '1' },
      { label: '强制返程总损耗', value: '2' },
      { label: '强制返程后生命', value: '4' },
      { label: '死亡风险', value: '未发现' },
      { label: '生还结果', value: '进入强制返程' },
      { label: '强制返程目标', value: '电梯前室' },
    ]))
  })

  it('builds identity-safe Scene Inventory opportunities only for an active Scene', () => {
    const { phase, ids } = sceneInventoryPhase()
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    expect(interaction.inventoryOpportunities.map(({ sourceLabel }) => sourceLabel)).toEqual([
      '绷带 ×2 · 背包格 1,1',
      '绷带 · 背包格 2,1',
      '手电筒 · 背包格 3,1',
      '密封病原样本箱 · 背包格 4,1',
      '快捷栏1 · 止痛药',
    ])
    expect(interaction.inventoryOpportunities.find(
      ({ sourceInstanceId }) => sourceInstanceId === ids.sample,
    )?.requiresQuestDropConfirmation).toBe(true)
    const visible = JSON.stringify(interaction.inventoryOpportunities.map(
      ({ name, sourceLabel, quantity, canRotate, operations }) => ({
        name,
        sourceLabel,
        quantity,
        canRotate,
        operations,
      }),
    ))
    for (const hidden of Object.values(ids)) expect(visible).not.toContain(hidden)

    const combat = createStableRunUiInteractionModel(combatPhaseWithPipeState(6), dependencies)
    expect(combat.inventoryOpportunities).toEqual([])
  })

  it('routes all seven formal Scene Inventory commands through player-safe previews', () => {
    const { phase, ids } = sceneInventoryPhase()
    const interaction = createStableRunUiInteractionModel(phase, dependencies)
    const opportunity = (instanceId: string) => interaction.inventoryOpportunities.find(
      ({ sourceInstanceId }) => sourceInstanceId === instanceId,
    )!
    const base = {
      quantity: null,
      targetOpportunityId: null,
      targetSlotIndex: null,
      x: null,
      y: null,
      rotated: false,
    }
    const drafts = [
      { ...base, opportunityId: opportunity(ids.flashlight).id, operation: 'move' as const, x: 0, y: 2, rotated: true },
      { ...base, opportunityId: opportunity(ids.bandageA).id, operation: 'split' as const, quantity: 1, x: 5, y: 0 },
      { ...base, opportunityId: opportunity(ids.bandageB).id, operation: 'merge' as const, quantity: 1, targetOpportunityId: opportunity(ids.bandageA).id },
      { ...base, opportunityId: opportunity(ids.bandageA).id, operation: 'backpack-to-quick-slot' as const, targetSlotIndex: 1 },
      { ...base, opportunityId: opportunity(ids.quick).id, operation: 'quick-slot-to-backpack' as const, x: 5, y: 3 },
      { ...base, opportunityId: opportunity(ids.flashlight).id, operation: 'drop' as const },
      { ...base, opportunityId: opportunity(ids.sample).id, operation: 'drop' as const },
    ]
    const previews = drafts.map((draft) =>
      previewStableRunUiSceneInventoryDraft(phase, draft, dependencies))
    expect(previews.every((preview) => preview?.canExecute)).toBe(true)
    expect(previews.map((preview) => {
      const application = preview?.command
      return application?.kind === 'scene' && application.command.kind === 'scene-inventory'
        ? application.command.command.kind
        : null
    })).toEqual([
      'move-scene-backpack-item',
      'split-scene-backpack-stack',
      'merge-scene-backpack-stacks',
      'scene-backpack-to-quick-slot',
      'scene-quick-slot-to-backpack',
      'drop-scene-backpack-item',
      'confirm-drop-scene-quest-item',
    ])
    expect(previews[6]?.questDropWarning).toBe(true)
    expect(previews[6]?.preview?.warnings).toContain('这是任务物品。')
    const visible = JSON.stringify(previews.map((preview) => preview?.preview))
    for (const hidden of [
      ...Object.values(ids),
      'instanceId',
      'sourceInstanceId',
      'targetInstanceId',
      'splitInstanceId',
      'audit',
      'effects',
      'snapshot',
      'transitionPlan',
    ]) expect(visible).not.toContain(hidden)
  })

  it('keeps invalid Inventory drafts behind the formal Preview boundary', () => {
    const { phase, ids } = sceneInventoryPhase()
    const opportunities = createStableRunUiInteractionModel(phase, dependencies).inventoryOpportunities
    const source = opportunities.find(({ sourceInstanceId }) => sourceInstanceId === ids.bandageA)!
    const incompatible = opportunities.find(({ sourceInstanceId }) => sourceInstanceId === ids.flashlight)!
    const invalid = previewStableRunUiSceneInventoryDraft(phase, {
      opportunityId: source.id,
      operation: 'merge',
      quantity: 1,
      targetOpportunityId: incompatible.id,
      targetSlotIndex: null,
      x: null,
      y: null,
      rotated: false,
    }, dependencies)
    expect(invalid).toMatchObject({ canExecute: false, command: null })
  })

  it('revalidates stale merge targets, quick slots, placements, and source coordinates', () => {
    const { phase, ids } = sceneInventoryPhase()
    const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
    const initial = createStableRunUiInteractionModel(phase, dependencies).inventoryOpportunities
    const byId = (instanceId: string) => initial.find(
      ({ sourceInstanceId }) => sourceInstanceId === instanceId,
    )!
    const base = {
      quantity: null,
      targetOpportunityId: null,
      targetSlotIndex: null,
      x: null,
      y: null,
      rotated: false,
    }

    const targetDroppedScene = resolveSceneInventoryCommand(phase.payload.scene, {
      kind: 'drop-scene-backpack-item',
      instanceId: ids.bandageA,
    }, runtime.dependencies).snapshot
    const targetDropped = {
      kind: 'scene-session' as const,
      payload: createRunSceneSessionSnapshot({
        context: phase.payload.context,
        scene: targetDroppedScene,
      }, hospitalSceneLaunchDependencies),
    }
    expect(previewStableRunUiSceneInventoryDraft(targetDropped, {
      ...base,
      opportunityId: byId(ids.bandageB).id,
      operation: 'merge',
      quantity: 1,
      targetOpportunityId: byId(ids.bandageA).id,
    }, dependencies)).toBeNull()

    const slotFilledScene = resolveSceneInventoryCommand(phase.payload.scene, {
      kind: 'scene-backpack-to-quick-slot',
      instanceId: ids.bandageB,
      targetSlotIndex: 1,
    }, runtime.dependencies).snapshot
    const slotFilled = {
      kind: 'scene-session' as const,
      payload: createRunSceneSessionSnapshot({
        context: phase.payload.context,
        scene: slotFilledScene,
      }, hospitalSceneLaunchDependencies),
    }
    expect(previewStableRunUiSceneInventoryDraft(slotFilled, {
      ...base,
      opportunityId: byId(ids.bandageA).id,
      operation: 'backpack-to-quick-slot',
      targetSlotIndex: 1,
    }, dependencies)).toMatchObject({ canExecute: false, command: null })

    const occupiedScene = resolveSceneInventoryCommand(phase.payload.scene, {
      kind: 'move-scene-backpack-item',
      instanceId: ids.bandageB,
      placement: { instanceId: ids.bandageB, x: 5, y: 3, rotated: false },
    }, runtime.dependencies).snapshot
    const occupied = {
      kind: 'scene-session' as const,
      payload: createRunSceneSessionSnapshot({
        context: phase.payload.context,
        scene: occupiedScene,
      }, hospitalSceneLaunchDependencies),
    }
    expect(previewStableRunUiSceneInventoryDraft(occupied, {
      ...base,
      opportunityId: byId(ids.bandageA).id,
      operation: 'move',
      x: 5,
      y: 3,
    }, dependencies)).toMatchObject({ canExecute: false, command: null })

    const sourceMovedScene = resolveSceneInventoryCommand(phase.payload.scene, {
      kind: 'move-scene-backpack-item',
      instanceId: ids.bandageA,
      placement: { instanceId: ids.bandageA, x: 5, y: 2, rotated: false },
    }, runtime.dependencies).snapshot
    const sourceMoved = {
      kind: 'scene-session' as const,
      payload: createRunSceneSessionSnapshot({
        context: phase.payload.context,
        scene: sourceMovedScene,
      }, hospitalSceneLaunchDependencies),
    }
    expect(createStableRunUiInteractionModel(sourceMoved, dependencies).inventoryOpportunities.find(
      ({ sourceInstanceId }) => sourceInstanceId === ids.bandageA,
    )?.sourceLabel).toBe('绷带 ×2 · 背包格 6,3')
  })
})
