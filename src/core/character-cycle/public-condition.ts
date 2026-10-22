import { deepFreeze } from '../config'
import { requireResidenceConfig, ResidenceError } from '../residence-config'
import { identitySchema, readResidenceBody } from './validation'
import { parseResidence } from '../residence-config/validation'
import type { CharacterCycleState, ResidenceDependencies } from './types'

const bands = ['below-loss', 'low', 'medium', 'high'] as const
const labels = ['未达病程损耗档', '低病程负担', '中病程负担', '高病程负担'] as const

/** DEC-053: current coarse knowledge only; not the next body-cycle answer. */
export function queryPublicInfectionCondition(state: Pick<CharacterCycleState, 'identity' | 'body'>, deps: ResidenceDependencies) {
  const configuration = requireResidenceConfig(deps.configuration)
  const identity = parseResidence(identitySchema, state.identity)
  if (identity.configurationId !== configuration.configurationId || identity.rulesVersion !== deps.rulesVersion || identity.characterId !== deps.scope.characterId) {
    throw new ResidenceError('CONFIGURATION_MISMATCH', 'Public condition requires the bound rules and configuration')
  }
  const body = readResidenceBody(state.body, deps)
  const rows = configuration.config.health.infection_damage
  if (rows.length !== bands.length) throw new ResidenceError('CONFIGURATION_MISMATCH', 'Unsupported public condition mapping')
  const index = rows.filter(row => body.infectionProgress >= row.min).length - 1
  if (index < 0) throw new ResidenceError('INVALID_INPUT', 'No current condition segment')
  return deepFreeze({ kind: 'known' as const, band: bands[index], label: labels[index],
    mechanism: '仅表示当前病程负担。最低档不代表未感染或未来安全；最高档不等于死亡。隐藏医疗目标及未来周期结果仍未知。' })
}
