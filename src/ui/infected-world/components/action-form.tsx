import { useEffect, useRef, useState } from 'react'
import type { BrowserControls } from '../../../app/infected-browser/types'
import type { PlayerActionInputs } from '../../../state/residence-session/player-preplay-types'
import type { PlayerAction, PlayerItem, PlayerPlacement, PlayerReadyView, PlayerRequest } from '../../../state/residence-session/player-types'
import { SafeFacts } from './confirmation-layer'
import { PlacementPicker } from './placement-picker'
import { actionName, publicItemName } from '../labels'

export function ActionForm({ action, inputs, view, controls, initialItem, onExecute, onCancel }: {
  action: PlayerAction; inputs: PlayerActionInputs; view: PlayerReadyView; controls: BrowserControls; initialItem?: PlayerItem;
  onExecute: (request: PlayerRequest) => void; onCancel: () => void
}) {
  const [item, setItem] = useState(() => initialItem ? inputs.items.findIndex(i => i.selector === initialItem.selector).toString() : '')
  const [targetItem, setTargetItem] = useState(''), [quantity, setQuantity] = useState(''), [slot, setSlot] = useState('')
  const [wound, setWound] = useState(''), [target, setTarget] = useState('')
  const [placements, setPlacements] = useState<readonly (PlayerPlacement | null)[]>([])
  const [materials, setMaterials] = useState<Readonly<Record<string, string>>>({})
  const [allocations, setAllocations] = useState<Readonly<Record<number, string>>>({})
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => { const prior = document.activeElement; cancel.current?.focus(); return () => { if (prior instanceof HTMLElement && prior.isConnected) prior.focus() } }, [])
  const source = inputs.items[Number(item)]
  const selectedSource = item !== '' && !!source
  const has = (field: typeof inputs.fields[number]) => inputs.fields.includes(field)
  const placementCount = has('placements') ? inputs.outputs.length : has('placement') ? 1 : 0
  const selectedMaterials = inputs.materials.flatMap((m, r) => m.choices.flatMap((i, c) => {
    const q = materials[`${r}:${c}`]
    return q ? [{ item: i.selector, quantity: Number(q) }] : []
  }))
  const selectedAllocations = inputs.allocation?.targets.flatMap((i, n) => allocations[n] ? [{ item: i.selector, amount: Number(allocations[n]) }] : []) ?? []
  const clinical = selectedSource ? source.clinical : undefined
  const woundOptions = inputs.wounds.filter(w => clinical?.wound !== 'untreated' || w.treatment === 'untreated')
  const requiresWound = clinical && !clinical.allowNoTarget && clinical.wound !== 'none' && !clinical.targets.length
  const complete = (!has('item') || selectedSource) && (!has('targetItem') || targetItem !== '') &&
    (!has('quantity') || quantity !== '') && (!has('slot') || slot !== '') &&
    (placements.filter(Boolean).length === placementCount) &&
    (!requiresWound || wound !== '') && (!clinical || clinical.allowNoTarget || !clinical.targets.length || target !== '') &&
    (target !== 'wound' || wound !== '') &&
    (!inputs.materials.length || inputs.materials.every((m, r) => m.choices.some((_, c) => !!materials[`${r}:${c}`]))) &&
    (!has('allocations') || selectedAllocations.length > 0)
  const request: PlayerRequest = { action: action.selector,
    ...(has('item') && selectedSource ? { item: source.selector } : {}),
    ...(has('targetItem') && targetItem !== '' ? { targetItem: inputs.targetItems[Number(targetItem)]!.selector } : {}),
    ...(has('quantity') && quantity !== '' ? { quantity: Number(quantity) } : {}),
    ...(has('slot') && slot !== '' ? { slot: Number(slot) } : {}),
    ...(wound !== '' && (requiresWound || target === 'wound' || clinical?.wound === 'untreated') ? { wound: woundOptions[Number(wound)]!.selector } : {}),
    ...(target === 'wound' || target === 'contusion' ? { target } : {}),
    ...(has('placement') && placements[0] ? { placement: placements[0] } : {}),
    ...(has('placements') && complete ? { placements: placements.filter((p): p is PlayerPlacement => p !== null) } : {}),
    ...(has('materials') ? { materials: selectedMaterials } : {}),
    ...(has('allocations') ? { allocations: selectedAllocations } : {}),
  }
  const preview = complete ? controls.preview(request) : null
  const canExecute = preview && ['available', 'unknown'].includes(preview.qualification.kind)
  return <div className="iw-overlay" onKeyDown={e => {
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Tab') {
      const elements = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),select,input:not(:disabled),[tabindex="0"]')]
      const first = elements[0], last = elements.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
  }}><form className="iw-dialog iw-action-form" aria-label="行动参数" onSubmit={e => { e.preventDefault(); if (canExecute) onExecute(request) }} role="dialog" aria-modal="true">
    <h2>{actionName(action)}{selectedSource ? ` · ${publicItemName(source.name)}` : ''}</h2><div className="iw-form-content"><div className="iw-form-fields">
      {inputs.hints.map(h => <p key={h}>{h}</p>)}
      {has('item') && <label>物品<select aria-label="物品" value={item} onChange={e => { setItem(e.target.value); setTarget(''); setWound(''); setPlacements([]) }}>
        <option value="">请选择实际物品</option>{inputs.items.map((i, n) => <option key={n} value={n}>{publicItemName(i.name)} ×{i.quantity}</option>)}
      </select></label>}
      {has('targetItem') && <label>目标堆叠<select aria-label="目标堆叠" value={targetItem} onChange={e => setTargetItem(e.target.value)}>
        <option value="">请选择目标</option>{inputs.targetItems.map((i, n) => <option key={n} value={n}>{publicItemName(i.name)} ×{i.quantity}</option>)}
      </select></label>}
      {has('quantity') && <label>数量<input aria-label="数量" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>}
      {has('slot') && <label>快捷位<select aria-label="快捷位" value={slot} onChange={e => setSlot(e.target.value)}><option value="">请选择空槽</option>{inputs.slots.map(s => <option key={s} value={s}>快捷位{s + 1}</option>)}</select></label>}
      {clinical && clinical.targets.length > 0 && <label>处理目标<select aria-label="处理目标" value={target} onChange={e => { setTarget(e.target.value); setWound('') }}>
        <option value="">请选择处理目标</option>{clinical.allowNoTarget && <option value="none">仅恢复生命</option>}{clinical.targets.map(t => <option key={t} value={t}>{t === 'contusion' ? '一处轻度挫伤' : '指定开放伤口'}</option>)}
      </select></label>}
      {clinical && (clinical.wound === 'untreated' || target === 'wound') && <label>伤口<select aria-label="伤口" value={wound} onChange={e => setWound(e.target.value)}>
        <option value="">请选择伤口</option>{woundOptions.map((w, n) => <option key={n} value={n}>伤口{w.ordinal} · {w.kind} · {w.treatment}</option>)}
      </select></label>}
      {inputs.materials.map((m, r) => <fieldset key={r}><legend>需要 {publicItemName(m.name)} ×{m.quantity}</legend>
        {!m.choices.length && <p>当前没有对应材料。</p>}{m.choices.map((i, c) => <label key={c}>{publicItemName(i.name)} ×{i.quantity}（来源{c + 1}）
          <input type="number" aria-label={`${publicItemName(m.name)}来源${c + 1}用量`} value={materials[`${r}:${c}`] ?? ''} placeholder="不使用" onChange={e => setMaterials({ ...materials, [`${r}:${c}`]: e.target.value })} /></label>)}
      </fieldset>)}
      {has('allocations') && <fieldset><legend>机械维修共享总池 {inputs.allocation?.pool}</legend>{inputs.allocation?.targets.map((i, n) => <label key={n}>{publicItemName(i.name)} {i.current}/{i.maximum}
        <input type="number" aria-label={`${publicItemName(i.name)}分配`} value={allocations[n] ?? ''} placeholder="不分配" onChange={e => setAllocations({ ...allocations, [n]: e.target.value })} /></label>)}</fieldset>}
      {Array.from({ length: placementCount }, (_, n) => {
        const geometry = inputs.outputs[n] ?? (selectedSource ? source : null)
        return geometry && <PlacementPicker key={n} label={publicItemName(inputs.outputs[n]?.name ?? '物品')}
          view={{ ...view, carried: view.carried.map(i => ({ ...i, name: publicItemName(i.name) })) }} width={geometry.width} height={geometry.height} canRotate={geometry.canRotate}
          value={placements[n] ?? null} onChange={p => setPlacements(Array.from({ length: placementCount }, (_, j) => j === n ? p : placements[j] ?? null))} />
      })}
    </div><aside aria-label="正式行动预览">{preview ? <SafeFacts metadata={preview} /> : <p>完成明确选择后显示正式预览；编辑不执行行动。</p>}</aside></div>
    <footer><button type="button" ref={cancel} onClick={onCancel}>取消</button><button type="submit" disabled={!canExecute}>执行行动</button></footer>
  </form></div>
}
