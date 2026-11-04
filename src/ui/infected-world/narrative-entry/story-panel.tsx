import { useState } from 'react'
import type { BrowserControls } from '../../../app/infected-browser/types'
import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { storyTitles } from '../../../content/infected-world-v0.1/narrative-entry/content'
import type { useEntryStory } from './use-entry-story'
type Story = ReturnType<typeof useEntryStory>
function CurrentStory({ entry, acknowledge }: { entry: NonNullable<Story['selection']>; acknowledge: Story['acknowledge'] }) {
  const [page, setPage] = useState(0)
  const lines = entry.text.split('\n'), important = entry.key === 'H07' && !entry.manual
  const light = !entry.manual && ['H03','H04','H05'].includes(entry.key)
  const cards = important ? [lines[0], lines.slice(1,3).join('\n'), lines.slice(3).join('\n')] : [entry.text]
  const speaker = entry.manual ? '记录回看' : important ? ['旁白','停用工单','玩家'][page] : entry.key === 'H02' ? '广播与观察' : '旁白'
  return <section className="iw-narrative" data-light={light} aria-label="当前叙事"><header><small>{speaker}</small><strong>{storyTitles[entry.key]}</strong>{important && <small>{page+1} / {cards.length}</small>}</header><p className="iw-story-copy">{cards[page]}</p>
    {light ? <button aria-label="收起叙事" onClick={() => acknowledge('dismissed')}>×</button> : <div className="iw-story-controls">{page < cards.length-1 ? <button onClick={() => setPage(p=>p+1)}>继续</button> : <button onClick={() => acknowledge(entry.manual ? 'dismissed' : 'read')}>{entry.manual ? '关闭记录' : '读毕'}</button>}{!entry.manual && <button className="iw-secondary" onClick={() => acknowledge('skipped')}>略过本段</button>}</div>}
  </section>
}
export function StoryPanel({ story, view, controls }: { story: Story; view: PlayerReadyView; controls: BrowserControls }) {
 const reading=controls.getReading(), entry=story.selection
 return <div className="iw-entry-story">{entry && <CurrentStory key={`${entry.key}:${entry.manual}:${entry.text}`} entry={entry} acknowledge={story.acknowledge} />}
 {view.phase!=='dead' && view.phase!=='living-hub' && <details className="iw-records"><summary>剧情记录</summary><nav aria-label="已知剧情记录">{view.narrative?.known.map(key=>{const state=reading.marks.find(m=>m.key===key)?.state;return <button key={key} onClick={()=>story.open(key)}>{storyTitles[key]}<small>{state?({read:'已读',skipped:'已略过',dismissed:'已收起'})[state]:'未读'}</small></button>})}</nav></details>}
 {reading.warning && <small className="iw-reading-warning" role="status">{reading.warning}</small>}</div>
}
