import type { BrowserSnapshot } from '../../../app/infected-browser/types'

const titles: Readonly<Record<BrowserSnapshot['status'], string>> = {
  idle: '准备独立首玩', acquiring: '正在取得本页写入权限', occupied: '另一个页面正在使用此存档', unsupported: '当前浏览器环境不支持独占保存',
  setup: '出发准备', loading: '正在恢复当前状态', 'read-error': '读取存档失败', blocked: '存档暂时无法安全恢复',
  'reservation-failed': '初始化预留未能保存', ready: '展示暂不可用', suspended: '本页已停止写入', disposed: '本页已关闭',
}
export function SystemScreen({ snapshot, onAcquire, onRetryRead, onSynchronize }: {
  snapshot: BrowserSnapshot; onAcquire: () => void; onRetryRead: () => void; onSynchronize: () => void
}) {
  const reacquire = ['idle', 'occupied', 'suspended'].includes(snapshot.status)
  const view = snapshot.preplay?.view
  const projectionUnavailable = snapshot.preplay?.status === 'projection-error' ||
    (view?.status === 'blocked' && view.reason === 'projection-unavailable')
  const withoutCurrent = snapshot.preplay === null || view?.status === 'no-current' || view?.status === 'read-error' ||
    view?.status === 'unbootstrapped' || (view?.status === 'blocked' && view.reason === 'load-blocked')
  const reread = ['read-error', 'blocked', 'reservation-failed'].includes(snapshot.status) && withoutCurrent && !projectionUnavailable
  const projection = ['ready', 'blocked'].includes(snapshot.status) && projectionUnavailable
  return <main className="iw-app iw-system"><section className="iw-system-card" aria-live="polite">
    <p className="iw-eyebrow">独立 DEV 封闭首玩</p><h1>{titles[snapshot.status]}</h1>
    <p>{snapshot.message ?? '当前不会执行游戏行动，也不会创建或覆盖另一份进度。'}</p>
    {snapshot.status === 'occupied' && <p>请关闭占用页面后明确重试。本页不会自动排队，也不会继续旧内存。</p>}
    {snapshot.status === 'suspended' && <p>旧选择已失效。重新取得独占后，只能恢复最后成功保存的进度。</p>}
    {snapshot.status === 'unsupported' && <p>请在支持 Web Locks 的安全浏览器环境中打开；不会降级为无锁写入。</p>}
    {['blocked', 'read-error', 'reservation-failed'].includes(snapshot.status) && <p>现有记录保持原样；不会把问题当成空档、清档或重发物资。</p>}
    {reacquire && <button type="button" onClick={onAcquire}>重新取得独占</button>}
    {reread && <button type="button" onClick={onRetryRead}>重试读取</button>}
    {projection && <button type="button" onClick={onSynchronize}>重建安全展示</button>}
  </section></main>
}
