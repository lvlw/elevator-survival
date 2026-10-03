import { createResidenceConfig } from '../../core/residence-config'

// Sole executable G1 parameter source; deliberately not registered as product rules.
const configurationId = 'infected-residence-core-test-v0.1'
export const infectedResidenceConfig = createResidenceConfig({
  configurationId,
  config: {
    limits: { days: 7, energy: 100, hp: 12, satiety: 6 },
    rest: { A: 100, C: 85 },
    health: {
      bleed_night: 2,
      bleed_action: 1,
      exposure_progress: 20,
      infection_stages: [
        { min: 0, base: 0 }, { min: 1, base: 5 }, { min: 30, base: 10 },
        { min: 60, base: 15 }, { min: 90, base: 20 },
      ],
      suppression: 15,
      infection_damage: [
        { min: 0, hp: 0 }, { min: 60, hp: 1 }, { min: 90, hp: 2 }, { min: 120, hp: 3 },
      ],
      night_food: 2,
      starve_threshold: 1,
      starve_damage: 1,
    },
    quota: { suppressant: 1, disinfectant: 1, pipe_signature: 1 },
  },
}, configurationId)
