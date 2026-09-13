import { useRef, useState } from 'react'
import App, { type AppProps } from '../App'
import { clearUnrecoverableRunSave } from './production-bootstrap'

/** DEV composition utility. It never enters the gameplay command or Inspector APIs. */
export default function DevPlaytestShell(props: AppProps) {
  const [bootstrapResult, setBootstrapResult] = useState(props.initialBootstrapResult)
  const [appKey, setAppKey] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [clearFailed, setClearFailed] = useState(false)
  const clearingRef = useRef(false)

  const confirmReset = () => {
    if (clearingRef.current) return
    clearingRef.current = true
    try {
      const result = clearUnrecoverableRunSave(props.storage)
      if (result.kind === 'clear-failed') {
        setClearFailed(true)
        return
      }
      setBootstrapResult(Object.freeze({ kind: 'no-run' }))
      setAppKey((key) => key + 1)
      setConfirming(false)
      setClearFailed(false)
    } finally {
      clearingRef.current = false
    }
  }

  return <>
    <App key={appKey} {...props} initialBootstrapResult={bootstrapResult} />
    <aside className="dev-playtest-reset" aria-label="开发测试工具">
      <button type="button" onClick={() => {
        setClearFailed(false)
        setConfirming(true)
      }}>开发测试：重新开始</button>
    </aside>
    {confirming && <div className="dev-reset-surface" role="presentation">
      <section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="dev-reset-heading">
        <h2 id="dev-reset-heading">确认重新开始开发测试？</h2>
        <p className="preview-warning">这会不可逆地清除当前浏览器的本局存档，并丢弃当前会话中的本局进度，返回正式“开始新一局”页面。</p>
        <p>不会清除其他浏览器数据或 Profile；这不是正式游戏中的放弃行动。</p>
        {clearFailed && <p role="alert">本局存档清除失败。当前进度保持不变，请检查浏览器存储权限后重试。</p>}
        <div className="preview-controls">
          <button type="button" onClick={() => {
            setConfirming(false)
            setClearFailed(false)
          }}>取消</button>
          <button type="button" className="confirm-action" onClick={confirmReset}>确认清除本局并重新开始</button>
        </div>
      </section>
    </div>}
  </>
}
