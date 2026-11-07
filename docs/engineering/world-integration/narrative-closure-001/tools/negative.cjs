const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.join(__dirname,'negative-snapshot'),npm='D:/develop/nodejs/node_modules/npm/bin/npm-cli.js';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');const results=[];
function run(name,file,change,test){const p=path.join(root,file),original=fs.readFileSync(p);try{
 const source=original.toString('utf8');const altered=change(source);if(source===altered)throw Error('Mutation missing '+name);fs.writeFileSync(p,altered);
 const r=cp.spawnSync('D:/develop/nodejs/node.exe',[npm,'run','test:run','--',test],{cwd:root,env:{...process.env,VITEST_MAX_WORKERS:'2'},encoding:'utf8',timeout:120000});const output=(r.stdout??'')+(r.stderr??'');fs.writeFileSync(path.join(__dirname,'negative-'+name+'.txt'),output);
 results.push({name,exit:r.status,assertionFailure:output.includes('AssertionError'),originalSha256:hash(original)});if(r.status!==1||!output.includes('AssertionError'))throw Error('Not a semantic negative '+name+' '+output.slice(-4000));
 }finally{fs.writeFileSync(p,original);if(hash(fs.readFileSync(p))!==hash(original))throw Error('Restore failed '+name)}}
run('query-replay','src/ui/infected-world/narrative-closure/use-closure-story.ts',s=>s.replace("import { useRef, useState }","import { useEffect, useRef, useState }").replace(' function open(key:ClosureKey)'," useEffect(()=>{if(view?.closure?.platform&&view.closure.transfer&&controls)install('HC19',view,controls,false)},[view])\n function open(key:ClosureKey)"),'src/ui/infected-world/narrative-closure/platform.test.tsx');
run('talk-commits','src/ui/infected-world/narrative-closure/closure-panel.tsx',s=>s.replace("onClick={()=>story.open('HC06')}","onClick={()=>{if(method)onAction(method);story.open('HC06')}}"),'src/ui/infected-world/narrative-closure/closure.test.tsx');
fs.writeFileSync(path.join(__dirname,'negative-results.json'),JSON.stringify({scope:'isolated final-source copy, not observed production defects',results,restored:true},null,2));console.log(JSON.stringify(results,null,2));
