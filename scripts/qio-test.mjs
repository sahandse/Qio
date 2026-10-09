#!/usr/bin/env node
// Explicit test command runner. Save actual exit status, not an AI claim.
// Usage: node scripts/qio-test.mjs -- npm test
import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir,appendFile} from 'node:fs/promises';
const args=process.argv.slice(2);
const sep=args.indexOf('--');
const command=(sep>=0?args.slice(sep+1):args);
if(command.length===0){console.error('Usage: node scripts/qio-test.mjs -- npm test');process.exit(2)}
const at=Date.now();
const child=spawn(command[0],command.slice(1),{shell:false,stdio:'inherit',windowsHide:false});
const code=await new Promise(resolve=>{
  child.once('error',()=>resolve(null));
  child.once('exit',(exit,signal)=>resolve(signal?null:exit));
});
const directory=join(homedir(),'.qio');
try{
  await mkdir(directory,{recursive:true,mode:0o700});
  await appendFile(join(directory,'test-results.jsonl'),JSON.stringify({
    at,cmd:command[0].slice(0,72),exit_code:code,
    status:code===0?'passed':code===null?'unclear':'failed',
    source:'qio-test-runner',note:'Exit status only; individual assertions and working tree freshness unverified'
  })+'\n',{mode:0o600});
}catch(error){console.error('Could not save evidence',error)}
process.exit(code===null?1:code);
