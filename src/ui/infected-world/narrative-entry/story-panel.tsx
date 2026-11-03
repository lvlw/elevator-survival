import type { BrowserControls } from '../../../app/infected-browser/types'
import type { PlayerReadyView } from '../../../state/residence-session/player-types'
import { storyTitles } from '../../../content/infected-world-v0.1/narrative-entry/content'
import type { useEntryStory } from './use-entry-story'

export function StoryPanel({ story, view, controls }: { story: ReturnType<typeof useEntryStory>; view: PlayerReadyView; controls: BrowserControls }) {
  const reading = controls.getReading()
  return <div className="iw-entry-story">
    {story.selection && <section className="iw-narrative" aria-label="当前叙事"><header><small>{story.selection.manual ? '记录回看' : '刚刚发生'}</small><strong>{storyTitles[story.selection.key]}</strong></header><p className="iw-story-copy">{story.selection.text}</p>
      <div className="iw-story-controls"><button onClick={() => story.acknowledge('read')}>读毕</button><button onClick={() => story.acknowledge('skipped')}>略过本段</button><button aria-label="收起叙事" onClick={() => story.acknowledge('dismissed')}>收起</button></div></section>}
    {view.phase !== 'dead' && view.phase !== 'living-hub' && <details className="iw-records"><summary>剧情记录</summary><nav aria-label="已知剧情记录">{view.narrative?.known.map(key => { const state = reading.marks.find(m => m.key === key)?.state; return <button key={key} onClick={() => story.open(key)}>{storyTitles[key]}<small>{state ? ({ read: '已读', skipped: '已略过', dismissed: '已收起' })[state] : '未读'}</small></button> })}</nav></details>}
    {reading.warning && <small className="iw-reading-warning" role="status">{reading.warning}</small>}
  </div>
}
