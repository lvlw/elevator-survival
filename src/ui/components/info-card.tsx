import { useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { positionFloating } from './floating-position'

export interface InfoCardProps {
  readonly label: string
  readonly title: string
  readonly summary: string
  readonly details?: readonly string[]
  readonly children?: ReactNode
  readonly onActivate?: (element: HTMLElement) => void
}

/**
 * Player-safe, presentation-only help. The card is available from both hover
 * and keyboard focus. Optional item activation delegates to its caller; the
 * help card never owns gameplay state or a command implementation.
 */
export function InfoCard({ label, title, summary, details = [], children, onActivate }: InfoCardProps) {
  const tooltipId = useId()
  const cardRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<Readonly<{ left: number; top: number }> | null>(null)
  const positionNear = (element: HTMLElement) => {
    const width = cardRef.current?.offsetWidth ?? 352
    const height = cardRef.current?.offsetHeight ?? 180
    setPosition(positionFloating(element.getBoundingClientRect(), { width, height }, { width: window.innerWidth, height: window.innerHeight }))
  }
  const triggerProps = {
    'aria-label': label,
    'aria-describedby': tooltipId,
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => positionNear(event.currentTarget),
    onFocus: (event: React.FocusEvent<HTMLElement>) => positionNear(event.currentTarget),
  }
  return <span className="info-card-anchor">
    {children === undefined
      ? <button type="button" className="info-card-trigger" {...triggerProps}>i</button>
      : <span className="info-card-item-trigger" tabIndex={0} role={onActivate ? 'button' : undefined}
          onClick={onActivate ? (event) => onActivate(event.currentTarget) : undefined}
          onKeyDown={onActivate ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onActivate(event.currentTarget) } } : undefined}
          {...triggerProps}>{children}</span>}
    <span className="info-card" id={tooltipId} role="tooltip" ref={cardRef} style={position as CSSProperties | undefined}>
      <strong>{title}</strong>
      <span>{summary}</span>
      {details.length > 0 && <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
    </span>
  </span>
}
