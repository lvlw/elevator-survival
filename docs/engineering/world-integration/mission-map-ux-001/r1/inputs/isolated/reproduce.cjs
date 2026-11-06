/** Mainline isolated component reproduction. Not a React DOM or native-game test.
 * Actual hash-bound component+projection execute; hooks/JSX and geometry are bounded test doubles.
 * Inputs are synthetic public DTOs modeling discovery-order insertion, not a claimed captured save.
 */
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
let hookValues=[],hookIndex=0,effects=[];
const hooks={useState(v){const i=hookIndex++;if(!(i in hookValues))hookValues[i]=v;return[hookValues[i],x=>hookValues[i]=typeof x==='function'?x(hookValues[i]):x]},useEffect(fn){effects.push(fn)}};
const jsx={jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key}),Fragment:Symbol('Fragment')};
const fakeGeometry={positions:names=>names.map((_,i)=>({x:55+(i%2)*140,y:32+Math.floor(i/2)*61})),corridor:()=> 'M 0 0 L 1 1'};
let projection;
function load(file){const code=fs.readFileSync(path.join(__dirname,'source',file),'utf8');const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const module={exports:{}};function req(s){if(s==='react')return hooks;if(s==='react/jsx-runtime')return jsx;if(s==='../map/projection')return projection;if(s==='../map/layout')return fakeGeometry;throw new Error('Unapproved import '+s)};vm.runInNewContext('(function(require,module,exports){'+compiled+'\n})',{console})(req,module,module.exports);return module.exports}
projection=load('projection.ts');const {KnowledgeMap}=load('knowledge-map.tsx');
const names={H0:'电梯前室',H1:'大厅',H2:'药房',H3:'保安室',H4:'隔离走廊',H6:'值班休息室',H7:'后勤控制间'};
const name=id=>'医院 / '+names[id];
const pairsBefore=[['H0','H1'],['H1','H2'],['H1','H3'],['H1','H7'],['H1','H4']];
const pairsAfter=[['H0','H1'],['H1','H2'],['H1','H3'],['H3','H6'],['H1','H7'],['H1','H4'],['H3','H4']];
function makeMap(pairs,current){const known=[...new Set(pairs.flat())];return {nodes:known.map(id=>({name:names[id],place:'医院',visited:['H0','H1',current].includes(id),current:id===current})),routes:pairs.flatMap(([a,b])=>[[a,b],[b,a]].map(([x,y])=>({from:name(x),to:name(y),observation:x===current?'current':'last-observed',passable:x==='H1'&&y==='H4'?false:true})))}}
let scope={anchor:'医院',world:false,place:'医院',selected:null};
function render(map){hookIndex=0;effects=[];const tree=KnowledgeMap({map,scope,onScope:s=>{scope=s}});effects.forEach(fn=>fn());return tree}
function all(t,out=[]){if(Array.isArray(t)){t.forEach(v=>all(v,out));return out}if(!t||typeof t!=='object')return out;out.push(t);all(t.props?.children,out);return out}
function text(t){if(Array.isArray(t))return t.map(text).join('');if(t===null||t===false||t===undefined)return '';if(typeof t!=='object')return String(t);return text(t.props.children)}
const before=makeMap(pairsBefore,'H1'),after=makeMap(pairsAfter,'H3');
const first=render(before),link=all(first).find(n=>n.props.role==='button'&&n.props['aria-label']?.startsWith('查看联系')&&n.props['aria-label'].includes(name('H1'))&&n.props['aria-label'].includes(name('H7')));
assert(link,'actual room link handler exists');link.props.onClick();assert.equal(scope.selected,'routes:6,7');
const originalText=text(all(render(before)).find(n=>n.props.role==='status'));assert(originalText.includes('后勤控制间'));
const nextText=text(all(render(after)).find(n=>n.props.role==='status'));assert.equal(scope.selected,'routes:6,7');assert(nextText.includes('值班休息室'));assert(!nextText.includes('后勤控制间'));
// Sanity: the ORIGINAL route still exists, its indices simply changed to 8,9.
assert.equal(after.routes.findIndex(r=>r.from===name('H1')&&r.to===name('H7')),8);
const result={scope:'ISOLATED_HASH_BOUND_COMPONENT_AND_PROJECTION_NOT_REACT_DOM_OR_NATIVE_GAME',source_commit:'f75bbb0d16378b32b6f13d1e5de8cb0eeedc887c',inputs:'Synthetic public map DTOs, modeled on same-building knowledge expansion and catalog order',test_doubles:['React hook/JSX host','geometry only; no layout assertion'],result:'REPRODUCED: route detail silently changes its endpoints',selected_key:scope.selected,before:originalText,after:nextText,original_pair_still_present:true,after_original_indexes:[8,9],formal_dispatch:'NOT EXECUTED',full_test_suite:'NOT RUN',browser:'NOT RUN'};
fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
