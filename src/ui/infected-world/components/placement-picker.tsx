import type { PlayerPlacement, PlayerReadyView } from '../../../state/residence-session/player-types'

export function PlacementPicker({ label, view, width, height, canRotate, value, onChange }: {
  label: string; view: PlayerReadyView; width: number; height: number; canRotate: boolean;
  value: PlayerPlacement | null; onChange: (value: PlayerPlacement) => void
}) {
  const rotated = value?.rotated ?? false, w = rotated ? height : width, h = rotated ? width : height
  return <fieldset className="iw-placement"><legend>{label} · {width}×{height}</legend>
    <p>明确选择左上锚点；最终空间与负重由正式预览判断。</p>
    <div role="grid" aria-label={`${label}放置网格`} className="iw-placement-grid" style={{ gridTemplateColumns: `repeat(${view.backpack.width},1fr)` }}>
      {Array.from({ length: view.backpack.width * view.backpack.height }, (_, n) => {
        const x = n % view.backpack.width, y = Math.floor(n / view.backpack.width)
        const occupied = view.carried.filter(i => i.footprint.some(c => c.x === x && c.y === y)).map(i => i.name).join('、')
        const selected = value && x >= value.x && x < value.x + w && y >= value.y && y < value.y + h
        return <button type="button" role="gridcell" key={n} aria-label={`锚点 ${x + 1},${y + 1}${occupied ? ` · ${occupied}` : ' · 空格'}`}
          aria-selected={!!selected} className={`${occupied ? 'iw-occupied' : ''} ${selected ? 'iw-selected-footprint' : ''} ${value?.x === x && value.y === y ? 'iw-selected-anchor' : ''}`}
          onClick={() => onChange({ x, y, rotated })}>{value?.x === x && value.y === y ? '◆' : occupied ? '▪' : '·'}</button>
      })}
    </div>
    {canRotate && <label><input type="checkbox" aria-label={`${label}旋转`} checked={rotated} onChange={e => {
      if (value) onChange({ ...value, rotated: e.target.checked })
    }} disabled={!value} />旋转90°</label>}
    <p>{value ? `锚点 ${value.x + 1},${value.y + 1} · ${rotated ? '旋转' : '未旋转'}` : '尚未选择位置'}</p>
  </fieldset>
}
