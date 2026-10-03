import type { DeepReadonly } from '../config'

export interface ResidenceConfigInput {
  configurationId: string
  config: {
    limits: { days: number; energy: number; hp: number; satiety: number }
    rest: { A: number; C: number }
    health: {
      bleed_night: number
      bleed_action: number
      exposure_progress: number
      infection_stages: { min: number; base: number }[]
      suppression: number
      infection_damage: { min: number; hp: number }[]
      night_food: number
      starve_threshold: number
      starve_damage: number
    }
    quota: { suppressant: number; disinfectant: number; pipe_signature: number }
  }
}

export type ResidenceConfig = DeepReadonly<ResidenceConfigInput>
export type ResidenceErrorCode =
  | 'INVALID_INPUT' | 'CONFIGURATION_MISMATCH' | 'BINDING_MISMATCH'
  | 'STALE_REVISION' | 'INVALID_CONTEXT' | 'ACTION_NOT_AVAILABLE'
  | 'NO_AVAILABLE_COMMISSION' | 'CHARACTER_DEAD' | 'SAFE_INTEGER_OVERFLOW'
  | 'PLAN_MISMATCH'

export class ResidenceError extends Error {
  constructor(public readonly code: ResidenceErrorCode, message: string) {
    super(message)
    this.name = 'ResidenceError'
  }
}
