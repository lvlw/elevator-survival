import type { PlayerAction, PlayerReadyView } from '../../../state/residence-session/player-types'
import { NpcSlotPicture, SlotPicture } from '../asset-slots'
import { closeupImages } from '../assets'

/** Closed public interaction bindings. These images grant no facts, methods or lifecycle. */
export function TaskArtwork({ view, action }: { view: PlayerReadyView; action: PlayerAction }) {
  const place = view.location
  const npc = place?.place === '酒店' && place.name === '林岑安置点' && action.label === '酒店交换' ? '林岑' :
    place?.place === '物流' && place.name === '周衡休息室' && action.label === '取得作业方法' ? '周衡' : null
  const bindings: Readonly<Record<string, keyof typeof closeupImages>> = {
    隔离防火门: 'event-isolation-fire-door', 调查供电: 'closeup-power', 恢复供电: 'closeup-power',
    核对转运记录: 'closeup-records', 比对通信记录: 'closeup-records', 修复转运组件: 'closeup-component',
    取得转运组件: 'closeup-component', 提取样本: 'objective-pathogen-case', 安装转运装置: 'closeup-install',
  }
  const key = Object.hasOwn(bindings, action.label) ? bindings[action.label] : null
  const src = key ? closeupImages[key] : null
  return npc || src ? <figure className={`iw-task-art${npc ? ' iw-task-art--npc' : ''}`}>
    {npc ? <NpcSlotPicture name={npc} /> : <SlotPicture art={src ? { src } : null} alt={action.label + ' · 当前操作近景'} />}
    <figcaption>{npc ?? action.label}</figcaption>
  </figure> : null
}
