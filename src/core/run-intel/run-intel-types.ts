export interface RunIntelLogSnapshot {
  /**
   * Ordered by first acquisition.  The log is run-owned; a scene only carries
   * the supplied snapshot through its transition.
   */
  readonly intelIds: readonly string[]
}
