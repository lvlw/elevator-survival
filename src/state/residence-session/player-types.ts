import type { playerSupplyFacts } from '../../core/residence-supply/player-query'
import type { playerCombatFacts } from '../../core/residence-combat/player-query'
import type { playerTerminalFacts } from '../../core/residence-terminal/player-query'
export type PlayerHandle = Readonly<{ selection: 'opaque' }>
export type PlayerOpponentPresentation =
  | Readonly<{ kind: 'known'; visualKey: 'infected-orderly'; name: '感染护工' }>
  | Readonly<{ kind: 'known'; visualKey: 'infected-porter'; name: '感染装卸工' }>
  | Readonly<{ kind: 'known'; visualKey: 'infected-technician'; name: '感染技术员' }>
  | Readonly<{ kind: 'unknown'; visualKey: null; name: '当前对手' }>
export type PlayerPlacement = Readonly<{ x: number; y: number; rotated: boolean }>
export type PlayerRequest = Readonly<{ action: PlayerHandle; item?: PlayerHandle; targetItem?: PlayerHandle; wound?: PlayerHandle;
  quantity?: number; placement?: PlayerPlacement; placements?: readonly PlayerPlacement[]; slot?: number;
  target?: 'contusion' | 'wound'; materials?: readonly Readonly<{ item: PlayerHandle; quantity: number }>[];
  allocations?: readonly Readonly<{ item: PlayerHandle; amount: number }>[] }>
type SupplyFacts = ReturnType<typeof playerSupplyFacts>
export type PlayerItem = Omit<SupplyFacts['carried'][number], 'key'> & Readonly<{ selector: PlayerHandle }>
export type PlayerAction = Readonly<{ selector: PlayerHandle; family: string; label: string; method: string | null;
  availability: 'available' | 'parameters-required' | 'unknown'; cost: number | null;
  resourceCost?: NonNullable<ReturnType<typeof playerCombatFacts>>['actions'][number]['resourceCost'];
  quickConsumption?: Readonly<{ slot: number; quantity: 1 }> | null; signatureUsesRemaining?: number | null }>
export type PlayerReadyView = Readonly<{ status: 'ready'; phase: 'first-hub' | 'active-world' | 'living-hub' | 'dead';
  point: 'first-hub' | 'stable-active' | 'battle-decision' | 'living-hub' | 'dead';
  first: Readonly<{ toolChoices: readonly string[]; specialtyChoices: readonly string[]; locked: true }>;
  location: Readonly<{ name: string; place: string }> | null; taskDay: number | null;
  map: Readonly<{ nodes: readonly Readonly<{ name: string; place: string; visited: boolean; current: boolean }>[];
    routes: readonly Readonly<{ from: string; to: string; observation: 'current' | 'last-observed'; passable: boolean | 'unknown' }>[] }>;
  move: Readonly<{ options: readonly PlayerAction[] }>;
  sources: readonly Readonly<{ label: string; completed: boolean; choices: readonly PlayerAction[] }>[];
  ground: readonly PlayerItem[]; carried: readonly PlayerItem[]; backpack: SupplyFacts['backpack'];
  tasks: Readonly<{ publicObjectives: readonly Readonly<{ label: string; state: 'unobserved' | 'observed' | 'completed' }>[];
    sample: 'not-acquired' | 'carried' | 'left-in-world' | 'delivered' | 'unavailable'; choices: readonly PlayerAction[] }>;
  terminal: Omit<ReturnType<typeof playerTerminalFacts>, 'successors'>;
  combat: (Omit<NonNullable<ReturnType<typeof playerCombatFacts>>, 'actions'> & Readonly<{ actions: readonly PlayerAction[]; opponent: PlayerOpponentPresentation }>) | null;
  body: Omit<SupplyFacts['body'], 'wounds'> & Readonly<{ wounds: readonly Readonly<{ selector: PlayerHandle; ordinal: number; kind: string; treatment: string }>[] }>;
  persistence: Readonly<{ feedback: 'not-attempted' | 'saved' | 'save-failed' }>;
  staticHub: Readonly<{ successors: ReturnType<typeof playerTerminalFacts>['successors'] }>;
  actions: readonly PlayerAction[] }>
export type PlayerView = PlayerReadyView | Readonly<{ status: 'unbootstrapped' | 'no-current' | 'read-error' | 'blocked';
  reason: 'not-started' | 'no-save' | 'read-failed' | 'load-blocked' | 'transaction-in-progress' | 'projection-unavailable';
  persistence: Readonly<{ feedback: 'not-attempted' | 'saved' | 'save-failed' }> }>
export type PlayerPreview = Readonly<{ kind: 'available' | 'unavailable' | 'invalid-selection' | 'unknown'; cost: number | null }>
export type PublicCombatAction = 'basic-attack' | 'signature' | 'temporary-attack' | 'defend' | 'retreat' | 'quick-use'
export type PlayerExecution = Readonly<{ kind: 'committed' | 'rejected'; view: PlayerView; preview: PlayerPreview | null;
  committedAction?: Readonly<{ action: PublicCombatAction }> }>
export type PlayerSession = Readonly<{ query(): PlayerView; setup(): Readonly<{ tools: readonly string[]; specialties: readonly string[] }>;
  preview(request: unknown): PlayerPreview; resolve(request: unknown): PlayerPreview;
  execute(request: unknown): PlayerExecution; retrySave(): PlayerView;
  subscribe(listener: (view: PlayerView) => void): () => void }>
export type PlayerLabels = Readonly<{ action(key: string): string; source(key: string): string; place(key: string): string;
  opponent?(definitionId: string): PlayerOpponentPresentation }>
