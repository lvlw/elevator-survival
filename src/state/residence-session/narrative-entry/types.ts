export const storyKeys = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'H01', 'H02', 'H03', 'H04', 'H05', 'H06', 'H07'] as const
export type StoryKey = typeof storyKeys[number]
export type NarrativeKnowledge = Readonly<{
  known: readonly StoryKey[]; workorder: boolean; powerSurvey: boolean; doorParts: boolean
  brief: Readonly<{ days: number; reward: number; penalty: number }>
}>
export type ExplorationReceipt = Readonly<{
  kind: 'departure' | 'move' | 'search' | 'pickup' | 'door' | 'workorder'
  method: string | null; story: StoryKey | null; revealed: number | null
  resource: Readonly<{ kind: 'durability' | 'charge' | 'integrity'; spent: number }> | null
}>
