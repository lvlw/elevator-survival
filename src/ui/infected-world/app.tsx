import { useEffect, useRef, useState } from 'react'
import type { BrowserControls } from '../../app/infected-browser/types'
import { BrowserOwnerError } from '../../app/infected-browser/errors'
import { isPlayerBusinessError } from '../../state/residence-session/player-errors'
import type { PreplayConfirmation } from '../../app/infected-preplay/types'
import type { PlayerActionInputs, PlayerIntentMetadata } from '../../state/residence-session/player-preplay-types'
import type { PlayerAction, PlayerItem, PlayerRequest } from '../../state/residence-session/player-types'
import { useBrowserOwner, type OwnerFactory } from './use-browser-owner'
import { currentActions, requestStillVisible } from './interaction'
import { firstFit } from './first-fit'
import { GameShell } from './components/game-shell'
import { SetupPanel } from './components/setup-panel'
import { SystemScreen } from './components/system-screen'
import { ActionForm } from './components/action-form'
import { ConfirmationLayer } from './components/confirmation-layer'
import { ActionInformationProvider } from './components/action-information'
import { actionName, publicItemName } from './labels'
import { useCommittedPresentation } from './presentation/use-committed-presentation'
import { CommittedActionCue } from './components/committed-action-cue'
import { useClosureStory } from './narrative-closure/use-closure-story'
import { ClosurePanel } from './narrative-closure/closure-panel'
import { useEntryStory } from './narrative-entry/use-entry-story'
import { StoryPanel } from './narrative-entry/story-panel'
import { uniqueToolRequest } from './story-interaction/unique-tool'
import './styles.css'
import './ui-v1.css'

type Draft = Readonly<{ action: PlayerAction; inputs: PlayerActionInputs; controls: BrowserControls; item?: PlayerItem }>
type Confirmation = Readonly<{ token: PreplayConfirmation; request: PlayerRequest; title: string; metadata: PlayerIntentMetadata; controls: BrowserControls }>

