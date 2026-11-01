import { useCallback, useRef } from 'react'
import type { PlayerOpponentPresentation } from '../../../state/residence-session/player-types'
import { isEnemyArtStage, selectEnemyArt } from '../presentation/approved-enemy-art'
import { useEnemyArt } from '../presentation/use-enemy-art'

export function EnemyArt({ opponent, stage, stageText }: { opponent: PlayerOpponentPresentation; stage: unknown; stageText: string }) {
  const { prepared, failDisplay } = useEnemyArt(selectEnemyArt(opponent, stage))
  const member = prepared && isEnemyArtStage(stage) ? prepared.group.stages[stage] : null
  const displayed = useRef<HTMLImageElement | null>(null)
  const bindImage = useCallback((node: HTMLImageElement | null) => {
    if (displayed.current) displayed.current.onerror = null
    displayed.current = node
    if (node) node.onerror = () => { if (displayed.current === node) failDisplay() }
  }, [prepared, member, failDisplay])
  if (!member) return <div className="iw-actor-placeholder iw-actor-placeholder--enemy" role="img" aria-label={opponent.name + '中性占位'}>{opponent.name}<br />{stageText}</div>
  return <div className="iw-enemy-art-frame" role="img" aria-label={opponent.name + ' · ' + stageText}>
    <img key={member.src} ref={bindImage} className="iw-enemy-art-raster" src={member.src} alt="" draggable={false}
      style={{ left: member.placement.left + '%', top: member.placement.top + '%', width: member.placement.width + '%' }} />
  </div>
}
