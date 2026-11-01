import art0 from '../../assets/presentation/world-ui-v1/bg-c1-v1.png'
import art1 from '../../assets/presentation/world-ui-v1/bg-c3-v1.png'
import art2 from '../../assets/presentation/world-ui-v1/bg-communication-v1.png'
import art3 from '../../assets/presentation/world-ui-v1/bg-h0-v1.png'
import art4 from '../../assets/presentation/world-ui-v1/bg-h2-v1.png'
import art5 from '../../assets/presentation/world-ui-v1/bg-h5-v1.png'
import art6 from '../../assets/presentation/world-ui-v1/bg-h6-v1.png'
import art7 from '../../assets/presentation/world-ui-v1/bg-h8-v1.png'
import art8 from '../../assets/presentation/world-ui-v1/bg-hospital-control-v1.png'
import art9 from '../../assets/presentation/world-ui-v1/bg-hotel-v1.png'
import art10 from '../../assets/presentation/world-ui-v1/bg-l0-v1.png'
import art11 from '../../assets/presentation/world-ui-v1/bg-logistics-office-v1.png'
import art12 from '../../assets/presentation/world-ui-v1/bg-logistics-v1.png'
import art13 from '../../assets/presentation/world-ui-v1/bg-power-v1.png'
import art14 from '../../assets/presentation/world-ui-v1/bg-workshop-v1.png'
import art15 from '../../assets/presentation/v0.1/visual/bg_elevator_hub_v01.png'
import art16 from '../../assets/presentation/v0.1/visual/bg_emergency_hall_v01.png'
import art17 from '../../assets/presentation/v0.1/visual/bg_isolation_corridor_v01.png'
import art18 from '../../assets/presentation/world-ui-v1/closeup-component-v1.png'
import art19 from '../../assets/presentation/world-ui-v1/closeup-install-v1.png'
import art20 from '../../assets/presentation/world-ui-v1/closeup-power-v1.png'
import art21 from '../../assets/presentation/world-ui-v1/closeup-records-v1.png'
import art22 from '../../assets/presentation/v0.1/visual/event_isolation_fire_door_v02.png'
import art23 from '../../assets/presentation/v0.1/visual/icon_bandage_v02.png'
import art24 from '../../assets/presentation/v0.1/visual/icon_flashlight_v01.png'
import art25 from '../../assets/presentation/v0.1/visual/icon_heavy_coat_v01.png'
import art26 from '../../assets/presentation/v0.1/visual/icon_isolation_access_card_v02.png'
import art27 from '../../assets/presentation/v0.1/visual/icon_metal_pipe_v01.png'
import art28 from '../../assets/presentation/v0.1/visual/icon_sealed_pathogen_case_v02.png'
import art29 from '../../assets/presentation/world-ui-v1/item-battery-v1.png'
import art30 from '../../assets/presentation/world-ui-v1/item-cloth-v1.png'
import art31 from '../../assets/presentation/world-ui-v1/item-component-v1.png'
import art32 from '../../assets/presentation/world-ui-v1/item-crowbar-v1.png'
import art33 from '../../assets/presentation/world-ui-v1/item-disinfectant-v1.png'
import art34 from '../../assets/presentation/world-ui-v1/item-electronic-v1.png'
import art35 from '../../assets/presentation/world-ui-v1/item-firstaid-v1.png'
import art36 from '../../assets/presentation/world-ui-v1/item-metal-v1.png'
import art37 from '../../assets/presentation/world-ui-v1/item-module-v1.png'
import art38 from '../../assets/presentation/world-ui-v1/item-painkiller-v1.png'
import art39 from '../../assets/presentation/world-ui-v1/item-ration-v1.png'
import art40 from '../../assets/presentation/world-ui-v1/item-suppressant-v1.png'
import art41 from '../../assets/presentation/world-ui-v1/item-toolbox-v1.png'
import art42 from '../../assets/presentation/world-ui-v1/npc-lin-v1.png'
import art43 from '../../assets/presentation/world-ui-v1/npc-zhou-v1.png'
import art44 from '../../assets/presentation/v0.1/visual/objective_pathogen_case_v02.png'
import art45 from '../../assets/presentation/world-ui-v1/panel-nine-slice-v1.png'
import placeholder from '../assets/item-placeholder.svg'
import { publicItemName } from './labels'

