export type RandomErrorCode =
  | 'EMPTY_SEED'
  | 'EMPTY_STREAM'
  | 'EMPTY_STREAM_SEGMENT'
  | 'UNSUPPORTED_ALGORITHM'
  | 'INVALID_DRAW_INDEX'
  | 'INVALID_INTEGER_RANGE'
  | 'UNSUPPORTED_INTEGER_SPAN'
  | 'INVALID_CHANCE'

export class RandomInputError extends Error {
  readonly code: RandomErrorCode

  constructor(code: RandomErrorCode, message: string) {
    super(message)
    this.name = 'RandomInputError'
    this.code = code
  }
}
