import { describe, expect, it } from 'vitest'
import {
  presentationVisualAssetUrl,
  presentationVisualAssetUrls,
} from './presentation-assets'
import { hospitalV01PresentationAssets } from '../hospital-v0.1/hospital-presentation-assets'
import { HOSPITAL_ENEMY_IDS, HOSPITAL_ITEM_IDS, HOSPITAL_NODE_IDS, HOSPITAL_OBSTACLE_IDS, HOSPITAL_TASK_EVENT_IDS } from '../../content'

describe('presentation visual owner pack mapping', () => {
  it('contains the 16 approved visual files and stable URLs', () => {
    expect(Object.keys(presentationVisualAssetUrls)).toHaveLength(16)
    expect(presentationVisualAssetUrl('hub-elevator')).toContain('bg_elevator_hub_v01')
    expect(presentationVisualAssetUrl('pathogen-case-objective')).toContain('objective_pathogen_case_v02')
  })

  it('maps formal hospital identities through an allow-list', () => {
    for (const [definitionId, visualKey] of [
      [HOSPITAL_ITEM_IDS.metalPipe, 'metal-pipe'],
      [HOSPITAL_ITEM_IDS.heavyCoat, 'heavy-coat'],
      [HOSPITAL_ITEM_IDS.flashlight, 'flashlight'],
      [HOSPITAL_ITEM_IDS.bandage, 'bandage'],
      [HOSPITAL_ITEM_IDS.isolationWardAccessCard, 'isolation-access-card'],
      [HOSPITAL_ITEM_IDS.sealedPathogenCase, 'sealed-pathogen-case'],
    ] as const) expect(hospitalV01PresentationAssets.itemVisualKey?.(definitionId)).toBe(visualKey)
    expect(hospitalV01PresentationAssets.itemVisualKey?.(HOSPITAL_ITEM_IDS.ration)).toBeNull()
    for (const [stage, visualKey] of [
      ['healthy', 'infected-orderly-pristine'],
      ['wounded', 'infected-orderly-wounded'],
      ['severely-wounded', 'infected-orderly-heavy-wounded'],
      ['critical', 'infected-orderly-critical'],
      ['incapacitated', 'infected-orderly-disabled'],
    ] as const) expect(hospitalV01PresentationAssets.enemyVisualKey?.(HOSPITAL_ENEMY_IDS.infectedOrderly, stage)).toBe(visualKey)
    expect(hospitalV01PresentationAssets.enemyVisualKey?.('unknown-enemy', 'healthy')).toBeNull()
    expect(hospitalV01PresentationAssets.sceneNodeVisualKey?.(HOSPITAL_NODE_IDS.emergencyHall)).toBe('emergency-hall')
    expect(hospitalV01PresentationAssets.sceneNodeVisualKey?.(HOSPITAL_NODE_IDS.isolationCorridor)).toBeNull()
    expect(hospitalV01PresentationAssets.sceneNodeVisualKey?.(HOSPITAL_NODE_IDS.pharmacy)).toBeNull()
    expect(hospitalV01PresentationAssets.battleBackgroundVisualKey?.(HOSPITAL_NODE_IDS.isolationCorridor, HOSPITAL_ENEMY_IDS.infectedOrderly)).toBe('isolation-corridor')
    expect(hospitalV01PresentationAssets.battleBackgroundVisualKey?.(HOSPITAL_NODE_IDS.emergencyHall, HOSPITAL_ENEMY_IDS.infectedOrderly)).toBeNull()
    expect(hospitalV01PresentationAssets.battleBackgroundVisualKey?.(HOSPITAL_NODE_IDS.isolationCorridor, 'unknown-enemy')).toBeNull()
    expect(hospitalV01PresentationAssets.obstacleVisualKey?.(HOSPITAL_OBSTACLE_IDS.isolationFireDoor)).toBe('isolation-fire-door')
    expect(hospitalV01PresentationAssets.obstacleVisualKey?.('other-obstacle')).toBeNull()
    expect(hospitalV01PresentationAssets.taskEventVisualKey?.(HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval)).toBe('pathogen-case-objective')
    expect(hospitalV01PresentationAssets.taskEventVisualKey?.('other-task-event')).toBeNull()
  })

})
