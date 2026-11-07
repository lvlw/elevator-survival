import { useRef, useState } from 'react'
import type { BrowserOwner, BrowserControls } from '../../../app/infected-browser/types'
import type { PreplayResult } from '../../../app/infected-preplay/types'
import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import type { ClosureKey } from '../../../state/residence-session/narrative-closure/types'
import { closureCards, type ClosureCard } from '../../../content/infected-world-v0.1/narrative-closure/content'
type Selection = Readonly<{ key: ClosureKey; cards: readonly ClosureCard[]; controls: BrowserControls; view: PlayerReadyView; manual: boolean }>
export function useClosureStory(owner: BrowserOwner|null, controls: BrowserControls|null, view: PlayerReadyView|null, onError:(error:unknown)=>void) {
 const [selection,setSelection]=useState<Selection|null>(null)
 const live=useRef<Selection|null>(null), high=useRef(new WeakMap<object,number>())
 const usable=(s:Selection)=>owner?.controls()===s.controls&&controls===s.controls&&view===s.view
 const valid=selection&&usable(selection)?selection:null
 live.current=valid
 const cancel=()=>{live.current=null;setSelection(null)}
 const install=(key:ClosureKey,v:PlayerReadyView,c:BrowserControls,manual:boolean)=>{const s={key,cards:closureCards(key,v),controls:c,view:v,manual};live.current=s;setSelection(s)}
 function open(key:ClosureKey) {
  if(!view||!controls||owner?.controls()!==controls||!view.closure?.known.includes(key))return
  if(['HC06','HC07','HC08B'].includes(key)&&!view.closure.zhou)return
  if(key==='HC19')return // First installation feedback is never reconstructed from static results.
  install(key,view,controls,true)
 }
 function receive(result:PreplayResult,c:BrowserControls) {
  cancel()
  const token=result.closure,v=result.snapshot.view
  if(result.kind!=='committed'||!token||owner?.controls()!==c||owner.getSnapshot().preplay?.view!==v||v?.status!=='ready')return
  if((high.current.get(token.scope)??0)>=token.ordinal)return
  high.current.set(token.scope,token.ordinal)
  const key=token.receipt.story
  if(!v.closure?.known.includes(key))return
  if(token.receipt.kind==='install'&&(!v.closure.platform||v.point!=='stable-active'||!v.closure.transfer))return
  if(token.receipt.kind==='method'&&(!v.closure.zhou||v.point!=='stable-active'))return
  if(token.receipt.kind==='terminal'&&(!v.terminal.result||!['dead','living-hub'].includes(v.phase)))return
  install(key,v,c,false)
 }
 function acknowledge(state:'read'|'skipped'|'dismissed') {
  const s=live.current
  if(!s||s!==selection||!usable(s))return
  cancel();try{s.controls.acknowledgeReading([{key:s.key,state}])}catch(error){onError(error)}
 }
 return {selection:valid,open,receive,cancel,acknowledge}
}
