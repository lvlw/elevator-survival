export {
  HOSPITAL_SLICE_RULES_VERSION,
  hospitalSliceV01RuleConfig,
} from './hospital-v0.1/rule-config'
export {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_SLICE_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemEquipmentProfiles,
  hospitalItemQuickSlotCatalog,
  hospitalItemQuickSlotProfiles,
  hospitalItemResourceCatalog,
  hospitalItemResourceProfiles,
  hospitalItemSearchIlluminationCatalog,
  hospitalItemSearchIlluminationProfiles,
} from './hospital-v0.1/items'
export {
  HOSPITAL_INTEL_IDS,
  hospitalMainSearchCatalog,
  hospitalMainSearchDefinitions,
} from './hospital-v0.1/search'
export {
  HOSPITAL_EVENT_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_OBSTACLE_IDS,
  hospitalFireDoorDefinition,
  hospitalSceneEdgeAccessCatalog,
  hospitalSceneObstacleCatalog,
} from './hospital-v0.1/obstacles'
export {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_SECURITY_ROUTE_EDGE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-v0.1/hospital-scene-graph'
export {
  getRuleConfig,
  hasRuleConfig,
  listRuleConfigVersions,
  UnknownRulesVersionError,
} from './rule-config-registry'
