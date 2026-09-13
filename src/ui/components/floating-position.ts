export interface FloatingRect {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

/** Presentation-only placement: prefer below, flip above/right, then shift into view. */
export function positionFloating(
  anchor: FloatingRect,
  size: Readonly<{ width: number; height: number }>,
  viewport: Readonly<{ width: number; height: number }>,
): Readonly<{ left: number; top: number }> {
  const margin = 8
  const gap = 10
  const left = anchor.left + size.width <= viewport.width - margin
    ? anchor.left
    : anchor.right - size.width
  const below = anchor.bottom + gap
  const above = anchor.top - size.height - gap
  const top = below + size.height <= viewport.height - margin || above < margin
    ? below
    : above
  return {
    left: Math.max(margin, Math.min(left, viewport.width - size.width - margin)),
    top: Math.max(margin, Math.min(top, viewport.height - size.height - margin)),
  }
}
