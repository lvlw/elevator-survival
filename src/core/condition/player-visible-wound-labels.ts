import { deepFreeze } from '../config'
import type { OpenWoundKind, OpenWoundSnapshot, OpenWoundTreatment } from './condition-types'

export interface PlayerVisibleOpenWoundLabel {
  readonly kind: OpenWoundKind
  readonly treatment: OpenWoundTreatment
  readonly ordinal: number
}

/**
 * Assigns display ordinals across every wound of the same kind. The returned
 * labels deliberately preserve canonical wound order and contain no identity.
 */
export function getPlayerVisibleOpenWoundLabels(
  wounds: readonly OpenWoundSnapshot[],
): readonly PlayerVisibleOpenWoundLabel[] {
  const kindCounts = new Map<OpenWoundKind, number>()
  return deepFreeze(wounds.map(({ kind, treatment }) => {
    const ordinal = (kindCounts.get(kind) ?? 0) + 1
    kindCounts.set(kind, ordinal)
    return { kind, treatment, ordinal }
  }))
}
