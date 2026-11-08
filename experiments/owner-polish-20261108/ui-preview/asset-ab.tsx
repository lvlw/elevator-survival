// TEST-only review. The two real presentation components receive the same candidate inputs for every mapping.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ActionButton } from '../../../src/ui/infected-world/components/action-information'
import { ArtProvider, NpcSlotPicture, ItemSlotPicture, type ArtOverrides } from '../../../src/ui/infected-world/asset-slots'
import type { PlayerAction } from '../../../src/state/residence-session/player-types'
import '../../../src/ui/infected-world/styles.css'
import '../../../src/ui/infected-world/ui-v1.css'
import glyph from '../assets/action-search-b.svg'
import portrait from '../assets/npc-lin-candidate.png'
import blink from '../assets/npc-lin-blink.gif'

const action: PlayerAction = { selector: Object.freeze({ selection: 'opaque' }), family: 'source',
  label: '药房搜索', method: null, availability: 'available', cost: 12 }
const mappings: Readonly<Record<string, ArtOverrides>> = {
  original: {},
  candidate: { actions: { source: { src: glyph } }, npc: { 林岑: { src: portrait } } },
  motion: { actions: { source: { src: glyph } }, npc: { 林岑: { src: blink, staticSrc: portrait, frames: 2, durationMs: 3000, loop: true } } },
  broken: { actions: { source: { src: 'data:image/png;base64,AAAA' } }, npc: { 林岑: { src: 'data:image/png;base64,AAAA' } } },
}
function Review() {
  const [mode, setMode] = useState('original'), [clicks, setClicks] = useState(0)
  return <main className="iw-app" style={{ minHeight: '100vh', padding: 32, background: '#142128' }}>
    <h1>同槽位资源替换 · 隔离审查</h1><p>使用正式展示组件和明确的候选状态。按钮仅记录本页点击次数。</p>
    <label>映射 <select value={mode} onChange={event => setMode(event.target.value)}>
      <option value="original">A 正式默认</option><option value="candidate">B 静态候选</option>
      <option value="motion">B 动态候选</option><option value="broken">损坏资源</option><option value="unknown">未知资源</option>
    </select></label>
    <ArtProvider overrides={mappings[mode] ?? {}}>
      <section style={{ display: 'grid', gridTemplateColumns: '240px 320px', gap: 24, marginTop: 24 }}>
        <div><ActionButton action={action} compactCost onAction={() => setClicks(n => n + 1)} />
          <p>候选命令意图 · 搜索 · 12 精力</p><output aria-label="测试点击次数">{clicks}</output>
          {mode === 'unknown' && <div style={{ width: 44, height: 44 }}><ItemSlotPicture name="未知资源" /></div>}</div>
        <figure className="iw-task-art iw-task-art--npc" style={{ width: 320, height: 420, margin: 0, background: '#263942' }}>
          <NpcSlotPicture name={mode === 'unknown' ? '未知人物' : '林岑'} /><figcaption>{mode === 'unknown' ? '当前人物' : '林岑'}</figcaption>
        </figure>
      </section>
    </ArtProvider>
  </main>
}
createRoot(document.getElementById('review')!).render(<Review />)
