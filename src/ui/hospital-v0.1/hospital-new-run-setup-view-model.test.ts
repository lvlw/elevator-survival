import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS,
} from '../../content'
import {
  createHospitalNewRunSetupFromUiSelection,
  createHospitalNewRunSetupViewModel,
} from './hospital-new-run-setup-view-model'

describe('player-safe hospital New Run Setup model', () => {
  it('projects the formal fixed loadout, exactly three utilities, and specialization deferral', () => {
    const model = createHospitalNewRunSetupViewModel()
    expect(model).toEqual({
      fixedWeaponName: '金属管',
      fixedArmorName: '厚实外套',
      quickSlots: [
        { slotNumber: 1, itemName: '绷带', quantity: 1 },
        { slotNumber: 2, itemName: null, quantity: 0 },
      ],
      backpackSummary: '无额外物品',
      utilityOptions: [
        { key: 'crowbar', name: '撬棍' },
        { key: 'flashlight', name: '手电筒' },
        { key: 'toolkit', name: '工具箱' },
      ],
      specializationNotice:
        '专长系统在当前医院一日验证版本中暂缓，将在完整七日感染世界里程碑前补回。',
    })
    const serialized = JSON.stringify(model)
    for (const definitionId of [
      HOSPITAL_ITEM_IDS.metalPipe,
      HOSPITAL_ITEM_IDS.heavyCoat,
      HOSPITAL_ITEM_IDS.bandage,
      ...HOSPITAL_NEW_RUN_UTILITY_DEFINITION_IDS,
    ]) expect(serialized).not.toContain(definitionId)
    expect(Object.isFrozen(model)).toBe(true)
    expect(Object.isFrozen(model.utilityOptions)).toBe(true)
  })

  it('maps player-safe option keys through the formal Setup constructor', () => {
    expect(createHospitalNewRunSetupFromUiSelection('crowbar'))
      .toEqual({ utilityDefinitionId: HOSPITAL_ITEM_IDS.crowbar })
    expect(createHospitalNewRunSetupFromUiSelection('flashlight'))
      .toEqual({ utilityDefinitionId: HOSPITAL_ITEM_IDS.flashlight })
    expect(createHospitalNewRunSetupFromUiSelection('toolkit'))
      .toEqual({ utilityDefinitionId: HOSPITAL_ITEM_IDS.toolkit })
  })
})
