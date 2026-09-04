import { useId } from 'react'

export interface InfoCardProps {
  readonly label: string
  readonly title: string
  readonly summary: string
  readonly details?: readonly string[]
}

/**
 * Player-safe, presentation-only help. The card is available from both hover
 * and keyboard focus and never owns gameplay state or dispatches commands.
 */
export function InfoCard({ label, title, summary, details = [] }: InfoCardProps) {
  const tooltipId = useId()
  return <span className="info-card-anchor">
    <button
      type="button"
      className="info-card-trigger"
      aria-label={label}
      aria-describedby={tooltipId}
    >i</button>
    <span className="info-card" id={tooltipId} role="tooltip">
      <strong>{title}</strong>
      <span>{summary}</span>
      {details.length > 0 && <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
    </span>
  </span>
}
