import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
test('Claude permission hook falls back without a running Qio instance',()=>{
  const home=mkdtempSync(join(tmpdir(),'qio-approval-'));
  try{
    const env={...process.env,HOME:home,USERPROFILE:home};
    const input=JSON.stringify({hook_event_name:'PermissionRequest',tool_name:'Bash',tool_input:{command:'echo example'}});
    const run=spawnSync(process.execPath,[resolve('scripts/qio-approval-hook.mjs')],{input,env,encoding:'utf8',timeout:5000});
    assert.equal(run.status,0);
    assert.equal(run.stdout.trim(),'');
    assert.equal(existsSync(join(home,'.qio','approvals')),false);
  }finally{rmSync(home,{recursive:true,force:true})}
});
test('Qio test runner records the true exit status and never invents a pass',()=>{
 const home=mkdtempSync(join(tmpdir(),'qio-evidence-'));
 try{
  const env={...process.env,HOME:home,USERPROFILE:home};
  const runner=resolve('scripts/qio-test.mjs');
  const run=spawnSync(process.execPath,[runner,'--',process.execPath,'-e','process.exit(3)'],{env,encoding:'utf8'});
  assert.equal(run.status,3);
  const evidence=JSON.parse(readFileSync(join(home,'.qio','test-results.jsonl'),'utf8').trim());
  assert.equal(evidence.status,'failed');
  assert.equal(evidence.exit_code,3);
 }finally{rmSync(home,{recursive:true,force:true})}
});
