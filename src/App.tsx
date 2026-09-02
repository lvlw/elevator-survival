import { useRef, useState } from 'react'
import { appMetadata } from './app/app-metadata'
import {
  executeHospitalNewRunTransaction,
  type HospitalNewRunOrigin,
  type HospitalNewRunTransactionDependencies,
} from './app/new-run'
import {
  bootstrapProductionRun,
  clearUnrecoverableRunSave,
  type ProductionLoadError,
  type ProductionRunBootstrapResult,
} from './app/production-bootstrap'
import type { RunSaveRulesRegistry, RunSaveStorage } from './state/run-save'
import {
  createHospitalNewRunSetupFromUiSelection,
  createHospitalNewRunSetupViewModel,
  mapPlayerSafeHospitalNewRunError,
  type HospitalNewRunUtilityOptionKey,
} from './ui/hospital-v0.1'
import { StableRunUiApp } from './ui/stable-run-ui-app'
import type { StableRunUiPresentationDependencies } from './ui/presentation'

export interface AppProps {
  readonly initialBootstrapResult: ProductionRunBootstrapResult
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
  readonly presentationDependencies: StableRunUiPresentationDependencies
  readonly newRunDependencies: HospitalNewRunTransactionDependencies
}

const newRunSetupModel = createHospitalNewRunSetupViewModel()

function loadErrorCopy(error: ProductionLoadError): Readonly<{
  heading: string
  detail: string
}> {
  if (error.category === 'corrupt-save') return {
    heading: '存档内容损坏，无法严格恢复',
    detail: '原存档仍然保留。你可以显式清除这份无法恢复的本局存档。',
  }
  if (error.category === 'incompatible-save') return {
    heading: '存档版本与当前游戏不兼容',
    detail: '原存档仍然保留。你可以显式清除这份无法恢复的本局存档。',
  }
  return {
    heading: '当前无法读取浏览器中的本局存档',
    detail: '存档没有被清除。请检查浏览器存储权限后重新尝试读取。',
  }
}

