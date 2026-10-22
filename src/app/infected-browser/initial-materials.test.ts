import { expect, it } from 'vitest'
import { createReservation } from './reservation'
import { initialBrowserMaterials } from './initial-materials'
import { buildCombatSession } from '../../state/residence-session/combat-session'
import { createResidenceSessionDomain } from '../../state/residence-session/controlled'
it.each(['crow','lamp','toolbox'] as const)('real approved %s initialization derives body/config/mission and exactly four real initial instances',tool=>{
  const {reservation:r,composition:c}=createReservation({characterId:'initial-test',runId:'execution',seed:'seed',generation:'g'},{tool,specialty:'engineer'})
  const m=initialBrowserMaterials(r,c.dependencies),cfg=c.dependencies.supply.residence.configuration.config
  expect(m.character.body.energy).toBe(cfg.limits.energy);expect(m.character.body.condition.currentHealth).toBe(cfg.limits.hp)
  const s=buildCombatSession(createResidenceSessionDomain(),{policy:c.policy,startup:'first',storage:{read:()=>null,write:()=>{}},provideInitialMaterials:()=>m});s.bootstrap();s.createFirst()
  const v=s.getState().current!;expect(v.origins).toHaveLength(4);expect(v.carried.backpack.items).toEqual([])
  expect(v.carried.quickSlots.slots[0]?.quantity).toBe(1);expect(v.choices).toMatchObject({tool,specialty:'engineer'});expect(v.productions).toEqual([])
})
