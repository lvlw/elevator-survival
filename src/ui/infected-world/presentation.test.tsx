import { afterEach, describe, expect, it, vi } from 'vitest'
import { itemPlaceholder } from './assets'
import { mountUi } from './test-fixtures'

// Test-only source inspection. Vitest intentionally stubs CSS imports, including ?raw/?inline.
// Keep the browser project's dependency/type boundary unchanged.
const fileModule: string = 'node:fs'
const files: { readFileSync(path: string, encoding: 'utf8'): string } = await import(fileModule)
const stylesheet = files.readFileSync('src/ui/infected-world/styles.css', 'utf8')

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })

describe('infected-world local presentation contract', () => {
  it('missing art uses a neutral item placeholder and ordinary markup contains no hidden identities', async () => {
    const h = await mountUi('DOM-privacy-seed')
    try {
      await h.d.setup('crow', 'engineer'); await h.d.button('装备')
      const crow = [...h.host.querySelectorAll<HTMLButtonElement>('.iw-equipment .iw-item')].find(button => button.getAttribute('aria-label')?.startsWith('撬棍'))!
      expect(crow.querySelector('img')?.getAttribute('src')).toBe(itemPlaceholder)
      expect(crow.getAttribute('aria-label')).toContain('撬棍')
      expect(h.host.innerHTML).not.toMatch(/DOM-privacy-seed|E03-A-character|E03-A-execution|TEST-generation|runId|runSeed|executionId|instanceId|woundId|streamId|drawIndex|riskPercent|infectionProgress|pendingInfectionExposures/)
      expect(h.host.querySelector('[aria-label="行动记录"]')).not.toBeNull()
    } finally { await h.unmount() }
  })

  it('keeps narrow-screen reachability and visual hierarchy as a CSS contract, not a browser acceptance claim', () => {
    expect(stylesheet).toContain('@media (max-width: 780px)')
    expect(stylesheet).toMatch(/\.iw-game\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible/s)
    expect(stylesheet).toMatch(/\.iw-game-layout\s*\{[^}]*flex-direction:\s*column/s)
    expect(stylesheet).toContain('.iw-app :focus-visible')
    expect(stylesheet).toContain('.iw-context :focus-visible')
    expect(stylesheet).toMatch(/\.iw-feed\s*\{[^}]*min-height:\s*11\.5rem/s)
    expect(stylesheet).toContain('.iw-placement-grid .iw-selected-anchor')
    expect(stylesheet).toContain('.iw-placement-grid .iw-selected-footprint')
    expect(stylesheet).toContain('.iw-app ::-webkit-scrollbar-button')
    expect(stylesheet).not.toMatch(/(?:^|\n)(?:body|#root|:root)\s*\{/)
  })
})
