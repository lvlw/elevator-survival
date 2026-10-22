import type { PreplaySnapshot } from './types'

/** Nested values come from safe frozen projection/copies, never caller canonical. */
export function preplaySnapshot(value: PreplaySnapshot): PreplaySnapshot {
  return Object.freeze({ ...value, draft: value.draft ? Object.freeze({ ...value.draft }) : null })
}
