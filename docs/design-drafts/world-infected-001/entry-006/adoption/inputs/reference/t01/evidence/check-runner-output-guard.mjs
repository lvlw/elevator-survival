// Mainline path-predicate checks only; not the game, Vitest probes, or a browser test.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'../source/run-native-probes.mjs'),'utf8');
const line=source.split('\n').find(s=>s.startsWith('if(relative==='));
if (!line) throw new Error('Exact source predicate missing');
const result=[];
for (const [platform,p,root] of [['posix',path.posix,'/fixture/repo'],['win32',path.win32,'C:\\fixture\\repo']]) {
 const cases=[['repo root',root,true],['normal child',p.join(root,'out'),true],['dot-dot-prefixed child',p.join(root,'..probe'),true],['parent',p.dirname(root),false],['sibling',p.join(p.dirname(root),'evidence'),false],['same-prefix sibling',root+'-evidence',false]];
 for (const [name,out,shouldReject] of cases) {
  const relative=p.relative(root,out);let rejected=false;
  try {vm.runInNewContext(line,{relative,path:p,Error});}catch(e){if(e.message!=='Probe output must be outside repository')throw e;rejected=true;}
  result.push({platform,name,repo:root,out,relative,shouldReject,actualRejected:rejected,matched:rejected===shouldReject});
 }
}
const output={kind:'exact-source-path-predicate-only',not_executed:['native game probes','full runner filesystem and child-process execution','Windows OS execution','symlink resolution','browser IO'],total:result.length,matched:result.filter(r=>r.matched).length,mismatches:result.filter(r=>!r.matched).length,unexpectedExceptions:0,result};
fs.writeFileSync(path.join(here,'runner-guard-results.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
process.exitCode=output.mismatches?1:0;
