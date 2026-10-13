// TEST ONLY; common corpus declared before experiments, no seed removal.
export const defaultSeeds = Object.freeze(Array.from({ length: 8 }, (_, n) => 'E03-A-seed-' + String(n + 1).padStart(2, '0')))
export const tools = ['crow', 'lamp', 'toolbox'] as const
export const specialties = ['scout', 'engineer', 'survival'] as const
export const routeIds = ['route-hotel-bypass', 'route-hotel-benefit', 'route-segmented', 'route-toolbox'] as const
export type RouteId = typeof routeIds[number]
export const strategyVersion = 'E03-A-frozen-v1'
export const witnesses = [
  { route: 'route-hotel-bypass', seed: 'E03-A-seed-01', tool: 'crow', specialty: 'engineer' },
  { route: 'route-hotel-benefit', seed: 'E03-A-seed-04', tool: 'lamp', specialty: 'survival' },
  { route: 'route-segmented', seed: 'E03-A-seed-01', tool: 'crow', specialty: 'survival' },
  { route: 'route-toolbox', seed: 'E03-A-seed-01', tool: 'toolbox', specialty: 'engineer' },
] as const
