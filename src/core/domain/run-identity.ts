import { z } from 'zod'
import { deepFreeze, type DeepReadonly } from '../config'

const runIdentityInputSchema = z.object({
  runId: z.string().trim().min(1),
  seed: z.string().trim().min(1),
  rulesVersion: z.string().trim().min(1),
})

export type RunIdentityInput = z.input<typeof runIdentityInputSchema>
export type RunIdentity = DeepReadonly<z.output<typeof runIdentityInputSchema>>
export type RulesVersionLookup = (rulesVersion: string) => boolean

export class UnregisteredRulesVersionError extends Error {
  constructor(rulesVersion: string) {
    super(`未注册的规则版本：${rulesVersion}`)
    this.name = 'UnregisteredRulesVersionError'
  }
}

export function createRunIdentity(
  input: RunIdentityInput,
  isRulesVersionRegistered: RulesVersionLookup,
): RunIdentity {
  const identity = runIdentityInputSchema.parse(input)

  if (!isRulesVersionRegistered(identity.rulesVersion)) {
    throw new UnregisteredRulesVersionError(identity.rulesVersion)
  }

  return deepFreeze(identity)
}
