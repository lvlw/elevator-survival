export {
  HOSPITAL_SLICE_RULES_VERSION,
  hospitalSliceV01RuleConfig,
} from './hospital-v0.1/rule-config'
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
