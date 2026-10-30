/** Trusted content composition: fixed public classes, never instance identities or location guesses. */
const opponents = Object.freeze({
  'infected-world-orderly': Object.freeze({ kind: 'known', visualKey: 'infected-orderly', name: '感染护工' } as const),
  'infected-world-porter': Object.freeze({ kind: 'known', visualKey: 'infected-porter', name: '感染装卸工' } as const),
  'infected-world-technician': Object.freeze({ kind: 'known', visualKey: 'infected-technician', name: '感染技术员' } as const),
})
const unknownOpponent = Object.freeze({ kind: 'unknown', visualKey: null, name: '当前对手' } as const)

export function infectedWorldOpponentPresentation(definitionId: string) {
  return Object.hasOwn(opponents, definitionId) ? opponents[definitionId as keyof typeof opponents] : unknownOpponent
}
