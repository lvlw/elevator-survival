import { createContext, useContext, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { actionImage, itemImage, itemPlaceholder, npcImage, sceneArt, type ActionGlyph, type SceneArt } from './assets'
import { publicItemName } from './labels'

export type StaticArt = Readonly<{ src: string }>
export type MotionArt = Readonly<{ src: string; staticSrc: string; frames: number; durationMs: number; loop: boolean }>
export type SlotArt = StaticArt | MotionArt
export type ArtOverrides = Readonly<{
  actions?: Partial<Record<ActionGlyph, SlotArt>>
  items?: Readonly<Record<string, SlotArt>>
  npc?: Partial<Record<'林岑' | '周衡', SlotArt>>
  scenes?: Readonly<Record<string, SceneArt>>
}>

const ArtContext = createContext<ArtOverrides>({})
/** Build-time/default assets and the isolated review share these presentation slots. */
export function ArtProvider({ overrides, children }: { overrides: ArtOverrides; children: ReactNode }) {
  return <ArtContext.Provider value={overrides}>{children}</ArtContext.Provider>
}

const motionQuery = '(prefers-reduced-motion: reduce)'
const media = () => globalThis.matchMedia?.(motionQuery)
function subscribeMotion(notify: () => void) {
  const query = media()
  query?.addEventListener?.('change', notify)
  return () => query?.removeEventListener?.('change', notify)
}
type PictureProps = Readonly<{ className?: string; alt?: string; style?: CSSProperties; fallback?: string }>
function Picture({ src, className, alt = '', style, fallback }: PictureProps & StaticArt) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback && fallback !== src ? <Picture key={fallback} src={fallback} className={className} alt={alt} style={style} /> : null
  return <img src={src} className={className} alt={alt} aria-hidden={alt === '' || undefined}
    style={style} onError={() => setFailed(true)} />
}
function MotionPicture({ art, ...props }: PictureProps & { art: MotionArt }) {
  const reduced = useSyncExternalStore(subscribeMotion, () => media()?.matches ?? false, () => true)
  const src = reduced ? art.staticSrc : art.src
  return <Picture key={src} src={src} {...props} fallback={reduced ? props.fallback : art.staticSrc} />
}
export function SlotPicture({ art, ...props }: PictureProps & { art: SlotArt | null }) {
  if (!art) return props.fallback ? <Picture key={props.fallback} src={props.fallback} {...props} /> : null
  return 'staticSrc' in art ? <MotionPicture key={art.src} art={art} {...props} />
    : <Picture key={art.src} src={art.src} {...props} />
}
export function ActionGlyphImage({ family }: { family: string }) {
  const { actions } = useContext(ArtContext)
  const src = actionImage(family)
  return src ? <SlotPicture className="iw-action-glyph" art={actions?.[family as ActionGlyph] ?? { src }} /> : null
}
export function ItemSlotPicture({ name, className }: { name: string; className?: string }) {
  const { items } = useContext(ArtContext)
  const src = itemImage(name)
  const key = publicItemName(name)
  const override = items && Object.hasOwn(items, key) ? items[key] : undefined
  return <SlotPicture className={className} art={src === itemPlaceholder ? null : override ?? { src }} fallback={itemPlaceholder} />
}
export function NpcSlotPicture({ name }: { name: string }) {
  const { npc } = useContext(ArtContext)
  const src = npcImage(name)
  return <SlotPicture alt={src ? name + ' · 当前公开互动' : ''} art={src ? npc?.[name as '林岑' | '周衡'] ?? { src } : null} />
}
export function useSceneSlot(location: Parameters<typeof sceneArt>[0], point: string) {
  const art = sceneArt(location, point)
  const { scenes } = useContext(ArtContext)
  return art && scenes && Object.hasOwn(scenes, art.key) ? scenes[art.key]! : art
}
export function SceneSlotPicture({ art, className }: { art: SceneArt | null; className: string }) {
  return <SlotPicture art={art} className={className} style={art ? {
    objectPosition: art.focal.map(value => value * 100 + '%').join(' '),
  } : undefined} />
}
