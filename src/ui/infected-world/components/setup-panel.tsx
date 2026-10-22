import { useState } from 'react'
import type { BrowserSnapshot, SetupChoices } from '../../../app/infected-browser/types'
import { hubImage } from '../assets'
import { toolName, specialtyName } from '../labels'
import { infectedWorldUiCatalog } from '../../../content/infected-world-v0.1/player-ui-catalog'

export function SetupPanel({ setup, onConfirm }: { setup: NonNullable<BrowserSnapshot['setup']>;
  onConfirm: (choices: SetupChoices) => void }) {
  const [tool, setTool] = useState<SetupChoices['tool'] | null>(null)
  const [specialty, setSpecialty] = useState<SetupChoices['specialty'] | null>(null)
  const [submitted, setSubmitted] = useState(false)
  return <main className="iw-app iw-setup" style={{ backgroundImage: `linear-gradient(90deg, #10191de8, #10191d40), url(${hubImage})` }}>
    <section className="iw-setup-card">
      <p className="iw-eyebrow">独立 DEV 封闭首玩</p><h1>电梯求生</h1><h2>封锁区 · 出发准备</h2>
      <p>明确选择一件实用工具和一项专长。创建后选择锁定，不会自动出发。</p>
      <fieldset disabled={submitted}><legend>实用工具</legend><div className="iw-choice-grid">{setup.tools.map(value =>
        <label className={tool === value ? 'iw-choice iw-choice--selected' : 'iw-choice'} key={value}>
          <input type="radio" name="tool" value={value} checked={tool === value} onChange={() => setTool(value as SetupChoices['tool'])} />
          <span>{toolName(value)}<small>{infectedWorldUiCatalog.tools.find(row => row.value === value)?.description}</small></span></label>)}</div></fieldset>
      <fieldset disabled={submitted}><legend>专长</legend><div className="iw-choice-grid">{setup.specialties.map(value =>
        <label className={specialty === value ? 'iw-choice iw-choice--selected' : 'iw-choice'} key={value}>
          <input type="radio" name="specialty" value={value} checked={specialty === value} onChange={() => setSpecialty(value as SetupChoices['specialty'])} />
          <span>{specialtyName(value)}<small>{infectedWorldUiCatalog.specialties.find(row => row.value === value)?.description}</small></span></label>)}</div></fieldset>
      <button type="button" className="iw-primary" disabled={!tool || !specialty || submitted} onClick={() => {
        if (tool && specialty && !submitted) { setSubmitted(true); onConfirm({ tool, specialty }) }
      }}>确认创建</button>
      <p className="iw-muted">只使用本入口的独立存档；不读取或更改医院存档。此处不提供重置或迁移。</p>
    </section>
  </main>
}
