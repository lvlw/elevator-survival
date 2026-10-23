import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function DetailsPopover({ anchor, focusOnOpen, onClose, children }: {
  anchor: HTMLElement; focusOnOpen: boolean; onClose: () => void; children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null), close = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ left: 8, top: 8 })
  useLayoutEffect(() => {
    const place = () => {
      const box = anchor.getBoundingClientRect(), panel = ref.current?.getBoundingClientRect()
      if (!panel) return
      const below = box.bottom + 8
      setPosition({ left: Math.max(8, Math.min(box.left, window.innerWidth - panel.width - 8)),
        top: Math.max(8, Math.min(below + panel.height <= window.innerHeight - 8 ? below : box.top - panel.height - 8, window.innerHeight - panel.height - 8)) })
    }
    place(); if (focusOnOpen) close.current?.focus()
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [anchor, focusOnOpen])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose() }
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside) }
  }, [anchor, onClose])
  return createPortal(<aside ref={ref} className="iw-app iw-information" role="dialog" aria-modal="false" aria-label="行动说明" id="iw-action-information" style={position}>
    {children}<button type="button" ref={close} onClick={onClose}>关闭说明</button>
  </aside>, document.body)
}
