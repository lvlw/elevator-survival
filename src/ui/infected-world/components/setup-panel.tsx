import { useState } from 'react'
import type { BrowserSnapshot, SetupChoices } from '../../../app/infected-browser/types'
import { hubImage, itemImage } from '../assets'
import { toolName, specialtyName } from '../labels'
import { infectedWorldUiCatalog } from '../../../content/infected-world-v0.1/player-ui-catalog'
import { Prologue } from '../narrative-entry/prologue'
import type { ReadingMark } from '../../../app/infected-browser/narrative-entry/reading'

export function SetupPanel({ setup, onConfirm }: { setup: NonNullable<BrowserSnapshot['setup']>;
  onConfirm: (choices: SetupChoices, marks: readonly ReadingMark[]) => void }) {
  const [prepared, setPrepared] = useState(false), [marks, setMarks] = useState<readonly ReadingMark[]>([])
  const [tool, setTool] = useState<SetupChoices['tool'] | null>(null)
  const [specialty, setSpecialty] = useState<SetupChoices['specialty'] | null>(null)
  const [p06Skipped, setP06Skipped] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  if (!prepared) return <Prologue onPrepare={pending => { setMarks(pending); setPrepared(true) }} />
  return <main className="iw-app iw-setup" style={{ backgroundImage: `linear-gradient(90deg, #10191de8, #10191d40), url(${hubImage})` }}>
    <section className="iw-setup-card iw-framed">
      <p className="iw-eyebrow">中枢 · 出发准备</p><h1>你能带走什么</h1>
      {!p06Skipped && <section className="iw-preparation-story" aria-label="补给柜"><p><small>旁白</small> 柜里放着一件厚外套、一截金属管和包好的绷带。另一层摆着三件工具。</p><p><small>中枢</small> 初始实用工具：限选一件。</p><div className="iw-issued-supplies">{['金属管','厚实外套','绷带'].map(name => <figure key={name}><img src={itemImage(name)} alt="" /><figcaption>{name}<small>规定初配 · 确定准备时发放</small></figcaption></figure>)}</div></section>}
      {!p06Skipped && <button className="iw-skip-story" onClick={() => setP06Skipped(true)}>略过准备叙事</button>}
      <p>明确选择一件实用工具和一项专长。创建后选择锁定，不会自动出发。</p>
      <fieldset disabled={submitted}><legend>柜里选一件 · 实用工具</legend><div className="iw-choice-grid">{setup.tools.map(value =>
        <label className={tool === value ? 'iw-choice iw-choice--selected' : 'iw-choice'} key={value}>
          <input type="radio" name="tool" value={value} checked={tool === value} onChange={() => setTool(value as SetupChoices['tool'])} />
          <img src={itemImage(toolName(value))} alt="" aria-hidden="true" onError={event => { event.currentTarget.hidden = true }} />
          <span>{toolName(value)}<small>{infectedWorldUiCatalog.tools.find(row => row.value === value)?.description}</small></span></label>)}</div></fieldset>
      {!p06Skipped && <p className="iw-habit-story">很多记忆仍然模糊。遇到麻烦时自己习惯先做什么，你倒还记得。</p>}<fieldset disabled={submitted}><legend>生前的习惯 · 专长</legend><div className="iw-choice-grid">{setup.specialties.map(value =>
        <label className={specialty === value ? 'iw-choice iw-choice--selected' : 'iw-choice'} key={value}>
          <input type="radio" name="specialty" value={value} checked={specialty === value} onChange={() => setSpecialty(value as SetupChoices['specialty'])} />
          <span>{specialtyName(value)}<small>{infectedWorldUiCatalog.specialties.find(row => row.value === value)?.description}</small></span></label>)}</div></fieldset>
      <button type="button" className="iw-primary" disabled={!tool || !specialty || submitted} onClick={() => {
        if (tool && specialty && !submitted) { setSubmitted(true); onConfirm({ tool, specialty }, [...marks, { key: 'P06', state: p06Skipped ? 'skipped' : 'read' }]) }
      }}>确定准备</button>
      <details className="iw-preparation-help"><summary>准备与保存说明</summary><p>准备确认后选择锁定；进入医院仍由你决定。尚未确定准备时，阅读位置仅在当前页面保留。此入口使用独立存档，不读取或迁移原医院存档。</p></details>
    </section>
  </main>
}
