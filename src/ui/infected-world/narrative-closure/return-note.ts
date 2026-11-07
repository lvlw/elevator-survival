import type { PlayerReadyView, PlayerRequest } from '../../../state/residence-session/player-types'
import { closureCopy } from '../../../content/infected-world-v0.1/narrative-closure/content'
export function returnNote(view:PlayerReadyView,request:PlayerRequest):string {
 if(!view.closure?.returnPoint||!view.actions.some(a=>a.family==='terminal'&&a.selector===request.action))return ''
 const cards=view.terminal.eligibility.deliver?closureCopy.HC24.variants.eligible:closureCopy.HC24.variants['not-eligible']
 return cards[0].map(l=>l.text).join(' ')
}
