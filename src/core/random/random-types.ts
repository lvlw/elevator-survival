export interface RandomCursor {
  readonly algorithmVersion: string
  readonly seed: string
  readonly streamId: string
  readonly drawIndex: number
}

export interface RandomDraw<T> {
  readonly value: T
  readonly nextCursor: RandomCursor
}
