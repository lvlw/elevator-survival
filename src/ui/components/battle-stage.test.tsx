import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type {
  PlayerVisibleCombatViewModel,
  PlayerVisibleConditionViewModel,
} from '../presentation'
import { BattleStage } from './battle-stage'

const condition: PlayerVisibleConditionViewModel = {
  currentHealth: 8,
  maximumHealth: 12,
  bleeding: false,
  untreatedOpenWounds: 0,
  treatedOpenWounds: 0,
  minorContusions: 0,
  painkillerActive: false,
  pendingInfectionExposures: 0,
  wounds: [],
}

function combat(enemyHealthStage: PlayerVisibleCombatViewModel['enemyHealthStage']): PlayerVisibleCombatViewModel {
  return {
    playerHealth: 8,
    playerMaximumHealth: 12,
    enemyName: '感染护工',
    enemyHealthStage,
    currentIntent: '抓挠',
    currentIntentCategory: 'basic-attack',
    currentIntentRelativeSpeed: 'normal',
    currentIntentDirectDamageSeverity: 'medium',
    currentIntentMayCauseInjury: true,
    currentIntentMayCauseInfectionExposure: false,
    currentIntentMayCauseControl: false,
    sceneRemainingTime: 170,
    sceneTimeIfCombatEndedNow: 10,
    minimumSceneTime: 10,
    enemyTimingBeforeNextDecision: 'depends-on-action',
    equipment: { weapon: null, armor: null, utility: null },
    quickSlots: [null, null],
  }
}

describe('BattleStage', () => {
  it.each([
    ['healthy', '完好'],
    ['wounded', '受伤'],
    ['severely-wounded', '重伤'],
    ['critical', '濒危'],
    ['incapacitated', '失去能力'],
  ] as const)('renders the formal %s enemy phase as categorical text', (phase, label) => {
    const html = renderToStaticMarkup(
      <BattleStage combat={combat(phase)} condition={condition} ghost={null} latestResult={null} />,
    )
    expect(html).toContain(`相对生命：<strong>${label}</strong>`)
    expect(html.match(/data-active="true"/g)).toHaveLength(1)
    expect(html).not.toMatch(/enemy.*(?:current|max).*health/i)
  })

  it('renders an accessible relative order without any raw Combat timing fields', () => {
    const html = renderToStaticMarkup(
      <BattleStage
        combat={combat('healthy')}
        condition={condition}
        ghost={{
          title: '蓄力击打',
          context: 'next-player-decision',
          relationship: 'player-first',
        }}
        latestResult={null}
      />,
    )
    expect(html).toContain('当前：玩家可行动')
    expect(html).toContain('感染护工 · 抓挠')
    expect(html).toContain('玩家将在敌人行动前再次获得决策机会')
    for (const hidden of [
      'currentCtb', 'playerNextActionCtb', 'enemyNextActionCtb', 'actionCtb',
      'elapsedCtb', 'completesAtCtb', 'CTB', '时间刻度',
    ]) expect(html).not.toContain(hidden)
  })

  it.each([
    ['enemy-first', '敌人将在脱离完成前行动'],
    ['player-first', '你将在敌人行动前完成脱离'],
  ] as const)('renders the escape-completion %s relationship without decision-cycle wording', (relationship, label) => {
    const html = renderToStaticMarkup(
      <BattleStage
        combat={combat('healthy')}
        condition={condition}
        ghost={{ title: '逃跑', context: 'escape-completion', relationship }}
        latestResult={null}
      />,
    )
    expect(html).toContain(label)
    expect(html).not.toContain('再次获得决策机会')
    expect(html).not.toContain('currentCtb')
    expect(html).not.toContain('completesAtCtb')
  })
})