function NewRunSetupView({
  fromFailure,
  selectedUtility,
  previewUtility,
  playerError,
  submitting,
  onSelectUtility,
  onOpenPreview,
  onCancelSetup,
  onCancelPreview,
  onConfirm,
}: Readonly<{
  fromFailure: boolean
  selectedUtility: HospitalNewRunUtilityOptionKey | null
  previewUtility: HospitalNewRunUtilityOptionKey | null
  playerError: string | null
  submitting: boolean
  onSelectUtility(key: HospitalNewRunUtilityOptionKey): void
  onOpenPreview(): void
  onCancelSetup(): void
  onCancelPreview(): void
  onConfirm(): void
}>) {
  const selected = newRunSetupModel.utilityOptions.find(
    ({ key }) => key === previewUtility,
  ) ?? null
  return <main className="app-shell">
    <article className="status-card" aria-labelledby="new-run-heading">
      <p className="eyebrow">{appMetadata.verticalSliceVersion}</p>
      <h1 id="new-run-heading">开始新的医院行动</h1>
      <p className="subtitle">从电梯中枢开始第 1 日</p>
      <section aria-labelledby="initial-loadout-heading">
        <h2 id="initial-loadout-heading">固定初始配装</h2>
        <dl className="slot-list">
          <div><dt>武器</dt><dd>{newRunSetupModel.fixedWeaponName}</dd></div>
          <div><dt>防具</dt><dd>{newRunSetupModel.fixedArmorName}</dd></div>
          {newRunSetupModel.quickSlots.map((slot) => <div key={slot.slotNumber}>
            <dt>快捷位 {slot.slotNumber}</dt>
            <dd>{slot.itemName === null ? '空' : `${slot.itemName} ×${slot.quantity}`}</dd>
          </div>)}
          <div><dt>背包</dt><dd>{newRunSetupModel.backpackSummary}</dd></div>
        </dl>
      </section>
      <fieldset>
        <legend>显式选择一件初始实用装备</legend>
        {newRunSetupModel.utilityOptions.map((option) => <label key={option.key} className="utility-option-card">
          <span><input
              type="radio"
              name="new-run-utility"
              value={option.key}
              checked={selectedUtility === option.key}
              onChange={() => onSelectUtility(option.key)}
            /> <strong>{option.name}</strong></span>
          <span>{option.purpose}</span>
          <span>代价：{option.cost}</span>
          <span>限制：{option.limitation}</span>
        </label>)}
      </fieldset>
      <p className="empty-copy">{newRunSetupModel.specializationNotice}</p>
      {playerError && <p role="alert">{playerError}</p>}
      <div className="preview-controls">
        {fromFailure && <button type="button" onClick={onCancelSetup}>返回终止摘要</button>}
        <button
          type="button"
          className="confirm-action"
          disabled={selectedUtility === null}
          onClick={onOpenPreview}
        >预览新一局</button>
      </div>
      {selected && <div className="preview-backdrop" role="presentation">
        <section
          className="preview-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-run-preview-heading"
        >
          <h2 id="new-run-preview-heading">确认开始新的医院行动</h2>
          <dl className="preview-facts">
            <div><dt>固定武器</dt><dd>{newRunSetupModel.fixedWeaponName}</dd></div>
            <div><dt>固定防具</dt><dd>{newRunSetupModel.fixedArmorName}</dd></div>
            <div><dt>初始实用装备</dt><dd>{selected.name}</dd></div>
            <div><dt>快捷位 1</dt><dd>{newRunSetupModel.quickSlots[0]?.itemName} ×1</dd></div>
            <div><dt>起点</dt><dd>第 1 日 · 电梯中枢</dd></div>
            <div><dt>创建后</dt><dd>立即尝试保存</dd></div>
          </dl>
          <p>{newRunSetupModel.specializationNotice}</p>
          <ul className="preview-warnings">
              <li>确认后将生成完整第 1 日状态并立即尝试保存。</li>
            {fromFailure && <>
              <li>新一局将替换当前保存的终止摘要。</li>
              <li>当前尚未实现跨局历史记录，请勿将本次终止摘要理解为永久历史。</li>
            </>}
          </ul>
          {playerError && <p role="alert">{playerError}</p>}
          <div className="preview-controls">
            <button type="button" disabled={submitting} onClick={onCancelPreview}>取消</button>
            <button
              type="button"
              className="confirm-action"
              disabled={submitting}
              onClick={onConfirm}
            >{submitting ? '正在创建…' : '确认创建'}</button>
          </div>
        </section>
      </div>}
    </article>
  </main>
}

