import { CombatError } from './combat-errors'
import { hasExactObjectKeys } from './combat-validation'
import type {
  CombatDependencies,
  EnemyDefinition,
} from './combat-types'
import type { ItemEquipmentProfile } from '../equipment'
import type { ItemResourceProfile } from '../item-state'

function bindingMismatch(message: string): never {
  throw new CombatError('COMBAT_CONTENT_BINDING_MISMATCH', message)
}

export function validateCombatDependencies(
  dependencies: CombatDependencies,
): void {
  if (
    !dependencies ||
    typeof dependencies !== 'object' ||
    Array.isArray(dependencies) ||
    typeof dependencies.runSeed !== 'string' ||
    dependencies.runSeed.trim().length === 0 ||
    typeof dependencies.sceneInstanceId !== 'string' ||
    dependencies.sceneInstanceId.trim().length === 0 ||
    !hasExactObjectKeys(dependencies.bindings, [
      'bandageDefinitionId',
      'enemyDefinitionId',
      'heavyCoatDefinitionId',
      'metalPipeDefinitionId',
      'painkillerDefinitionId',
    ]) ||
    typeof dependencies.bindings.enemyDefinitionId !== 'string' ||
    dependencies.bindings.enemyDefinitionId.trim().length === 0 ||
    typeof dependencies.bindings.metalPipeDefinitionId !== 'string' ||
    dependencies.bindings.metalPipeDefinitionId.trim().length === 0 ||
    typeof dependencies.bindings.heavyCoatDefinitionId !== 'string' ||
    dependencies.bindings.heavyCoatDefinitionId.trim().length === 0 ||
    typeof dependencies.bindings.bandageDefinitionId !== 'string' ||
    dependencies.bindings.bandageDefinitionId.trim().length === 0 ||
    typeof dependencies.bindings.painkillerDefinitionId !== 'string' ||
    dependencies.bindings.painkillerDefinitionId.trim().length === 0
  ) {
    throw new CombatError('INVALID_COMBAT_DEPENDENCIES', '战斗依赖结构无效')
  }

  const { bindings } = dependencies
  if (bindings.bandageDefinitionId === bindings.painkillerDefinitionId) {
    bindingMismatch('绷带与止痛药不能绑定同一物品定义')
  }
  let hasEnemy = false
  let enemy: EnemyDefinition | undefined
  try {
    hasEnemy = dependencies.enemyCatalog.has(bindings.enemyDefinitionId)
    if (hasEnemy) enemy = dependencies.enemyCatalog.get(bindings.enemyDefinitionId)
  } catch {
    bindingMismatch('绑定敌人目录不可用')
  }
  if (!hasEnemy || !enemy) {
    bindingMismatch(`未知绑定敌人：${bindings.enemyDefinitionId}`)
  }
  if (enemy.maxHealth !== dependencies.config.combat.infectedOrderly.maxHealth) {
    bindingMismatch('绑定敌人的最大生命与版本配置不一致')
  }
  if (
    enemy.actions.filter(({ kind }) => kind === 'scratch').length !== 1 ||
    enemy.actions.filter(({ kind }) => kind === 'lunge-bite').length !== 1 ||
    !enemy.actionCycle.includes(enemy.initialIntentActionId)
  ) {
    bindingMismatch('绑定敌人的正式行动或初始意图不完整')
  }

  const validateItemBinding = (
    definitionId: string,
    slot: 'weapon' | 'armor',
    resourceKind: 'durability' | 'integrity',
    maximum: number,
  ) => {
    let hasPhysicalDefinition = false
    let equipment: ItemEquipmentProfile | undefined
    let resource: ItemResourceProfile | undefined
    try {
      hasPhysicalDefinition = dependencies.physicalCatalog.has(definitionId)
      if (hasPhysicalDefinition) {
        dependencies.physicalCatalog.get(definitionId)
        equipment = dependencies.equipmentCatalog.get(definitionId)
        resource = dependencies.itemResourceCatalog.get(definitionId)
      }
    } catch {
      bindingMismatch(`绑定物品目录不可用：${definitionId}`)
    }
    if (!hasPhysicalDefinition || !equipment || !resource) {
      bindingMismatch(`未知绑定物品：${definitionId}`)
    }
    if (
      equipment.kind !== 'equippable' ||
      !equipment.eligibleSlots.includes(slot)
    ) {
      bindingMismatch(`绑定物品不具备${slot}槽资格：${definitionId}`)
    }
    if (
      resource.kind !== resourceKind ||
      resource.maximum !== maximum
    ) {
      bindingMismatch(`绑定物品资源与版本配置不一致：${definitionId}`)
    }
  }

  validateItemBinding(
    bindings.metalPipeDefinitionId,
    'weapon',
    'durability',
    dependencies.config.combat.metalPipe.maxDurability,
  )
  validateItemBinding(
    bindings.heavyCoatDefinitionId,
    'armor',
    'integrity',
    dependencies.config.maintenance.itemResourceMaximums.heavyCoatIntegrity,
  )

  const validateMedicalBinding = (definitionId: string) => {
    let hasPhysicalDefinition = false
    try {
      hasPhysicalDefinition = dependencies.physicalCatalog.has(definitionId)
      if (hasPhysicalDefinition) dependencies.physicalCatalog.get(definitionId)
      const quickSlot = dependencies.quickSlotCatalog.get(definitionId)
      const resource = dependencies.itemResourceCatalog.get(definitionId)
      if (
        !hasPhysicalDefinition ||
        quickSlot.kind !== 'eligible' ||
        resource.kind !== 'none'
      ) {
        bindingMismatch(`绑定战斗医疗物品资格或资源无效：${definitionId}`)
      }
    } catch (error) {
      if (error instanceof CombatError) throw error
      bindingMismatch(`未知绑定战斗医疗物品：${definitionId}`)
    }
  }

  validateMedicalBinding(bindings.bandageDefinitionId)
  validateMedicalBinding(bindings.painkillerDefinitionId)
}
