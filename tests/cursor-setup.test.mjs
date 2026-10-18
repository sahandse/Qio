import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

test('Cursor installer preserves existing hooks and is idempotent',()=>{
  const home=mkdtempSync(join(tmpdir(),'qio-cursor-'));
  const cursor=join(home,'.cursor');
  mkdirSync(cursor,{recursive:true});
  const settings=join(cursor,'hooks.json');
  writeFileSync(settings,JSON.stringify({version:1,hooks:{afterFileEdit:[{command:'existing-hook'}],customEvent:[{command:'keep-me'}]}}));
  const env={...process.env,HOME:home,USERPROFILE:home};
  try {
    for(let i=0;i<2;i++) {
      const result=spawnSync(process.execPath,[resolve('scripts/setup-cursor.mjs')],{cwd:process.cwd(),env,encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);
    }
    const config=JSON.parse(readFileSync(settings,'utf8'));
    assert.equal(config.hooks.customEvent[0].command,'keep-me');
    assert.equal(config.hooks.afterFileEdit.filter(item=>item.command.includes('--agent=Cursor')).length,1);
    assert.ok(config.hooks.sessionStart.some(item=>item.command.includes('qio-hook.mjs')));
    assert.ok(readdirSync(cursor).some(name=>name.startsWith('hooks.json.qio-backup-')));
  } finally {
    rmSync(home,{recursive:true,force:true});
  }
});
