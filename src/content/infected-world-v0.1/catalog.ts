import { createLocationCatalog } from '../../core/residence-location/controlled'
import type { MissionDeclaration } from '../../core/mission-lifecycle'
import { numberValue, vectorValue } from '../../core/residence-supply/config'
import { createTaskCatalog } from '../../core/residence-task/catalog'
import { infectedWorldSupplyConfig as configuration } from './config'
import { infectedWorldSupplyContent } from './content'
import { buildInfectedSupplyItems } from './items'
import { buildInfectedSupplyEnemies } from './enemies'
import { infectedSupplyMission } from './identity'
export const infectedSupplyTasks = createTaskCatalog(infectedWorldSupplyContent, configuration)
export function createInfectedSupplyLocationCatalog(mission: MissionDeclaration = infectedSupplyMission) {
  const d = infectedSupplyTasks.data, c = configuration
  const directions = d.edges.flatMap(e => [0, 1].map(i => ({ id: e.id + (i === 0 ? ':forward' : ':reverse'),
    from: e.ends[i], to: e.ends[1 - i], cost: { kind: 'paid' as const, base: numberValue(c, e.cost), factors: [] },
    requiredFactIds: e.fact ? [e.fact] : [], requiredItemDefinitionId: e.item ? d.items.find(v => v.alias === e.item)!.id : null,
    arrival: { healthLoss: 0, exposuresAdded: 0 } })))
  const bands = c.values['load.bands']
  if (!Array.isArray(bands)) throw new Error('LOAD_BANDS')
  const band = (i: number) => { const row = bands[i]; if (!Array.isArray(row) || row.some(n => typeof n !== 'number')) throw new Error('LOAD_BAND')
    return { min: Number(row[0]), max: Number(row[1]), timeIncreasePercent: Number(row[2]) - 100 } }
  const [width, height] = vectorValue(c, 'grid', 2)
  return createLocationCatalog({ id: 'infected-supply:' + mission.commissionId, version: infectedSupplyTasks.contentId,
    mission, entryNodeId: d.goal.return,
    nodes: d.nodes.map(n => ({ id: n.id, name: n.name, placeId: n.map, rest: n.rest,
      surfaceEdgeIds: directions.filter(e => n.surfaceEdges.some(id => e.id === id + ':forward' || e.id === id + ':reverse')).map(e => e.id),
      surfaceSourceIds: [] })),
    edges: directions, sources: [],
    facts: [...new Set([...d.actions.flatMap(a => a.fact ? [a.fact] : []),
      ...d.enemies.map(e => 'enemy-' + e.id + '-cleared')])].map(id => ({ id, initial: false })),
    enemies: buildInfectedSupplyEnemies(c, infectedSupplyTasks), items: buildInfectedSupplyItems(c, infectedSupplyTasks),
    backpack: { width, height, quickSlotCount: numberValue(c, 'quick.slots'),
      weightBands: { normal: band(0), loaded: band(1), overloaded: band(2), cannotCarryFrom: band(2).max + 1 } } })
}
