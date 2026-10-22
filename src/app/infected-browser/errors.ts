export class BrowserOwnerError extends Error {
  constructor(public readonly code: 'INVALID_RECORD' | 'LOST_LEASE' | 'UNAVAILABLE' | 'INVALID_SETUP') {
    super(code); this.name = 'BrowserOwnerError'
  }
}
