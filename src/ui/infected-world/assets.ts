import metalPipe from '../../assets/presentation/v0.1/visual/icon_metal_pipe_v01.png'
import heavyCoat from '../../assets/presentation/v0.1/visual/icon_heavy_coat_v01.png'
import flashlight from '../../assets/presentation/v0.1/visual/icon_flashlight_v01.png'
import bandage from '../../assets/presentation/v0.1/visual/icon_bandage_v02.png'
import card from '../../assets/presentation/v0.1/visual/icon_isolation_access_card_v02.png'
import sample from '../../assets/presentation/v0.1/visual/icon_sealed_pathogen_case_v02.png'
import hub from '../../assets/presentation/v0.1/visual/bg_elevator_hub_v01.png'
import hall from '../../assets/presentation/v0.1/visual/bg_emergency_hall_v01.png'
import corridor from '../../assets/presentation/v0.1/visual/bg_isolation_corridor_v01.png'
import placeholder from '../assets/item-placeholder.svg'

/** Definition-level presentation only; absence of an asset is not an inference about state. */
const items: Readonly<Record<string, string>> = {
  金属管: metalPipe, 厚实外套: heavyCoat, 手电筒: flashlight, 绷带: bandage,
  隔离区门禁卡: card, 密封病原样本箱: sample,
}
export const itemPlaceholder = placeholder
export const itemImage = (name: string): string => items[name] ?? placeholder
export const hubImage = hub
export function roomImage(name: string | undefined): string | null {
  return name === '大厅' ? hall : name === '隔离走廊' ? corridor : null
}
