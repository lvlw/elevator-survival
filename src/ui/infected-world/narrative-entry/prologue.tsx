import { useState } from 'react'
import { hubImage } from '../assets'
import { diary, entryBrief } from '../../../content/infected-world-v0.1/narrative-entry/content'
import type { ReadingMark } from '../../../app/infected-browser/narrative-entry/reading'

export function Prologue({ onPrepare }: { onPrepare(marks: readonly ReadingMark[]): void }) {
  const [page, setPage] = useState<'voice' | 'hub' | 'rest' | 'task'>('voice')
  const [display, setDisplay] = useState(false), [diaryPage, setDiaryPage] = useState<number | null>(null)
  const [marks, setMarks] = useState<ReadingMark[]>([])
  function mark(key: ReadingMark['key'], state: ReadingMark['state']) { setMarks(old => [...old.filter(m => m.key !== key), { key, state }]) }
  function skip() {
    setMarks(old => [...old, ...(['P01', 'P02', 'P03', 'P04'] as const).filter(key => !old.some(m => m.key === key)).map(key => ({ key, state: 'skipped' as const }))])
    setDiaryPage(null); setPage('task')
  }
  return <main className="iw-app iw-setup iw-prologue" style={{ backgroundImage: `linear-gradient(90deg, #10191df2, #10191d50), url(${hubImage})` }}>
    <section className="iw-setup-card iw-framed" aria-label="中枢序章"><p className="iw-eyebrow">电梯求生 · 首次接入</p>
      {diaryPage !== null ? <><h1>长椅上的本子</h1><p className="iw-story-copy">{diary[diaryPage]}</p><small>{diaryPage + 1} / {diary.length}</small><div className="iw-actions">
        {diaryPage > 0 && <button onClick={() => setDiaryPage(diaryPage - 1)}>上一页</button>}
        {diaryPage < diary.length - 1 ? <button onClick={() => setDiaryPage(diaryPage + 1)}>下一页</button> : <button onClick={() => { mark('P03', 'read'); setDiaryPage(null) }}>读完日记</button>}
        <button onClick={() => { mark('P03', 'dismissed'); setDiaryPage(null) }}>合上本子</button></div></> : page === 'voice' ? <><h1>“回来再说。”</h1><p>你记得，自己答应了。</p><p>后面的声音突然断了。</p><button onClick={() => { mark('P01', 'read'); setPage('hub') }}>睁开眼睛</button></> : page === 'hub' ? <><h1>没有楼层的电梯</h1><p>地面很冷。这里没有窗，显示屏上也没有楼层。</p>
        {display && <div className="iw-task-plate"><p>中枢接入完成。</p><p>“我怎么会在这里？我还能回去吗？”</p><p>返还原世界：需取得资格。首次任务将在准备结束后分配。</p><p>返还资格：未取得 · 首次任务：准备中</p></div>}
        <div className="iw-actions"><button onClick={() => { setDisplay(true); mark('P02', 'read') }}>查看显示屏</button><button onClick={() => setDiaryPage(0)}>看看长椅上的本子</button>{display && <button onClick={() => setPage('rest')}>靠墙休息</button>}</div></> : page === 'rest' ? <><h1>准备期结束</h1><p>你一直没等到窗外亮起来。这里没有窗。</p><p>再次睁眼时，电梯上方多了一行字。</p><p>准备期结束。首次任务已分配。</p><button onClick={() => { mark('P04', 'read'); setPage('task') }}>查看首次任务</button></> : <><h1>封锁区 · 未完成的转运</h1><div className="iw-task-plate"><h2>首次委托</h2><ol><li>恢复当地急救转运。</li><li>取得指定密封病原样本，携回医院电梯前室交付。</li></ol><p>驻留期限：{entryBrief.days} 个任务日 · 首次入场：医院电梯前室</p><p>完整履约奖励 {entryBrief.reward} 积分；失败收入为 0，最多扣除现有积分中的 {entryBrief.penalty} 积分，不负债。实际死亡结束这一角色的经历。</p><p>主动失败会关闭本委托；成功或失败正式结束后都不能重接同一委托；返回中枢不会自动治疗或补充物资。</p></div><p>“恢复一条通路，再带回一个箱子。先进去看看。”</p><button className="iw-primary" onClick={() => onPrepare([...marks.filter(m => m.key !== 'P05'), { key: 'P05', state: 'read' }])}>准备出发</button></>}
      {page !== 'task' && <button className="iw-skip-story" onClick={skip}>略过叙事，查看任务</button>}
      <p className="iw-muted">尚未创建角色。此处阅读位置仅在当前页面保留。</p>
    </section>
  </main>
}
