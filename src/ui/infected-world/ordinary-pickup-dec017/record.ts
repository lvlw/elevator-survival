import { fullBagFixture } from './boundary-fixture'
import { createReservation } from '../../../app/infected-browser/reservation'
import { checkpointFor } from '../../../app/infected-browser/checkpoint'
import { readCombatValue } from '../../../core/residence-combat/validation'
import { expectation } from '../../../state/residence-save/combat-test-fixtures'
import { serializeCombatResidenceSave } from '../../../state/residence-save/combat-codec'

export function boundaryRecord() {
  const {reservation,composition}=createReservation({characterId:'dec017-browser',runId:'test-execution',seed:'combat-seed',generation:'dec017-browser'},{tool:'toolbox',specialty:'engineer'})
  const f=fullBagFixture(composition.dependencies.supply)
  const value=readCombatValue({...f.value,protocol:'residence-combat-pure-v1',battle:null,battles:[],combatDeaths:[]},composition.dependencies)
  const expected=expectation(value,composition.dependencies,{...reservation.execution,...reservation.choices})
  const checkpoint=checkpointFor(reservation,{expected,text:serializeCombatResidenceSave(value,expected,composition.policy)},composition)
  return {reservation,checkpoint,value,composition,food:f.food}
}
