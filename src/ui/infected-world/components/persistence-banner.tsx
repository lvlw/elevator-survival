import type { PlayerReadyView } from '../../../state/residence-session/player-types'
export function PersistenceBanner({ persistence, onRetrySave }: { persistence: PlayerReadyView['persistence']; onRetrySave: () => void }) {
  return persistence.feedback === 'save-failed' ? <aside className="iw-save-warning" role="alert">
    <div><strong>操作已生效，尚未保存</strong><p>当前内存进度保留。刷新可能丢失尚未持久化的进度；重试只保存，不重复行动。</p></div>
    <button type="button" onClick={onRetrySave}>重试保存</button>
  </aside> : <div className="iw-save-status" role="status">{persistence.feedback === 'saved' ? '当前进度已保存' : '本页面尚未执行新的保存操作'}</div>
}
