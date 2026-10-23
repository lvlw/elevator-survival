import { useEffect, useRef } from 'react'
import type { PlayerIntentMetadata } from '../../../state/residence-session/player-preplay-types'
import { publicItemName } from '../labels'

export function SafeFacts({ metadata }: { metadata: PlayerIntentMetadata }) {
  return <div className="iw-facts">
    <p>正式资格：{({ available: '可执行', unknown: '目标资格未知', unavailable: '当前不能执行', 'invalid-selection': '选择已失效' })[metadata.qualification.kind]}</p>
    {metadata.qualification.cost !== null && <p>精力消耗：{metadata.qualification.cost}</p>}
    <p>{metadata.death.kind === 'guaranteed' ? '正式安全事实证明：本命令将导致死亡。' : metadata.death.kind === 'not-guaranteed' ? '未证明本命令必死；不代表没有风险。' : '完整后果未知，不作安全保证。'}</p>
    {metadata.facts?.mechanisms.map(text => <p key={text}>{text}</p>)}
    {metadata.facts?.resources.map((r, n) => <p key={n}>{publicItemName(r.name)}资源：{r.before} → {r.after}（支付{r.consumed}）</p>)}
    {metadata.facts?.materials.map((r, n) => <p key={n}>材料：{publicItemName(r.name)} ×{r.quantity}</p>)}
    {metadata.facts?.output && <p>取得：{publicItemName(metadata.facts.output.name)} ×{metadata.facts.output.quantity}，{metadata.facts.output.width}×{metadata.facts.output.height}，单件重量{metadata.facts.output.unitWeight}；取得不等于交付。</p>}
    {metadata.facts?.clinical && <p>{metadata.facts.clinical.effect}{metadata.facts.clinical.healthRecovery !== null && ` 本次恢复生命${metadata.facts.clinical.healthRecovery}。`}</p>}
    {metadata.facts?.maintenance && <><p>本次总池：{metadata.facts.maintenance.totalPool}</p>{metadata.facts.maintenance.allocations.map((r, n) => <p key={n}>{publicItemName(r.name)}：分配{r.requested}，实际恢复{r.restored}，完成后{r.after}</p>)}</>}
  </div>
}

export function ConfirmationLayer({ title, metadata, onConfirm, onCancel }: {
  title: string; metadata: PlayerIntentMetadata; onConfirm: () => void; onCancel: () => void
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => { const prior = document.activeElement; cancel.current?.focus(); return () => { if (prior instanceof HTMLElement && prior.isConnected) prior.focus() } }, [])
  return <div className="iw-overlay" onKeyDown={e => {
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Tab') {
      const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      e.preventDefault(); buttons[(index + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus()
    }
  }}><section role="dialog" aria-modal="true" aria-label="保护确认" className="iw-dialog">
    <h2>{title}</h2><p className="iw-warning">此操作不可撤销。请确认当前选择及后果。</p>
    <SafeFacts metadata={metadata} />
    <footer><button ref={cancel} onClick={onCancel}>取消</button><button onClick={onConfirm}>确认执行</button></footer>
  </section></div>
}
