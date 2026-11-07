const fs=require('node:fs'),path=require('node:path');
const root=process.cwd();
const edit=(p,a,b,n)=>{const f=path.join(root,p),s=fs.readFileSync(f,'utf8');if(s.split(a).length-1!==n)throw Error('Unexpected source '+p);fs.writeFileSync(f,s.split(a).join(b))};
edit('src/state/residence-session/player-opponent-compatibility.test.ts','const { narrative: _entry, ...legacy } = q','const { narrative: _entry, closure: _closure, ...legacy } = q',2);
edit('src/state/residence-session/player-motion-probe-fixtures.ts',"  expect(Object.keys(execution).sort()).toEqual(['committedAction', 'kind', 'preview', 'view'])","  // Only the new optional closure envelope is removed; the original exact key oracle is unchanged.\n  const { closure: _closure, closureDiagnostic: _closureDiagnostic, ...legacyExecution } = execution\n  expect(Object.keys(legacyExecution).sort()).toEqual(['committedAction', 'kind', 'preview', 'view'])",1);
console.log('Narrow legacy DTO/key compatibility adaptation: two query destructures and one directly referenced TEST-only helper.');
