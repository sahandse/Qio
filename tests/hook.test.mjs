import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
function run(payload){
  const dir=mkdtempSync(join(tmpdir(),'qio-test-'));
  try{
    const env={...process.env,HOME:dir,USERPROFILE:dir,QIO_AGENT:'Claude Code'};
    const p=spawnSync(process.execPath,[resolve('scripts/qio-hook.mjs')],{input:JSON.stringify(payload),env,encoding:'utf8'});
    assert.equal(p.status,0);
    const path=join(dir,'.qio','events.jsonl');
    return existsSync(path)?JSON.parse(readFileSync(path,'utf8').trim()):null;
  }finally{rmSync(dir,{recursive:true,force:true})}
}
test('records session metadata only',()=>{
  const e=run({hook_event_name:'PreToolUse',tool_name:'Bash',tool_input:{command:'private command'},secret:'never save'});
  assert.equal(e.kind,'PreToolUse');
  assert.equal(e.agent,'Claude Code');
  assert.equal(e.tool,'Bash');
  assert.equal(e.test_status,'unverified');
  assert.ok(!('secret' in e));
  assert.ok(!('tool_input' in e));
});
test('accepts mapped generic agent events',()=>{
  const e=run({event:'tool.execute.after',message:'secret prompt'});
  assert.equal(e.kind,'PostToolUse');
  assert.ok(!('message' in e));
});
test('ignores unknown events',()=>assert.equal(run({hook_event_name:'UnknownEvent'}),null));
