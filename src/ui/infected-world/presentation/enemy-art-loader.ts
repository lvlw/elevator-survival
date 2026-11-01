import { enemyArtStages, type EnemyArtGroup } from './approved-enemy-art'

export const ENEMY_ART_TIMEOUT_MS = 10_000
export type EnemyArtPreparation = Readonly<{ cancel(): void }>

/** One bounded generation. Cancellation prevents writeback; it cannot abort native decode/network. */
export function prepareEnemyArt(group: EnemyArtGroup, ready: () => void, failed: () => void): EnemyArtPreparation {
  let active = true, settled = false, completed = 0
  let images: HTMLImageElement[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  const detach = () => { clearTimeout(timer); for (const image of images) { image.onload = null; image.onerror = null } }
  const cancel = () => { active = false; detach(); images = [] }
  const fail = () => {
    if (!active || settled) return
    settled = true; detach(); images = []; failed()
  }
  timer = setTimeout(fail, ENEMY_ART_TIMEOUT_MS)
  if (typeof Image !== 'function') fail()
  else for (const stage of enemyArtStages) {
    if (!active || settled) break
    const member = group.stages[stage], image = new Image()
    images.push(image)
    if (typeof image.decode !== 'function') { fail(); break }
    let decoding = false
    const dimensionsMatch = () => image.naturalWidth === member.width && image.naturalHeight === member.height
    image.onerror = fail
    image.onload = () => {
      if (!active || settled || decoding) return
      if (!dimensionsMatch()) { fail(); return }
      decoding = true
      // Only native resource rejection becomes neutral; programming exceptions are not swallowed.
      image.decode().then(() => {
        if (!active || settled) return
        if (!dimensionsMatch()) { fail(); return }
        completed++
        if (completed === enemyArtStages.length) { settled = true; detach(); ready() }
      }, fail)
    }
    image.src = member.src
  }
  return Object.freeze({ cancel })
}
