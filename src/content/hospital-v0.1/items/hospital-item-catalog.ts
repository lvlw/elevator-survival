import { createItemCatalog } from '../../../core/inventory'
import { hospitalItemDefinitions } from './hospital-item-definitions'

export const hospitalItemCatalog = createItemCatalog(hospitalItemDefinitions)
