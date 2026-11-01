// TEST ONLY. Four semantic mutations of newly introduced C2 code/TEST copy; always restore bytes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
const root=fileURLToPath(new URL('../../../..',import.meta.url)), output=resolve(process.argv[2]);mkdirSync(output,{recursive:true})
const prefix='src/ui/infected-world/presentation/'
const cases=[
  {id:'M1-any-one-ready',file:'enemy-art-loader.ts',from:'completed === enemyArtStages.length',to:'completed === 1',test:'enemy-art-loader.test.ts',assert:'waits for all five'},
  {id:'M2-remove-current-key',file:'use-enemy-art.ts',from:' && state.generation.group === group',to:'',test:'use-enemy-art.test.tsx',assert:'T07'},
  {id:'M3-remove-generation-guard',file:'use-enemy-art.ts',from:'const isCurrent = () => generation.live && current.current === generation',to:'const isCurrent = () => true',test:'use-enemy-art.test.tsx',assert:'T08'},
  {id:'M4-corrupt-TEST-admission-copy',file:'approved-enemy-art.test.ts',from:'const approved = structuredClone(input)',to:"const approved = structuredClone(input); approved.assets[0].sha256 = '0'.repeat(64)",test:'approved-enemy-art.test.ts',assert:'approved PNG SHA-256 binding'},
]
const digest=b=>createHash('sha256').update(b).digest('hex'), results=[]
for(const c of cases){
  const path=resolve(root,prefix+c.file), before=readFileSync(path), text=before.toString('utf8')
  if(text.split(c.from).length!==2)throw Error('Nonunique mutation anchor '+c.id)
  let run
  try{writeFileSync(path,text.replace(c.from,c.to));run=spawnSync(process.execPath,[resolve(root,'node_modules/vitest/vitest.mjs'),'run',prefix+c.test],{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024})}
  finally{writeFileSync(path,before)}
  const log=(run.stdout??'')+(run.stderr??'');writeFileSync(resolve(output,c.id+'.log'),log)
  const row={id:c.id,exit:run.status,businessAssertionFound:log.includes(c.assert),restoredSHA256:digest(readFileSync(path)),originalSHA256:digest(before),signal:run.signal??null}
  results.push(row);writeFileSync(resolve(output,'negative-controls.json'),JSON.stringify(results,null,2))
  console.log(JSON.stringify(row))
  if(run.status!==1||!row.businessAssertionFound||row.originalSHA256!==row.restoredSHA256)throw Error('Negative control failed its evidence contract: '+c.id)
}
