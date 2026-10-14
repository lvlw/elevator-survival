// Exact executeRoute and RouteConditionMissing AST selections, not an E03/P/R/S native run.
// Route execution, state and expect are explicit adapters. No runtime gameplay is evaluated.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ts=require(process.env.TYPESCRIPT_PATH||'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const input=path.resolve(process.argv[2]||path.join(__dirname,'../source/e03-test-routes.ts'));
const bytes=fs.readFileSync(input), text=bytes.toString('utf8');
const sha1=crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
if(sha1!=='0707d9784fef3da7ca0bdd4fa41bbf5517ab13fd')throw new Error('Wrong exact reviewed source');
const ast=ts.createSourceFile(input,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const selected=ast.statements.filter(n=>n.name&&['executeRoute','RouteConditionMissing'].includes(n.name.getText(ast)));
assert.equal(selected.length,2);
const selection=selected.map(n=>n.getText(ast)).join('\n');
const js=ts.transpileModule(selection,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const assertion=()=>new assert.AssertionError({message:'Injected failed observation after genuine-step boundary',actual:1,expected:2,operator:'strictEqual'});
const codeError=()=>Object.assign(new Error('Injected infrastructure fault'),{code:'EACCES'});
const cases=[
 {id:'C01-success',mode:'success',expected:'success'},
 {id:'C02-ordinary-death',mode:'death',expected:'death'},
 {id:'C03-declared-condition',mode:'missing',expected:'route-stopped'},
 {id:'C04-plain-alive',mode:'alive',error:()=>new Error('implementation'),expected:'THROWN_SAME'},
 {id:'C05-type-alive',mode:'alive',error:()=>new TypeError('implementation'),expected:'THROWN_SAME'},
 {id:'C06-range-dead',mode:'dead-error',error:()=>new RangeError('implementation'),expected:'THROWN_SAME'},
 {id:'C07-type-dead',mode:'dead-error',error:()=>new TypeError('implementation'),expected:'THROWN_SAME'},
 {id:'C08-primitive-dead',mode:'dead-error',error:()=>42,expected:'THROWN_SAME'},
 {id:'F02-assertion-alive',mode:'alive',error:assertion,expected:'THROWN_SAME'},
 {id:'F02-plain-dead',mode:'dead-error',error:()=>new Error('implementation'),expected:'THROWN_SAME'},
 {id:'F02-assertion-dead',mode:'dead-error',error:assertion,expected:'THROWN_SAME'},
 {id:'F02-coded-alive',mode:'alive',error:codeError,expected:'THROWN_SAME'},
 {id:'F02-coded-dead',mode:'dead-error',error:codeError,expected:'THROWN_SAME'},
 {id:'C09-syntax-alive',mode:'alive',error:()=>new SyntaxError('implementation'),expected:'THROWN_SAME'},
 {id:'F02-syntax-dead',mode:'dead-error',error:()=>new SyntaxError('implementation'),expected:'THROWN_SAME'},
 {id:'C10-range-alive',mode:'alive',error:()=>new RangeError('implementation'),expected:'THROWN_SAME'},
];
const rows=cases.map(row=>{
 const state={phase:'active-world',balance:0,receipts:[],dispositions:[],archives:[]};
 const h={current:()=>state,ledger:[{family:'createFirst',after:{phase:'first-hub'}},{family:'combat',after:{phase:'active-world'}}],storage:{write:{mock:{calls:[[],[]]}}},notify:{mock:{calls:[[],[]]}}};
 const e=row.error?row.error():undefined, exports={};
 const prefix=()=>{if(row.mode==='missing')throw new exports.RouteConditionMissing('HOTEL_CONDITION_MISSING')};
 const finish=()=>{
  if(row.mode==='success')Object.assign(state,{phase:'living-hub',balance:120,receipts:[{outcome:'success'}],dispositions:[{kind:'delivered',item:{definitionId:'sample'}}],archives:[{site:{enemies:[{id:'technician',state:{defeated:false}}]}}]});
  if(row.mode==='death'||row.mode==='dead-error')Object.assign(state,{phase:'dead',receipts:[{outcome:'death'}]});
  h.ledger[1].after={phase:state.phase};
  if(row.error)throw e;
 };
 const fakeExpect=x=>({toBe:y=>assert.equal(x,y)});
 new Function('exports','makeHarness','routePrefix','finishRoute','expect','aliasId',js)(exports,()=>h,prefix,finish,fakeExpect,()=>'sample');
 let actual,reason=null;
 try{actual=exports.executeRoute('TEST-seed','crow','engineer').result.outcome;}catch(caught){actual=caught===e?'THROWN_SAME':'UNEXPECTED_EXCEPTION';if(caught!==e)reason=String(caught?.stack||caught);}
 return{id:row.id,expected:row.expected,actual,matched:actual===row.expected,unexpected:actual==='UNEXPECTED_EXCEPTION',reason};
});
const report={scope:'ISOLATED exact executeRoute/RouteConditionMissing AST selections with explicit route/state/assertion adapters. Native P/R/S, actual seeds and full route suites NOT RUN.',commit:'2258e1bad17ffb03297b691be51bf9bfe5883979',source:{gitBlob:sha1,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),selectedNames:['RouteConditionMissing','executeRoute'],selectionSha256:crypto.createHash('sha256').update(selection).digest('hex')},rows,summary:{total:rows.length,matched:rows.filter(r=>r.matched).length,mismatched:rows.filter(r=>!r.matched).length,unexpectedExceptions:rows.filter(r=>r.unexpected).length}};
fs.writeFileSync(path.join(__dirname,'isolated-exception-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));process.exitCode=report.summary.mismatched?1:0;
