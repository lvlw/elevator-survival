import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlayerAction } from '../../../state/residence-session/player-types'
import { actionName } from '../labels'

export function ContextMenu({ name, actions, x, y, onAction, onClose }: { name: string; actions: readonly PlayerAction[];
  x: number; y: number; onAction: (action: PlayerAction) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })
  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    const box = menu.getBoundingClientRect()
    setPosition({ left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)) })
    menu.querySelector<HTMLButtonElement>('button')?.focus()
  }, [x, y])
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose() }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const buttons = [...(ref.current?.querySelectorAll('button') ?? [])]
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
        buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
        event.preventDefault()
      }
    }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key) }
  }, [onClose])
  return createPortal(<div ref={ref} role="menu" aria-label={`${name} 操作`} className="iw-context" style={position}>
    <strong>{name}</strong>{actions.map((action, index) => <button type="button" role="menuitem" key={index} onClick={() => onAction(action)}>{actionName(action)}</button>)}
    <button type="button" role="menuitem" onClick={onClose}>关闭菜单</button>
  </div>, document.body)
}