export function InfectedWorldApp({ ownerFactory }: { ownerFactory?: OwnerFactory }) {
  const { owner, snapshot } = useBrowserOwner(ownerFactory)
  const [draft, setDraft] = useState<Draft | null>(null), [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [message, setMessage] = useState<string | null>(null), [fatal, setFatal] = useState(false)
  const singleFlight = useRef(false)
  useEffect(() => { document.documentElement.classList.add('iw-document'); return () => { document.documentElement.classList.remove('iw-document') } }, [])
  const view = snapshot.status === 'ready' && snapshot.preplay?.status === 'stable' && snapshot.preplay.view?.status === 'ready' ? snapshot.preplay.view : null
  const controls = owner?.controls() ?? null
  const presentation = useCommittedPresentation(owner, controls, snapshot, handleError)
  const story = useEntryStory(owner, controls, view, handleError)
  const closure = useClosureStory(owner, controls, view, handleError)
  const draftCurrent = draft && view && controls === draft.controls && currentActions(view).some(a => a.selector === draft.action.selector)
  const confirmationCurrent = confirmation && view && controls === confirmation.controls && requestStillVisible(view, confirmation.request)
  useEffect(() => {
    if (draft && !draftCurrent || confirmation && !confirmationCurrent) {
      setDraft(null); setConfirmation(null); setMessage('状态已变化，原选择已失效，请重新选择。')
    }
  }, [draft, draftCurrent, confirmation, confirmationCurrent])
  function handleError(error: unknown) {
    presentation.cancel()
    story.cancel(); closure.cancel()
    if (error instanceof BrowserOwnerError || isPlayerBusinessError(error)) { setDraft(null); setConfirmation(null); setMessage('当前上下文或选择已失效，请重新选择。') }
    else { setFatal(true); throw error }
  }
  function guarded(run: () => void) {
    if (singleFlight.current) return
    singleFlight.current = true
    try { run() } catch (error) { handleError(error) } finally { queueMicrotask(() => { singleFlight.current = false }) }
  }
  function execute(request: PlayerRequest, action: PlayerAction) {
    guarded(() => {
      if (!controls || !view || !requestStillVisible(view, request)) { setMessage('选择已失效，请重新选择。'); return }
      const metadata = controls.preview(request)
      const result = presentation.perform(() => controls.execute(request))
      story.receive(result, view, controls)
      closure.receive(result, controls)
      if (result.kind === 'confirmation-required' && result.confirmation) {
        const item = [...view.carried, ...view.ground].find(i => i.selector === request.item)
        setDraft(null); setConfirmation({ token: result.confirmation, request, metadata,
          title: actionName(action) + (item ? ' · ' + publicItemName(item.name) : ''), controls })
      } else {
        setDraft(null); setConfirmation(null)
        setMessage(result.closureDiagnostic ? '行动已生效，本次叙事反馈暂不可用；不会重发行动。' : result.kind === 'rejected' ? '当前不能执行此选择；未自动更换对象或重试。' : null)
      }
    })
  }
  function choose(action: PlayerAction, item?: PlayerItem) {
    if (singleFlight.current || !controls || !view) return
    try {
    story.cancel(); closure.cancel()
    setMessage(null)
    const inputs = controls.describeAction(action.selector)
    if (item && !inputs.items.some(candidate => candidate.selector === item.selector)) {
      setDraft(null); setConfirmation(null); setMessage('所选物品不适用于此操作或已失效，请重新选择。'); return
    }
    if (!inputs.fields.length) { execute({ action: action.selector }, action); return }
    const unique = uniqueToolRequest(action, inputs, item)
    if (unique) { execute(unique, action); return }
    if (inputs.convenience === 'ordinary-whole-pickup' && item?.ordinary && item.container === 'ground') {
      const placement = firstFit(view.backpack.width, view.backpack.height, { action: action.selector, item: item.selector }, controls.preview)
      if (placement) { execute({ action: action.selector, item: item.selector, placement }, action); return }
      setMessage('未找到合法未旋转位置，请手动选择位置或旋转。')
    }
    setConfirmation(null); setDraft({ action, inputs, controls, ...(item ? { item } : {}) })
    } catch (error) { handleError(error) }
  }
  if (fatal) return <main className="iw-app iw-system" role="alert"><h1>界面遇到程序异常</h1><p>操作结果可能已生效。已停止旧控件，请保留当前页面并反馈；不会自动重发行动。</p></main>
  if (snapshot.status === 'setup' && snapshot.setup) return <SetupPanel setup={snapshot.setup} onConfirm={(choices, marks) => guarded(() => {
    const current = owner?.controls()
    current?.confirmSetup(choices)
    if (owner?.getSnapshot().status === 'ready') current?.acknowledgeReading(marks)
  })} />
  if (!view || !controls) return <SystemScreen snapshot={snapshot}
    onAcquire={() => { setDraft(null); setConfirmation(null); setMessage(null); void owner?.acquire() }}
    onRetryRead={() => guarded(() => { owner?.controls()?.retryRead() })}
    onSynchronize={() => guarded(() => { owner?.controls()?.synchronize() })} />
  return <div className="iw-app" onClickCapture={event => {
    if (event.target instanceof Element && event.target.closest('button') && !event.target.closest('.iw-entry-story')) { story.cancel(); closure.cancel() }
    if (event.detail > 1) { event.preventDefault(); event.stopPropagation() }
  }} onContextMenuCapture={()=>{story.cancel();closure.cancel()}}><ActionInformationProvider view={view} controls={controls}><GameShell view={view} feed={snapshot.preplay!.feed} onAction={choose} describeAction={controls.describeAction}
    narrative={!draftCurrent && !confirmationCurrent ? <>{!closure.selection&&<StoryPanel story={story} view={view} controls={controls} />}<ClosurePanel story={closure} view={view} onAction={choose}/></> : null}
    onRetrySave={() => guarded(() => { controls.retrySave() })}
    presentation={<CommittedActionCue cue={presentation.cue} reduced={presentation.reduced} localReduced={presentation.localReduced} inBattle={view.combat !== null}
      onReduce={presentation.setLocalReduced} onSkip={presentation.skip} />}>
    {(message || snapshot.preplay?.error) && <div className="iw-feedback" role="alert">{message ?? snapshot.preplay?.error?.message}<button aria-label="关闭提示" onClick={() => setMessage(null)}>×</button></div>}
  </GameShell>
    {draft && draftCurrent && <ActionForm action={draft.action} inputs={draft.inputs} view={view} controls={controls} initialItem={draft.item}
      onExecute={request => execute(request, draft.action)} onCancel={() => guarded(() => { controls.cancel(); setDraft(null) })} />}
    {confirmation && confirmationCurrent && <ConfirmationLayer title={confirmation.title} metadata={confirmation.metadata}
      onCancel={() => guarded(() => { controls.cancel(); setConfirmation(null) })} onConfirm={() => guarded(() => {
        const current = owner?.controls()
        if (current !== confirmation.controls) { setConfirmation(null); setMessage('确认已失效，请重新选择。'); return }
        const result = presentation.perform(() => current.confirm(confirmation.token))
        story.receive(result, view, current)
        closure.receive(result, current)
        setConfirmation(null); setMessage(result.closureDiagnostic ? '行动已生效，本次叙事反馈暂不可用；不会重发行动。' : result.kind === 'rejected' ? '确认已失效或行动被拒绝，请重新选择。' : null)
      })} />}</ActionInformationProvider>
  </div>
}
