import { deepFreeze } from '../config'
import { ItemStateError } from './item-state-errors'
import type {
  ItemResourceCatalog,
  ItemResourceState,
  ItemState,
  ResourceActionPreview,
  ResourceActionResult,
  ResourceRestoreResult,
} from './item-state-types'

function assertIdentity(instanceId: string, definitionId: string): void {
  if (instanceId.trim().length === 0) {
    throw new ItemStateError('INVALID_INSTANCE_ID', '物品实例ID不能为空')
  }
  if (definitionId.trim().length === 0) {
    throw new ItemStateError('INVALID_DEFINITION_ID', '物品定义ID不能为空')
  }
}

function assertPositiveSafeInteger(
  value: number,
  code: 'INVALID_RESOURCE_COST' | 'INVALID_RESTORE_AMOUNT',
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ItemStateError(code, '资源变化量必须是正安全整数')
  }
}

export function createFullItemState(
  identity: Readonly<{ instanceId: string; definitionId: string }>,
  catalog: ItemResourceCatalog,
): Readonly<ItemState> {
  const profile = catalog.get(identity.definitionId)
  return createItemState(
    {
      ...identity,
      resource:
        profile.kind === 'none'
          ? { kind: 'none' }
          : { kind: profile.kind, current: profile.maximum },
    },
    catalog,
  )
}

export function createItemState(
  input: Readonly<{
    instanceId: string
    definitionId: string
    resource: ItemResourceState
  }>,
  catalog: ItemResourceCatalog,
): Readonly<ItemState> {
  assertIdentity(input.instanceId, input.definitionId)
  const profile = catalog.get(input.definitionId)
  if (input.resource.kind !== profile.kind) {
    throw new ItemStateError(
      'RESOURCE_KIND_MISMATCH',
      `资源状态类型与档案不一致：${input.definitionId}`,
    )
  }
  if (profile.kind !== 'none') {
    const current = (input.resource as Exclude<ItemResourceState, { kind: 'none' }>).current
    if (
      !Number.isSafeInteger(current) ||
      current < 0 ||
      current > profile.maximum
    ) {
      throw new ItemStateError(
        'INVALID_CURRENT_RESOURCE',
        `当前资源必须位于0到上限之间：${input.definitionId}`,
      )
    }
  }
  return deepFreeze({
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    resource: { ...input.resource },
  })
}

/**
 * Stack compatibility deliberately ignores instance identity: two distinct
 * instances can only share a stack when every state fact other than identity
 * is equal.
 */
export function areItemStatesStackCompatible(
  left: Readonly<ItemState>,
  right: Readonly<ItemState>,
): boolean {
  return left.definitionId === right.definitionId &&
    JSON.stringify(left.resource) === JSON.stringify(right.resource)
}

export function previewCommittedResourceAction(
  state: Readonly<ItemState>,
  requestedCost: number,
): ResourceActionPreview {
  assertPositiveSafeInteger(requestedCost, 'INVALID_RESOURCE_COST')
  if (state.resource.kind === 'none') {
    return deepFreeze({
      allowed: false,
      kind: 'none',
      currentBefore: null,
      requestedCost,
      reason: 'NO_RESOURCE' as const,
    })
  }
  const { kind, current } = state.resource
  if (current === 0 || (kind === 'charge' && current < requestedCost)) {
    return deepFreeze({
      allowed: false,
      kind,
      currentBefore: current,
      requestedCost,
      reason: 'INSUFFICIENT_RESOURCE' as const,
    })
  }
  const consumed =
    kind === 'charge' ? requestedCost : Math.min(current, requestedCost)
  return deepFreeze({
    allowed: true,
    kind,
    currentBefore: current,
    requestedCost,
    consumed,
    currentAfter: current - consumed,
    depleted: current - consumed === 0,
  })
}

export function consumeCommittedResource(
  state: Readonly<ItemState>,
  requestedCost: number,
): Readonly<ResourceActionResult> {
  const preview = previewCommittedResourceAction(state, requestedCost)
  if (!preview.allowed) {
    throw new ItemStateError(
      preview.reason === 'NO_RESOURCE'
        ? 'RESOURCE_ACTION_UNAVAILABLE'
        : 'INSUFFICIENT_RESOURCE',
      `无法支付物品资源：${state.definitionId}`,
    )
  }
  return deepFreeze({
    state: {
      ...state,
      resource: { kind: preview.kind, current: preview.currentAfter },
    },
    requestedCost,
    consumed: preview.consumed,
    currentBefore: preview.currentBefore,
    currentAfter: preview.currentAfter,
    depleted: preview.depleted,
  })
}

export function restoreItemResource(
  state: Readonly<ItemState>,
  requestedAmount: number,
  catalog: ItemResourceCatalog,
): Readonly<ResourceRestoreResult> {
  assertPositiveSafeInteger(requestedAmount, 'INVALID_RESTORE_AMOUNT')
  const profile = catalog.get(state.definitionId)
  if (profile.kind === 'none' || state.resource.kind === 'none') {
    throw new ItemStateError(
      'RESOURCE_RESTORE_UNAVAILABLE',
      `物品没有可恢复资源：${state.definitionId}`,
    )
  }
  if (profile.kind !== state.resource.kind) {
    throw new ItemStateError(
      'RESOURCE_KIND_MISMATCH',
      `资源状态类型与档案不一致：${state.definitionId}`,
    )
  }
  const restored = Math.min(requestedAmount, profile.maximum - state.resource.current)
  return deepFreeze({
    state: {
      ...state,
      resource: {
        kind: state.resource.kind,
        current: state.resource.current + restored,
      },
    },
    requestedAmount,
    restored,
    unused: requestedAmount - restored,
    currentBefore: state.resource.current,
    currentAfter: state.resource.current + restored,
    atMaximum: state.resource.current + restored === profile.maximum,
  })
}
