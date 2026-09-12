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
    expect(hospitalV01PresentationAssets.itemVisualKey?.(HOSPITAL_ITEM_IDS.metalPipe)).toBe('metal-pipe')
    expect(hospitalV01PresentationAssets.itemVisualKey?.(HOSPITAL_ITEM_IDS.sealedPathogenCase)).toBe('sealed-pathogen-case')
    expect(hospitalV01PresentationAssets.itemVisualKey?.(HOSPITAL_ITEM_IDS.ration)).toBeNull()
    expect(hospitalV01PresentationAssets.enemyVisualKey?.(HOSPITAL_ENEMY_IDS.infectedOrderly, 'healthy')).toBe('infected-orderly-pristine')
    expect(hospitalV01PresentationAssets.enemyVisualKey?.(HOSPITAL_ENEMY_IDS.infectedOrderly, 'incapacitated')).toBe('infected-orderly-disabled')
    expect(hospitalV01PresentationAssets.enemyVisualKey?.('unknown-enemy', 'healthy')).toBeNull()
    expect(hospitalV01PresentationAssets.sceneNodeVisualKey?.(HOSPITAL_NODE_IDS.emergencyHall)).toBe('emergency-hall')
    expect(hospitalV01PresentationAssets.sceneNodeVisualKey?.(HOSPITAL_NODE_IDS.isolationCorridor)).toBe('isolation-corridor')
    expect(hospitalV01PresentationAssets.sceneNodeVisualKey?.(HOSPITAL_NODE_IDS.pharmacy)).toBeNull()
    expect(hospitalV01PresentationAssets.obstacleVisualKey?.(HOSPITAL_OBSTACLE_IDS.isolationFireDoor)).toBe('isolation-fire-door')
    expect(hospitalV01PresentationAssets.taskEventVisualKey?.(HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval)).toBe('pathogen-case-objective')
  })
})
