import { useState } from 'react'
import { ActionButton } from '../components/action-information'
import type { PlayerReadyView,PlayerAction } from '../../../state/residence-session/player-types'
import type { useClosureStory } from './use-closure-story'
import type { ClosureKey } from '../../../state/residence-session/narrative-closure/types'
import { closureCopy } from '../../../content/infected-world-v0.1/narrative-closure/content'
type Story=ReturnType<typeof useClosureStory>
function Cards({story}:{story:Story}) {
 const s=story.selection!,[page,setPage]=useState(0)
 return <section className="iw-narrative iw-closure-card" aria-label="医院叙事"><header><strong>{s.key==='HC19'?'接驳端的回应':closureCopy[s.key].title}</strong><small>{page+1} / {s.cards.length}</small></header><div className="iw-story-copy">{s.cards[page].map(line=><p key={line.id}><small>{line.speaker}</small> {line.text}</p>)}</div><div className="iw-story-controls">{page<s.cards.length-1?<button onClick={()=>setPage(p=>p+1)}>继续交谈</button>:<button onClick={()=>story.acknowledge('read')}>读毕</button>}<button className="iw-secondary" onClick={()=>story.acknowledge('skipped')}>略过本段</button><button className="iw-secondary" onClick={()=>story.acknowledge('dismissed')}>结束谈话</button></div></section>
}
export function ClosurePanel({story,view,onAction}:{story:Story;view:PlayerReadyView;onAction:(action:PlayerAction)=>void}) {
 const result=view.terminal.result
 const terminalKey:ClosureKey|null=result?({success:'HC25','voluntary-failure':'HC26','deadline-failure':'HC28',death:'HC29'} as const)[result.outcome]:null
 const k=view.closure, method=view.tasks.choices.find(a=>a.label==='取得作业方法')
 return <div className="iw-entry-story iw-closure-story">
 {k?.zhou&&<nav className="iw-closure-topics" aria-label="周衡会面"><strong>工作台旁 · 周衡</strong><button onClick={()=>story.open('HC06')}>与周衡交谈</button><button onClick={()=>story.open('HC07')}>谈停运</button><button onClick={()=>story.open('HC08B')}>后来还试过什么</button>{method&&<ActionButton action={method} onAction={()=>onAction(method)}>核对处理办法</ActionButton>}</nav>}
 {terminalKey&&<div className="iw-closure-ending" aria-label="医院收束"><button onClick={()=>story.open(terminalKey)}>查看本次收束</button><span>{view.phase==='dead'?closureCopy.HC30.variants.dead[0][0].text:closureCopy.HC30.variants.living[0][0].text}</span>{result?.outcome==='success'&&<details><summary>通路重新用了</summary>{closureCopy.HC25B.variants.neutral[0].map(l=><p key={l.id}>{l.speaker} {l.text}</p>)}</details>}</div>}
 {story.selection&&<Cards key={`${story.selection.key}:${story.selection.manual}:${story.selection.cards.map(c=>c[0].id).join()}`} story={story}/>}
 </div>
}
