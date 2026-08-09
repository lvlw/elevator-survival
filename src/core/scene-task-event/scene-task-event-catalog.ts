import { deepFreeze } from '../config'
import type { EquipmentProfileCatalog } from '../equipment'
import type { ItemCatalog } from '../inventory'
import type { ItemResourceCatalog } from '../item-state'
import type { SceneCombatDependencies, SceneCombatEncounterCatalog } from '../scene-combat'
import type { SceneGraph } from '../scene-graph'
import type {
  SceneTaskEventCatalog,
  SceneTaskEventDefinition,
  SceneTaskEventOptionDefinition,
} from './scene-task-event-types'

export class SceneTaskEventError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SceneTaskEventError'
  }
}

type RecordValue = Record<string, unknown>
const plain = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const exact = (value: RecordValue, keys: readonly string[]) => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function option(input: unknown): SceneTaskEventOptionDefinition {
  if (!plain(input) || !nonEmpty(input.id)) throw new SceneTaskEventError('Invalid scene task event option.')
  if (input.kind === 'decline' && exact(input, ['id', 'kind'])) return deepFreeze({ id: input.id, kind: 'decline' })
  if (
    input.kind === 'extract' &&
    exact(input, ['id', 'kind', 'extractionMode']) &&
    (input.extractionMode === 'direct' || input.extractionMode === 'cautious')
  ) return deepFreeze({ id: input.id, kind: 'extract', extractionMode: input.extractionMode })
  throw new SceneTaskEventError('Invalid scene task event option.')
}

export function createSceneTaskEventCatalog(
  inputs: readonly SceneTaskEventDefinition[],
  dependencies: Readonly<{
    graph: SceneGraph
    itemCatalog: ItemCatalog
    equipmentCatalog: EquipmentProfileCatalog
    itemResourceCatalog: ItemResourceCatalog
    encounterCatalog: SceneCombatEncounterCatalog
  }>,
): SceneTaskEventCatalog {
  const byId = new Map<string, SceneTaskEventDefinition>()
  for (const input of inputs as readonly unknown[]) {
    if (!plain(input) || !exact(input, ['id', 'impactProtection', 'nodeId', 'options', 'originIntelId', 'outputDefinitionId', 'outputIndex', 'requiredDefeatedEncounterId']) ||
      !nonEmpty(input.id) || !nonEmpty(input.nodeId) || !nonEmpty(input.requiredDefeatedEncounterId) ||
      !nonEmpty(input.outputDefinitionId) || !nonEmpty(input.originIntelId) ||
      !Number.isSafeInteger(input.outputIndex) || (input.outputIndex as number) < 0 ||
      !Array.isArray(input.options) || !plain(input.impactProtection)) {
      throw new SceneTaskEventError('Invalid scene task event definition.')
    }
    if (
      byId.has(input.id) ||
      !dependencies.graph.nodes.some(({ id }) => id === input.nodeId) ||
      !dependencies.itemCatalog.has(input.outputDefinitionId) ||
      !dependencies.encounterCatalog.has(input.requiredDefeatedEncounterId)
    ) {
      throw new SceneTaskEventError('Duplicate or invalid scene task event identity.')
    }
    const protection = input.impactProtection
    if (!exact(protection, ['definitionId', 'equipmentSlot', 'resourceKind']) || protection.equipmentSlot !== 'armor' || !nonEmpty(protection.definitionId) || protection.resourceKind !== 'integrity') {
      throw new SceneTaskEventError('Invalid task event impact protection.')
    }
    const profile = dependencies.equipmentCatalog.get(protection.definitionId)
    if (profile.kind !== 'equippable' || !profile.eligibleSlots.includes('armor') || dependencies.itemResourceCatalog.get(protection.definitionId).kind !== 'integrity') {
      throw new SceneTaskEventError('Task event impact protection does not match its catalogs.')
    }
    const options = input.options.map(option)
    if (options.length === 0 || new Set(options.map(({ id }) => id)).size !== options.length || !options.some((option) => option.kind === 'decline') || !options.some((option) => option.kind === 'extract' && option.extractionMode === 'direct') || !options.some((option) => option.kind === 'extract' && option.extractionMode === 'cautious')) {
      throw new SceneTaskEventError('Task event options must include unique direct, cautious, and decline choices.')
    }
    byId.set(input.id, deepFreeze({
      id: input.id,
      nodeId: input.nodeId,
      requiredDefeatedEncounterId: input.requiredDefeatedEncounterId,
      outputDefinitionId: input.outputDefinitionId,
      outputIndex: input.outputIndex as number,
      originIntelId: input.originIntelId,
      impactProtection: {
        equipmentSlot: 'armor',
        definitionId: protection.definitionId as string,
        resourceKind: 'integrity',
      },
      options,
    }))
  }
  const eventIds = [...byId.keys()].sort()
  return deepFreeze({
    eventIds,
    has: (eventId: string) => byId.has(eventId),
    get: (eventId: string) => {
      const result = byId.get(eventId)
      if (!result) throw new SceneTaskEventError(`Unknown scene task event: ${eventId}`)
      return result
    },
  })
}

/**
 * Task events are scene content and their prerequisite encounters are scene
 * content too. Validate the pair at every public scene restore/command edge.
 */
export function validateSceneTaskEventDependencies(
  catalog: SceneTaskEventCatalog | undefined,
  sceneCombat: SceneCombatDependencies | undefined,
  sceneInstanceId: string,
): void {
  if (!catalog || catalog.eventIds.length === 0) return
  if (!sceneCombat) {
    throw new SceneTaskEventError('Task event content requires scene combat dependencies.')
  }
  if (sceneCombat.combat.sceneInstanceId !== sceneInstanceId) {
    throw new SceneTaskEventError('Task event and combat dependencies must use the same scene instance.')
  }
  for (const eventId of catalog.eventIds) {
    const event = catalog.get(eventId)
    if (!sceneCombat.encounterCatalog.has(event.requiredDefeatedEncounterId)) {
      throw new SceneTaskEventError('Task event prerequisite encounter is not present in the combat catalog.')
    }
  }
}
