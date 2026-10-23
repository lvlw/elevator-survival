import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { publicItemName } from '../labels'
const outcomes: Readonly<Record<string, string>> = { success: '委托完成', 'voluntary-failure': '已止损返回', 'deadline-failure': '期限已结束', death: '玩家死亡' }
const dispositions: Readonly<Record<string, string>> = { delivered: '已交付', 'partial-delivery': '部分交付', 'returned-special': '已带回',
  'revoked-permission': '权限收回', 'death-unavailable': '未能安全带回', installed: '已安装', consumed: '已消耗', destroyed: '已损坏' }
export function TerminalPanel({ view }: { view: PlayerReadyView }) {
  const result = view.terminal.result
  return <section className="iw-terminal" aria-label="终局摘要"><p className="iw-eyebrow">{view.point === 'dead' ? '生命归零' : '静态中枢'}</p>
    <h1>{result ? outcomes[result.outcome] : view.point === 'dead' ? '玩家死亡' : '已返回中枢'}</h1>
    <p>{view.point === 'dead' ? '本次委托已终止；不会复活或重接本委托。' : '本次返回已经结算。当前没有后继内容，不会自动过夜、治疗或再次出发。'}</p>
    {result && <><dl className="iw-terminal-values"><div><dt>奖励</dt><dd>{result.reward}</dd></div><div><dt>扣罚</dt><dd>{result.penalty}</dd></div><div><dt>失去</dt><dd>{result.forfeited}</dd></div><div><dt>余额</dt><dd>{result.balance}</dd></div></dl>
      <details><summary>实物处置</summary><ul>{result.items.map((item, index) => <li key={index}>{publicItemName(item.name)} ×{item.quantity} · {dispositions[item.disposition] ?? '已结算'}</li>)}</ul></details></>}
  </section>
}
