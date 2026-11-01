import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** A view only. The caller supplies current public facts, never a saved screen sample. */
export function ContentLayer({ title, tier = 'summary', onClose, children, restoreFocus }: {
  title: string; tier?: 'short' | 'detail' | 'summary' | 'parameters' | 'organize' | 'map'; onClose(): void; children: ReactNode; restoreFocus?: () => boolean
}) {
  const close = useRef<HTMLButtonElement>(null)
  const restore = useRef(restoreFocus); restore.current = restoreFocus
  const [maximized, setMaximized] = useState(false)
  useEffect(() => {
    const prior = document.activeElement
    close.current?.focus()
    return () => { if ((!restore.current || restore.current()) && prior instanceof HTMLElement && prior.isConnected && !prior.matches(':disabled')) prior.focus({ preventScroll: true }) }
  }, [])
  return createPortal(<div className="iw-app iw-content-overlay" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
    if (event.key === 'Tab') {
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')]
      const first = focusable[0], last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }}><section className={`iw-content-layer iw-framed iw-tier-${tier}${maximized ? ' iw-maximized' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
    <header><h2>{title}</h2><div><button type="button" onClick={() => setMaximized(value => !value)}>{maximized ? '还原' : '放大'}</button><button type="button" ref={close} onClick={onClose}>关闭</button></div></header>
    <div className="iw-content-body" tabIndex={0}>{children}</div>
  </section></div>, document.body)
}
