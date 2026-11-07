import type { ReactNode } from 'react'
import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { missionCopy } from '../../../content/infected-world-v0.1/mission-guidance-copy'
import { publicItemName } from '../labels'

const dispositions: Readonly<Record<string, string>> = {
  delivered: '已交付', 'partial-delivery': '部分交付', 'returned-special': '已带回', 'revoked-permission': '权限收回',
  'death-unavailable': '未能安全带回', installed: '已安装', consumed: '已消耗', destroyed: '已损坏',
}

export function TerminalPanel({ view, children }: { view: PlayerReadyView; children?: ReactNode }) {
  const result = view.terminal.result
  const title = result ? missionCopy.outcomes[result.outcome] : view.point === 'dead' ? '玩家死亡' : '已返回中枢'
  return <section className="iw-terminal" aria-label="终局摘要">
    <p className="iw-eyebrow">{missionCopy.chapterEnd}</p>
    <h1>{title}</h1>
    <p>当前测试版只有这一份委托，没有下一关。你可以查看结算、物品和本次结局。</p>
    <p className="iw-terminal-save" data-save-failed={view.persistence.feedback === 'save-failed' || undefined}>
      {view.persistence.feedback === 'save-failed' ? '请先使用下方的「重试保存」。' : '确认保存成功后即可关闭页面。'}
    </p>
    {result && <>
      <dl className="iw-terminal-values">
        <div><dt>奖励</dt><dd>{result.reward}</dd></div>
        <div><dt>扣罚</dt><dd>{result.penalty}</dd></div>
        <div><dt>失去</dt><dd>{result.forfeited}</dd></div>
        <div><dt>余额</dt><dd>{result.balance}</dd></div>
      </dl>
      <details className="iw-terminal-items">
        <summary>查看物品处置</summary>
        {result.items.length > 0 ? <ul>{result.items.map((item, index) =>
          <li key={index}>{publicItemName(item.name)} ×{item.quantity} · {dispositions[item.disposition] ?? '已结算'}</li>)}</ul> :
          <p>本次没有专项物品处置。</p>}
      </details>
    </>}
    {children}
  </section>
}