export const itemPlaceholder = placeholder
const items: Readonly<Record<string, string>> = {
  '绷带': art23,
  '手电筒': art24,
  '厚实外套': art25,
  '隔离区门禁卡': art26,
  '金属管': art27,
  '密封病原样本箱': art28,
  '通用电池': art29,
  '织物材料': art30,
  '转运组件': art31,
  '撬棍': art32,
  '消毒剂': art33,
  '电子元件': art34,
  '急救包': art35,
  '金属零件': art36,
  '通信模块': art37,
  '止痛药': art38,
  '压缩口粮': art39,
  '感染抑制剂': art40,
  '工具箱': art41,
}
export const itemImage = (name: string): string => { const display = publicItemName(name); return Object.hasOwn(items, display) ? items[display]! : placeholder }
export const hubImage = art15
export const panelFrame = art45
export type SceneArt = Readonly<{ key: string; src: string; focal: readonly [number, number] }>
const rooms: Readonly<Record<string, SceneArt>> = {
  '通信/档案室': { key: '通信/档案室', src: art0, focal: [0.5, 0.42] },
  '通信/机房': { key: '通信/机房', src: art1, focal: [0.5, 0.42] },
  '通信/入口': { key: '通信/入口', src: art2, focal: [0.5, 0.42] },
  '通信/播控侧门': { key: '通信/播控侧门', src: art2, focal: [0.85, 0.45] },
  '医院/电梯前室': { key: '医院/电梯前室', src: art3, focal: [0.5, 0.42] },
  '医院/药房': { key: '医院/药房', src: art4, focal: [0.5, 0.42] },
  '医院/冷藏室': { key: '医院/冷藏室', src: art5, focal: [0.5, 0.42] },
  '医院/值班休息室': { key: '医院/值班休息室', src: art6, focal: [0.5, 0.42] },
  '医院/转运平台': { key: '医院/转运平台', src: art7, focal: [0.5, 0.42] },
  '医院/保安室': { key: '医院/保安室', src: art8, focal: [0.23, 0.42] },
  '医院/后勤控制间': { key: '医院/后勤控制间', src: art8, focal: [0.8, 0.42] },
  '酒店/酒店入口': { key: '酒店/酒店入口', src: art9, focal: [0.5, 0.42] },
  '酒店/林岑安置点': { key: '酒店/林岑安置点', src: art9, focal: [0.88, 0.45] },
  '物流/岗亭': { key: '物流/岗亭', src: art10, focal: [0.5, 0.5] },
  '物流/登记室': { key: '物流/登记室', src: art11, focal: [0.16, 0.45] },
  '物流/周衡休息室': { key: '物流/周衡休息室', src: art11, focal: [0.88, 0.45] },
  '物流/装卸场': { key: '物流/装卸场', src: art12, focal: [0.5, 0.42] },
  '供电所/配线廊': { key: '供电所/配线廊', src: art13, focal: [0.5, 0.42] },
  '供电所/转运支路柜': { key: '供电所/转运支路柜', src: art13, focal: [0.66, 0.45] },
  '通信/检修走廊': { key: '通信/检修走廊', src: art13, focal: [0.5, 0.42] },
  '物流/维修库': { key: '物流/维修库', src: art14, focal: [0.5, 0.42] },
  '通信/检修间': { key: '通信/检修间', src: art14, focal: [0.77, 0.45] },
  '医院/大厅': { key: '医院/大厅', src: art16, focal: [0.5, 0.42] },
  '医院/隔离走廊': { key: '医院/隔离走廊', src: art17, focal: [0.5, 0.42] },
}
export function sceneArt(location: Readonly<{place: string; name: string}> | null, point: string): SceneArt | null {
  if (point === 'first-hub' || point === 'living-hub') return { key: 'hub', src: hubImage, focal: [0.5, 0.42] }
  const key = location ? location.place + '/' + location.name : ''
  return Object.hasOwn(rooms, key) ? rooms[key]! : null
}
/** Only public identities may select art. Unknown values remain neutral. */
export const npcImage = (name: string): string | null => name === '林岑' ? art42 : name === '周衡' ? art43 : null
export const closeupImages = { 'closeup-component': art18, 'closeup-install': art19, 'closeup-power': art20, 'closeup-records': art21, 'event-isolation-fire-door': art22, 'objective-pathogen-case': art44 } as const
