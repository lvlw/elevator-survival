import { describe, expect, it } from 'vitest'
import {
  createWorldThreatCatalog,
  createWorldThreatDefinition,
  createWorldThreatSnapshot,
  getWorldThreatStage,
} from '.'

const definition = {
  definitionId: 'threat-a',
  progressPerPendingExposure: 20,
  stages: [
    { id: 'stage-0', minProgress: 0, dailyBaseIncrease: 0 },
    { id: 'stage-1', minProgress: 30, dailyBaseIncrease: 5 },
  ],
  terminal: { stageId: 'terminal', minProgress: 60 },
  suppressant: { dailyReduction: 15, maxUsesPerDay: 1, hubSceneTime: 0 },
}

describe('world threat', () => {
  it('strictly restores progress and derives ordinary and terminal stages', () => {
    const catalog = createWorldThreatCatalog([definition])
    expect(getWorldThreatStage(createWorldThreatSnapshot({ definitionId: 'threat-a', progress: 59 }, catalog), catalog))
      .toEqual({ id: 'stage-1', terminal: false, dailyBaseIncrease: 5 })
    expect(getWorldThreatStage(createWorldThreatSnapshot({ definitionId: 'threat-a', progress: 60 }, catalog), catalog))
      .toEqual({ id: 'terminal', terminal: true, dailyBaseIncrease: 0 })
  })

  it('rejects invalid definitions, unknown threats, negative progress, and unknown fields', () => {
    expect(() => createWorldThreatDefinition({ ...definition, stages: [definition.stages[1], definition.stages[0]] })).toThrow()
    expect(() => createWorldThreatDefinition({ ...definition, terminal: { ...definition.terminal, extra: true } })).toThrow()
    const catalog = createWorldThreatCatalog([definition])
    expect(() => createWorldThreatSnapshot({ definitionId: 'missing', progress: 0 }, catalog)).toThrow()
    expect(() => createWorldThreatSnapshot({ definitionId: 'threat-a', progress: -1 }, catalog)).toThrow()
    expect(() => createWorldThreatSnapshot({ definitionId: 'threat-a', progress: 0, extra: true }, catalog)).toThrow()
  })
})
