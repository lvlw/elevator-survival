export const closureKeys = ['HC06', 'HC07', 'HC08B', 'HC09', 'HC19', 'HC25', 'HC26', 'HC28', 'HC29'] as const
export type ClosureKey = typeof closureKeys[number]
export type ClosureKnowledge = Readonly<{
  known: readonly ClosureKey[]; zhou: boolean; platform: boolean; returnPoint: boolean
  workorder: boolean; method: boolean; transfer: boolean; power: boolean; componentCarried: boolean
}>
export type ClosureReceipt = Readonly<{ kind: 'method' | 'install' | 'terminal'; story: ClosureKey }>
