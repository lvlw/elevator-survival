// Mainline isolated renderer probe, not React DOM or browser evidence.
// Executes exact source bytes after TypeScript transpilation. Imports/JSX/hooks are explicit test doubles.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repoRoot = path.resolve(process.argv[2] || process.cwd());
let ts;
try { ts = createRequire(path.join(repoRoot, 'package.json'))('typescript'); }
catch (error) { throw new Error('Run with the path of the exact baseline checkout; its existing TypeScript dependency is required.', {cause:error}); }
const sourcePaths = { 'game-shell.tsx': 'src/ui/infected-world/components/game-shell.tsx', 'knowledge-map.tsx': 'src/ui/infected-world/components/knowledge-map.tsx' };
function load(name, expected) {
  const source = fs.readFileSync(path.join(repoRoot, sourcePaths[name]));
  const hash = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${source.length}\0`), source])).digest('hex');
  assert.equal(hash, expected, 'Executed source must equal remote Git blob');
  const slots = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = {current: initial}; return slots[i]; },
    useEffect() { cursor++; },
  };
  const components = new Proxy({}, {get: (_, key) => key});
  const exports = {};
  const javascript = ts.transpileModule(source.toString(), { compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(javascript, {exports, require(id) {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { Fragment: 'Fragment', jsx:(type,props,key)=>({type,props,key}), jsxs:(type,props,key)=>({type,props,key}) };
    if (id === '../labels') return {publicItemName:x=>x, actionName:a=>a.label, toolName:x=>x,specialtyName:x=>x};
    return components;
  }, console, Map, Set, Math, window:{addEventListener(){},removeEventListener(){}}}, {filename:name});
  return {hash, render(exported, props) { cursor=0; return exports[exported](props); }};
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function texts(tree) {if (tree==null||tree===false)return '';if (Array.isArray(tree))return tree.map(texts).join('');return typeof tree === 'object' ? texts(tree.props?.children) : String(tree);}
const shell=load('game-shell.tsx','095c148aaa2797181501f4014c9ca6292f63b33d');
const view={point:'stable-active',phase:'active-world',location:{place:'医院',name:'药房'},first:{toolChoices:['crow'],specialtyChoices:['scout']},tasks:{publicObjectives:[],sample:'not-acquired'},actions:[{family:'medical',label:'药食',selector:{selection:'opaque'}}],map:{nodes:[],routes:[]},persistence:{feedback:'saved'}};
const args={view,feed:[],onAction(){throw Error('Display probe must never dispatch')},onRetrySave(){throw Error('Display probe must never save')},describeAction(){throw Error('Unexpected call')}};
let tree=shell.render('GameShell',args);
assert.equal(nodes(tree).filter(x=>x.type==='ContentLayer').length,0);
nodes(tree).find(x=>x.type==='button'&&texts(x)==='药食与维护').props.onClick();
tree=shell.render('GameShell',args);
assert.equal(nodes(tree).filter(x=>x.type==='ContentLayer'&&x.props.title==='药食与维护').length,1);
const beforeActions=nodes(tree).filter(x=>x.type==='ActionButton').length;
const dead={...view,point:'dead',phase:'dead',actions:[],tasks:{...view.tasks,sample:'unavailable'}};
tree=shell.render('GameShell',{...args,view:dead});
const stale=nodes(tree).filter(x=>x.type==='ContentLayer'&&x.props.title==='药食与维护');
const deadProbe={id:'R1-01',scope:'exact GameShell render with persistent hook-state test double; no native producer/browser',beforePoint:view.point,beforeUtilityActionCount:beforeActions,afterPoint:dead.point,terminalViewDeliveredToWorldStage:nodes(tree).find(x=>x.type==='WorldStage').props.view.point,remainingUtilityLayers:stale.length,remainingUtilityActions:stale.length?nodes(stale[0]).filter(x=>x.type==='ActionButton').length:0,expectedLayerCount:0,reproduced:stale.length===1};
assert.equal(deadProbe.reproduced,true);
stale[0].props.onClose();
assert.equal(nodes(shell.render('GameShell',{...args,view:dead})).filter(x=>x.type==='ContentLayer').length,0,'manual close still works: not a permanent deadlock');
const mapLoader=load('knowledge-map.tsx','e455e2443adc044ad399e0f5a99f9916807b3329');
const ambiguous={nodes:[{place:'测试公开区',name:'同名地点',current:true,visited:true},{place:'测试公开区',name:'同名地点',current:false,visited:false},{place:'测试公开区',name:'终点',current:false,visited:false}],routes:[{from:'测试公开区 / 同名地点',to:'测试公开区 / 终点',passable:true,observation:'current'}]};
let graph=mapLoader.render('KnowledgeMap',{map:ambiguous});
const edgeNodes=nodes(graph).filter(x=>x.props&&'data-map-route' in x.props);
const mapProbe={id:'R1-02',scope:'synthetic public-projection boundary; no claim current content contains duplicates',duplicatePublicName:'测试公开区 / 同名地点',emittedAmbiguousEdges:edgeNodes.length,ambiguousPath:edgeNodes[0]?.props.d,expectedEdges:0,textRouteRetained:texts(graph).includes('测试公开区 / 同名地点 → 测试公开区 / 终点'),reproduced:edgeNodes.length===1};
assert.equal(mapProbe.reproduced,true);
const unique={...ambiguous,nodes:[ambiguous.nodes[0],ambiguous.nodes[2]]};
graph=mapLoader.render('KnowledgeMap',{map:unique});
assert.equal(nodes(graph).filter(x=>x.props&&'data-map-route' in x.props).length,1,'unambiguous ordinary route remains valid');
const output={status:'TWO_FINDINGS_REPRODUCED',limitations:['Not actual React DOM','Not browser rendering','No game commands or persistence executed','Map ambiguity uses synthetic public data, not a claimed current map defect'],sources:{'game-shell.tsx':shell.hash,'knowledge-map.tsx':mapLoader.hash},findings:[deadProbe,mapProbe],positiveControls:['No utility modal on initial render','User opening produces one modal with one action','Manual close removes terminal leftover modal','Unambiguous map route still renders']};
fs.writeFileSync(path.join(__dirname,'independent-reproduction.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
