import type { StableRunUiGhostNumber, StableRunUiGhostPreview } from '../interaction'
import type { PlayerVisibleSceneTimeBudgetViewModel } from '../presentation'

function percentOfTotal(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (value / total) * 100))
}

function ghostNumberText(value: StableRunUiGhostNumber): string {
  return value.kind === 'single'
    ? String(value.value)
    : value.kind === 'range'
      ? `${value.minimum}–${value.maximum}`
      : value.reason
}

function budgetTone(budget: PlayerVisibleSceneTimeBudgetViewModel): 'normal' | 'warning' | 'danger' {
  if (budget.returnRisk === 'dead') return 'danger'
  if (budget.returnRisk === 'forced-returned' || (budget.safeMargin !== null && budget.safeMargin <= 0)) {
    return 'warning'
  }
  return 'normal'
}

export function SceneTimeBudget({
  budget,
  ghost,
}: Readonly<{
  budget: PlayerVisibleSceneTimeBudgetViewModel
  ghost: StableRunUiGhostPreview | null
}>) {
  const safeTime = budget.safeMargin === null ? 0 : Math.max(0, budget.safeMargin)
  const returnTime = budget.returnReserve ?? 0
  const riskTime = budget.safeMargin === null ? 0 : Math.max(0, -budget.safeMargin)
  const tone = budgetTone(budget)
  const unavailable = budget.unavailableReason === 'combat-recalculate'
    ? '战斗结束后重算'
    : '当前阶段不可预览'
  return <section className={`time-budget time-budget--${tone}${ghost ? ` time-budget--ghost-${ghost.tone}` : ''}`} aria-label="场景时间预算">
    <header className="time-budget__header">
      <div><span>今日时间</span><strong>{budget.remainingTime} / {budget.totalTime}</strong></div>
      <small>精确时间预算 · Ghost 仅供确认前比较</small>
    </header>
    <div className="time-budget__track" aria-hidden="true">
      <span className="time-budget__used" style={{ width: `${percentOfTotal(budget.usedTime, budget.totalTime)}%` }} />
      <span className="time-budget__safe" style={{ width: `${percentOfTotal(safeTime, budget.totalTime)}%` }} />
      <span className="time-budget__return" style={{ width: `${percentOfTotal(returnTime, budget.totalTime)}%` }} />
      {riskTime > 0 && <span className="time-budget__risk" style={{ width: `${percentOfTotal(riskTime, budget.totalTime)}%` }} />}
    </div>
    <dl className="time-budget__facts">
      <div><dt>剩余时间：</dt><dd>{budget.remainingTime}</dd></div>
      <div><dt>预计返程：</dt><dd>{budget.returnReserve ?? unavailable}</dd></div>
      <div><dt>返程后预计剩余：</dt><dd>{budget.returnAfterWithdrawalTime ?? unavailable}</dd></div>
      <div><dt>安全余量：</dt><dd>{budget.safeMargin ?? unavailable}</dd></div>
    </dl>
    {tone === 'warning' && <p className="time-budget__warning">当前返程将进入强制返程。已越过或抵达安全返程线；仍可在正式预览后自行承担风险。</p>}
    {tone === 'danger' && <p className="time-budget__warning time-budget__warning--danger">当前正式返程预览将导致死亡。</p>}
    {ghost && <aside className={`ghost-preview ghost-preview--${ghost.tone}`} aria-label="行动预估" aria-live="polite">
      <header><span>行动预估</span><strong>{ghost.title}</strong><em>耗时 {ghost.actionTime}</em></header>
      <div className="ghost-preview__budget">
        <span>行动后 {ghostNumberText(ghost.timeAfter)}</span>
        <span>返程预留 {ghostNumberText(ghost.returnReserveAfter)}</span>
        <span>安全余量 {ghostNumberText(ghost.safeMarginAfter)}</span>
        <span>生命 {ghostNumberText(ghost.healthAfter)}</span>
      </div>
      {ghost.consequences.length > 0 && <dl>{ghost.consequences.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
    </aside>}
  </section>
}
