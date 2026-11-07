import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

/** A view only. The caller supplies current public facts, never a saved screen sample. */
export function ContentLayer({ title, tier = 'summary', onClose, children, restoreFocus, stageRef }: {
  title: string; tier?: 'short' | 'detail' | 'summary' | 'mission' | 'parameters' | 'organize' | 'map'; onClose(): void; children: ReactNode; restoreFocus?: () => boolean
  stageRef?: RefObject<HTMLElement | null>
}) {
  const close = useRef<HTMLButtonElement>(null)
  const restore = useRef(restoreFocus); restore.current = restoreFocus
  const [maximized, setMaximized] = useState(false)
  const [stageHeight, setStageHeight] = useState(0)
  useLayoutEffect(() => {
    const stage = stageRef?.current
    if (!stage) return
    const measure = () => setStageHeight(stage.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [stageRef])
  useEffect(() => {
    const prior = document.activeElement
    close.current?.focus()
    return () => { if ((!restore.current || restore.current()) && prior instanceof HTMLElement && prior.isConnected && !prior.matches(':disabled')) prior.focus({ preventScroll: true }) }
  }, [])
  return createPortal(<div className="iw-app iw-content-overlay" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
    if (event.key === 'Tab') {
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')]
      const visible = focusable.filter(element => {
        const closed = element.closest('details:not([open])')
        return !closed || closed.querySelector(':scope > summary')?.contains(element)
      })
      const first = visible[0], last = visible.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }}><section className={`iw-content-layer iw-framed iw-tier-${tier}${maximized ? ' iw-maximized' : ''}`} role="dialog" aria-modal="true" aria-label={title} style={stageHeight > 0 ? { '--iw-stage-height': stageHeight + 'px' } as CSSProperties : undefined} data-size={maximized ? 'expanded' : 'default'}>
    <header><h2>{title}</h2><div><button type="button" onClick={() => setMaximized(value => !value)}>{maximized ? '还原' : '放大'}</button><button type="button" ref={close} onClick={onClose}>关闭</button></div></header>
    <div className="iw-content-body" tabIndex={0}>{children}</div>
  </section></div>, document.body)
}
