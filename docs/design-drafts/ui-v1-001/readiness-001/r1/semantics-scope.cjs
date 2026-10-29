/* Exact reversible text-only changes; all remaining prototype bytes must match baseline. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),cp=require('child_process');
const base='8ffe22616c68d806d7bda48d55e0adf6383765c4',file='docs/design-drafts/ui-v1-001/prototype/ui.js';
const old=cp.execFileSync('git',['show',base+':'+file],{encoding:'utf8'});
let current=fs.readFileSync(path.resolve(file),'utf8');
function undo(after,before){assert.equal(current.split(after).length-1,1,after);current=current.replace(after,before);}
undo("function presentText(text){return typeof Readiness==='undefined'?text:Readiness.text(text);}"+'\n','');
undo("f.textContent=presentText(text);","f.textContent=typeof Readiness==='undefined'?text:Readiness.text(text);");
const expressions=[
 "`${ITEMS[selectedObject.key][0]} · ${size[0]}×${size[1]} · 第${x+1}列，第${y+1}行 · ${valid?'有效位置':'越界或占用'}`",
 "'朝向已变，请重新明确完整占格位置。'",
 "'防御姿态 · 无敌人受击'",
 "verb==='hit-demo'?'通用命中FX · 无规则结算':'攻击演出示范 · 已结公开命中'",
 "STAGES[stage]",
 "'等待你的选择'"
];
for(const value of expressions)undo('.textContent=presentText('+value+');','.textContent='+value+';');
assert.equal(current,old);
console.log(JSON.stringify({kind:'EXACT_PROTOTYPE_SOURCE_COMPARISON',base,pass:true,allowed:'one exact pure text adapter plus seven exact textContent delegations; every remaining character identical'}));