export default function App({
  initialBootstrapResult,
  storage,
  rulesRegistry,
  presentationDependencies,
  newRunDependencies,
}: AppProps) {
  const [shellState, setShellState] = useState(initialBootstrapResult)
  const [showClearPreview, setShowClearPreview] = useState(false)
  const [clearFailed, setClearFailed] = useState(false)
  const [showFailureNewRunSetup, setShowFailureNewRunSetup] = useState(false)
  const [selectedUtility, setSelectedUtility] =
    useState<HospitalNewRunUtilityOptionKey | null>(null)
  const [previewUtility, setPreviewUtility] =
    useState<HospitalNewRunUtilityOptionKey | null>(null)
  const [newRunError, setNewRunError] = useState<string | null>(null)
  const [newRunSaveFailed, setNewRunSaveFailed] = useState(false)
  const [submittingNewRun, setSubmittingNewRun] = useState(false)
  const submittingNewRunRef = useRef(false)

  const failureSetupActive = showFailureNewRunSetup &&
    shellState.kind === 'ready' &&
    shellState.store.getState().phase.kind === 'run-failure'
  const setupActive = shellState.kind === 'no-run' || failureSetupActive

  const resetSetup = () => {
    setSelectedUtility(null)
    setPreviewUtility(null)
    setNewRunError(null)
    setSubmittingNewRun(false)
    submittingNewRunRef.current = false
  }

  const confirmNewRun = () => {
    if (submittingNewRunRef.current || previewUtility === null) return
    let origin: HospitalNewRunOrigin
    if (shellState.kind === 'no-run') {
      origin = { kind: 'no-run' }
    } else if (shellState.kind === 'ready') {
      const currentPhase = shellState.store.getState().phase
      if (currentPhase.kind !== 'run-failure') {
        setPreviewUtility(null)
        setShowFailureNewRunSetup(false)
        setNewRunError(null)
        return
      }
      origin = currentPhase
    } else {
      setPreviewUtility(null)
      setShowFailureNewRunSetup(false)
      setNewRunError(null)
      return
    }

    submittingNewRunRef.current = true
    setSubmittingNewRun(true)
    setNewRunError(null)
    try {
      const result = executeHospitalNewRunTransaction({
        origin,
        setup: createHospitalNewRunSetupFromUiSelection(previewUtility),
        dependencies: newRunDependencies,
      })
      setNewRunSaveFailed(result.kind === 'created-with-save-failure')
      setShowFailureNewRunSetup(false)
      setSelectedUtility(null)
      setPreviewUtility(null)
      setNewRunError(null)
      setSubmittingNewRun(false)
      setShellState(Object.freeze({ kind: 'ready', store: result.store }))
    } catch (error) {
      submittingNewRunRef.current = false
      setSubmittingNewRun(false)
      const mapped = mapPlayerSafeHospitalNewRunError(error)
      if (mapped.kind === 'player-error') {
        setNewRunError(mapped.message)
        return
      }
      setPreviewUtility(null)
      setShowFailureNewRunSetup(false)
      setNewRunError(null)
    }
  }

  if (setupActive) return <NewRunSetupView
    fromFailure={failureSetupActive}
    selectedUtility={selectedUtility}
    previewUtility={previewUtility}
    playerError={newRunError}
    submitting={submittingNewRun}
    onSelectUtility={(key) => {
      setSelectedUtility(key)
      setNewRunError(null)
    }}
    onOpenPreview={() => {
      if (selectedUtility === null) return
      submittingNewRunRef.current = false
      setSubmittingNewRun(false)
      setNewRunError(null)
      setPreviewUtility(selectedUtility)
    }}
    onCancelSetup={() => {
      resetSetup()
      setShowFailureNewRunSetup(false)
    }}
    onCancelPreview={() => {
      submittingNewRunRef.current = false
      setSubmittingNewRun(false)
      setNewRunError(null)
      setPreviewUtility(null)
    }}
    onConfirm={confirmNewRun}
  />

  if (shellState.kind === 'ready') return <>
    {newRunSaveFailed && <p className="persistence-feedback" role="alert">
      保存失败：新一局已在当前会话中建立，请勿刷新页面。刷新后可能恢复此前的终止摘要或无存档状态。
      <button type="button" onClick={() => setNewRunSaveFailed(false)}>关闭提示</button>
    </p>}
    <StableRunUiApp
      store={shellState.store}
      presentationDependencies={presentationDependencies}
      onRequestNewRunSetup={() => {
        if (shellState.store.getState().phase.kind !== 'run-failure') return
        resetSetup()
        setShowFailureNewRunSetup(true)
      }}
    />
  </>

  const copy = loadErrorCopy(shellState)
  const retryLoad = () => {
    setClearFailed(false)
    setShellState(bootstrapProductionRun({ storage, rulesRegistry }))
  }
  const confirmClear = () => {
    const result = clearUnrecoverableRunSave(storage)
    setShowClearPreview(false)
    if (result.kind === 'cleared') {
      setClearFailed(false)
      setShellState(Object.freeze({ kind: 'no-run' }))
      return
    }
    setClearFailed(true)
  }

  return <main className="app-shell">
    <article className="status-card" aria-labelledby="load-error-heading">
      <p className="eyebrow">本局存档恢复</p>
      <h1 id="load-error-heading">{copy.heading}</h1>
      <p>{copy.detail}</p>
      {clearFailed && <p role="alert">存档清除失败，请稍后重新确认。</p>}
      {shellState.canClear
        ? <button type="button" onClick={() => {
            setClearFailed(false)
            setShowClearPreview(true)
          }}>清除无法恢复的存档</button>
        : <button type="button" onClick={retryLoad}>重新尝试读取</button>}
      {showClearPreview && shellState.canClear && <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-save-heading"
      >
        <h2 id="clear-save-heading">确认清除本局存档</h2>
        <p>该操作会删除当前无法恢复的本局存档，删除后无法恢复其中内容。</p>
        <button type="button" onClick={() => setShowClearPreview(false)}>取消</button>
        <button type="button" onClick={confirmClear}>确认清除</button>
      </section>}
    </article>
  </main>
}
