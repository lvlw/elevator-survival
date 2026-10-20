import type { TaskCommand } from './validation'
export type TaskMethod = NonNullable<TaskCommand['method']>
/** Technical keys stay within the controlled composition, never the player facade. */
export type TaskOpportunity = Readonly<{ key: string; family: 'task' | 'source'; method?: TaskMethod | 'dark' | 'lit'; completed: boolean }>
