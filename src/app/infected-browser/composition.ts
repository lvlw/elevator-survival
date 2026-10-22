import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'
import { createCombatResidencePolicy, requireCombatResidencePolicy } from '../../state/residence-save/combat-policy'
import { RANDOM_ALGORITHM_VERSION } from '../../core/random'
/** Explicit composition, not registered in the existing app or player entry. */
export function browserComposition(characterId: string) {
  const dependencies = createInfectedCombatDependencies(characterId)
  const policy = createCombatResidencePolicy({ dependencies, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION })
  return { dependencies, policy, versions: requireCombatResidencePolicy(policy).versions, labels: infectedWorldPlayerLabels }
}
