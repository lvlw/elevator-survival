// TEST ONLY. Not imported by main/App; never use against an Owner profile.
import { createInfectedBrowserOwner } from '../../../../../../src/app/infected-browser/owner'
import { generateBrowserIdentity } from '../../../../../../src/app/infected-browser/identity-materials'
import { RESERVATION_KEY, CHECKPOINT_KEY } from '../../../../../../src/app/infected-browser/schema'
import { DEFAULT_BROWSER_RUN_SAVE_KEY } from '../../../../../../src/state/run-save/run-save-storage'
import { action, send, routeA, routeB, view, boundaryRecords } from './browser-cases'
const params=new URLSearchParams(location.search), seed=params.get('seed')
const faults={read:false,reservation:false,checkpoint:false}, events:unknown[]=[], io:{op:string;key:string}[]=[]
let entropy=0,presentation=0
const environment=()=>({secure:isSecureContext,locks:navigator.locks,storage:()=>({
  getItem:(key:string)=>{io.push({op:'read',key});if(faults.read)throw new Error('TEST injected read');return localStorage.getItem(key)},
  setItem:(key:string,text:string)=>{io.push({op:'write',key});if(key===RESERVATION_KEY&&faults.reservation||key===CHECKPOINT_KEY&&faults.checkpoint)throw new Error('TEST injected write');localStorage.setItem(key,text)},
}),entropy:()=>{entropy++;const m=generateBrowserIdentity();return seed?{...m,characterId:'E03-A-character',runId:'E03-A-execution',seed}:m},lifecycle:window})
const owner=createInfectedBrowserOwner({environment})
owner.subscribe(()=>{presentation++;document.querySelector('#state')!.textContent=JSON.stringify(owner.getSnapshot(),null,2)})
window.addEventListener('pagehide',e=>{events.push({kind:'pagehide',persisted:e.persisted});sessionStorage.setItem('browser-owner-TEST-lifecycle',JSON.stringify(events))})
window.addEventListener('pageshow',e=>{events.push({kind:'pageshow',persisted:e.persisted})})
let old:ReturnType<typeof owner.controls>=null,oldDraft:unknown=null,oldConfirmation:unknown=null
const api={
  acquire:()=>owner.acquire(), setup:()=>owner.controls()!.confirmSetup({tool:'crow',specialty:'engineer'}),
  snapshot:()=>owner.getSnapshot(), suspend:()=>owner.suspend(), dispose:()=>owner.dispose(),
  routeA:(stage:number,three=false)=>routeA(owner,stage,three),routeB:(stage:number)=>routeB(owner,stage),
  depart:()=>send(owner,'depart','进入封锁区'),move:(name:string)=>send(owner,'move',name),
  combat:(label:string)=>send(owner,'combat',label),
  retrySave:()=>owner.controls()!.retrySave(), retryRead:()=>owner.controls()!.retryRead(),
  counts:()=>({entropy,presentation,io:[...io],lifecycle:[...events],previousLifecycle:sessionStorage.getItem('browser-owner-TEST-lifecycle')}),
  faults:(patch:Partial<typeof faults>)=>Object.assign(faults,patch),
  capture:()=>{old=owner.controls();oldDraft=old!.beginDraft({action:action(owner,'move','大厅')});const r=old!.execute({action:action(owner,'terminal','失败止损返回')});oldConfirmation=r.confirmation;return r.kind},
  stale:()=>{const result:string[]=[];for(const op of [()=>old!.executeDraft(oldDraft as never),()=>old!.confirm(oldConfirmation as never),()=>old!.retrySave()])try{op();result.push('ACCEPTED')}catch(e){result.push((e as {code:string}).code??'ERROR')}return result},
  records:()=>({reservation:localStorage.getItem(RESERVATION_KEY),checkpoint:localStorage.getItem(CHECKPOINT_KEY)}),
  boundaryRecords,
  // Only exact TEST profile records; no production clear/reset API exists.
  clearTEST:()=>{owner.dispose();localStorage.removeItem(RESERVATION_KEY);localStorage.removeItem(CHECKPOINT_KEY)},
  putTEST:(records:{reservation:string|null;checkpoint:string|null})=>{owner.dispose();for(const [key,text]of [[RESERVATION_KEY,records.reservation],[CHECKPOINT_KEY,records.checkpoint]]){if(text===null)localStorage.removeItem(key!);else localStorage.setItem(key!,text!)}},
  sentinel:(value?:string)=>{const key=DEFAULT_BROWSER_RUN_SAVE_KEY;if(value!==undefined)localStorage.setItem(key,value);return localStorage.getItem(key)},
  readonly:()=>{const c=owner.controls()!,v=view(owner),request={action:action(owner,v.phase==='first-hub'?'depart':'move',v.phase==='first-hub'?'进入封锁区':'大厅')};const before=io.length;c.preview(request);c.beginDraft(request);c.cancel();return {ioDelta:io.length-before,snapshot:owner.getSnapshot()}},
}
Object.assign(window,{browserTest:api})
document.querySelector('#acquire')!.addEventListener('click',()=>void api.acquire())
document.querySelector('#setup')!.addEventListener('click',()=>api.setup())
document.querySelector('#release')!.addEventListener('click',()=>api.suspend())
