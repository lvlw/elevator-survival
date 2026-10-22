// Isolated exact-source check. NOT native P/R/S, Zod, storage, or a playable route.
// The two reviewed module bodies are executed verbatim after type/import removal.
// External qualification, provenance, body, resource arithmetic, and draw ports are adapters.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integrity = [
  ['player-metadata.ts', 'c856591a43ac31d59ac5cd41ed2d820a2f01c718'],
  ['shared-actions.ts', 'e5a0d548f2867ddaa06b6ca4395a534f94ddcb62'],
];
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
};
function load(name, exported, dependencies) {
  const bytes = fs.readFileSync(path.join(root, 'source', name));
  const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(blob, integrity.find(([n]) => n === name)[1]);
  const js = stripTypeScriptTypes(bytes.toString('utf8'), { mode: 'strip' })
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*\n/gm, '')
    .replace(/^export\s+/gm, '');
  return new Function(...Object.keys(dependencies), js + `\nreturn ${exported};`)(...Object.values(dependencies));
}
const cases = [];
for (const method of ['cautious', 'direct']) for (const current of [12, 1, 0, null]) {
  const id = `${method}/coat-${current === null ? 'absent' : current}`;
  const calls = { resource: 0, draw: 0, body: 0, issue: 0, grant: 0 };
  const values = { 'sample.risks': [20,60], 'sample.coat_risks': [0,40], 'wear.tool': 1, unit: 1, 'sample.exposure': 1 };
  const coat = { instanceId: 'TEST-coat', definitionId: 'armor_heavy_coat', quantity: 1 };
  const v = deepFreeze({ character: { revision: 3, body: { condition: { currentHealth: 12 } } },
    carried: { equipment: { armor: current === null ? null : coat }, backpack: { items: [] }, quickSlots: { slots: [] } },
    itemStates: { states: current === null ? [] : [{ instanceId: coat.instanceId, resource: { kind: 'integrity', current } }] },
    witnesses: [] });
  const command = { kind: 'task', actionId: 'sample', expectedRevision: 3, method, placement: { x: 0,y: 0,rotated: false } };
  const tasks = { data: { actions: [{ id: 'sample', grant: 'sample', outputQuantity: 'unit' }], items: [{ alias: 'sample', id: 'sample-def' }], edges: [] } };
  const definitions = { sample: { name: '密封病原样本箱', width: 2,height: 2,unitWeight: 4 }, armor_heavy_coat: { name: '厚外套' } };
  const supply = { configuration: { values }, tasks,
    catalog: { physical: { get: key => key === 'sample-def' ? definitions.sample : definitions[key] } } };
  const unsupported = () => { throw new Error('Unused adapter invoked'); };
  const num = (c,key) => { assert.equal(typeof c.values[key], 'number'); return c.values[key]; };
  const payment = (state,n) => ({ allowed: state.resource.current > 0, kind: state.resource.kind,
    currentBefore: state.resource.current, requestedCost: n, consumed: Math.min(state.resource.current,n), currentAfter: Math.max(0,state.resource.current-n) });
  const metadata = load('player-metadata.ts','queryPlayerActionMetadata', {
    deepFreeze, restoreHealth: unsupported, previewCommittedResourceAction: payment, restoreItemResource: unsupported,
    carriedItems: c => [c.equipment.armor].filter(Boolean), numberValue: num, requireSupplyClinicalTarget: unsupported,
    supplyBandageRecovery: unsupported, maintenancePool: unsupported, playerCombatFacts: unsupported,
    projectCombat: unsupported, createCombatEnginePlayerPrimaryPlan: unsupported,
  });
  const producer = load('shared-actions.ts','planSharedTaskAction', {
    requireSupplyDomainAction: () => {}, consumeCommittedResource: (state,n) => {
      calls.resource++; const p = payment(state,n); assert.equal(p.allowed,true);
      return { state: { ...state, resource: { ...state.resource, current: p.currentAfter } } };
    }, ensure: (test,msg) => { if (!test) throw new Error(msg); }, numberValue: num,
    vectorValue: (c,key) => c.values[key], supplyBodyAction: (before,d,a,e,exposures) => {
      calls.body++; return { snapshot: { ...before.character, revision: before.character.revision + 1 }, steps: [], cost: e };
    }, supplyEnergyQuery: () => ({ canStart:true }), supplyPaidCost: (v,n) => n,
    createTaskCommand: r => r, assertTaskPrerequisites: unsupported, taskFact: unsupported, taskAlreadyProduced: unsupported,
    markSupplyProduction: value => value, grantSupplyTask: value => { calls.grant++; return { value, originId:'TEST-origin' }; },
    spendEquippedSupplyTool: unsupported, requireSupplyCard: unsupported, consumeSupplyRecipe: unsupported,
    materializeSupplySource: unsupported, drawSupplyInteger: () => { calls.draw++; return 100; },
    requireTaskSelection: () => {}, taskMethodCost: () => method === 'cautious' ? 10 : 6,
  });
  const before = JSON.stringify(v);
  const shown = metadata(v, { kind:'task',command }, { supply });
  assert.deepEqual(calls,{ resource:0,draw:0,body:0,issue:0,grant:0 });
  const next = producer(v,command,{ dependencies:supply,read:x=>x,issue:(before,after)=>{calls.issue++;return after;} });
  assert.equal(JSON.stringify(v),before);
  const actualAfter = next.itemStates.states[0]?.resource.current ?? null;
  const spent = current === null ? 0 : current - actualAfter;
  let match = true, message = null;
  try {
    assert.equal(shown.resources.length, spent > 0 ? 1 : 0, 'preview must disclose the committed source branch resource charge');
    if (spent > 0) assert.deepEqual(shown.resources[0],{name:'厚外套',kind:'integrity',before:current,requested:1,consumed:spent,after:actualAfter});
  } catch(e) { if (!(e instanceof assert.AssertionError)) throw e; match = false; message = e.message; }
  cases.push({id,method,before:current,after:actualAfter,actual_source_resource_calls:calls.resource,
    displayed_resources:shown.resources,query_gameplay_calls:0,input_unchanged:true,match,message});
}
const report = {task:'cc147cd sample-payment review',kind:'isolated-exact-source-not-native',runtime:process.version,
  total:cases.length,matches:cases.filter(c=>c.match).length,mismatches:cases.filter(c=>!c.match).length,
  unexpected_exceptions:0,cases,limitations:[
    'External qualification/provenance/body/resource arithmetic/draw are explicit TEST adapters.',
    'No actual CombatValue aggregation, native CTB route, facade, S, save, or browser run.',
    'Current values 12/1/0 and absent coat are clipped TEST inputs, not proof of all native-route reachability.',
    'Only exact original metadata and shared task branch bodies are executed.'
  ]};
console.log(JSON.stringify(report,null,2));
process.exitCode = report.mismatches ? 1 : 0;
