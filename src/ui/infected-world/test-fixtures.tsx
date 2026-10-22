// TEST ONLY. Real browser owner + formal P/R/S; injected ports are not real browser evidence.
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { vi } from 'vitest'
import { browserFixture } from '../../app/infected-browser/test-fixtures'
import type { BrowserOwner } from '../../app/infected-browser/types'
import type { PlayerReadyView } from '../../state/residence-session/player-types'
import { InfectedWorldApp } from './app'
import { createUiDriver } from './route-test-fixtures'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
export async function mountUi(seed='E03-A-seed-01', strict=false, beforeMount?: (fixture: ReturnType<typeof browserFixture>) => void) {
  const h=browserFixture(seed), owners:BrowserOwner[]=[], host=document.createElement('div');document.body.append(host)
  beforeMount?.(h)
  const factory=vi.fn(()=>{const o=h.make();owners.push(o);return o})
  let root:Root=createRoot(host)
  const render=async()=>{await act(async()=>{root.render(strict?<StrictMode><InfectedWorldApp ownerFactory={factory}/></StrictMode>:<InfectedWorldApp ownerFactory={factory}/>);await Promise.resolve()})}
  await render()
  const getView=()=>{const v=owners.at(-1)!.getSnapshot().preplay?.view;if(v?.status!=='ready')throw new Error('TEST UI not ready');return v as PlayerReadyView}
  const flush=async(action:()=>void)=>{await act(async()=>{action();await Promise.resolve()})}
  const d=createUiDriver({document,getView,flush})
  return {...h,host,factory,owners,d,view:getView,flush,render,
    owner:()=>owners.at(-1)!,
    unmount:async()=>{await act(async()=>root.unmount());host.remove();h.owner.dispose()},
    remount:async()=>{await act(async()=>root.unmount());await Promise.resolve();root=createRoot(host);await render()},
  }
}
