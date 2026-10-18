#!/usr/bin/env node
// Explicit opt-in: install metadata-only Qio hooks in Cursor's user settings.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';

const root=join(homedir(),'.cursor');
const settings=join(root,'hooks.json');
const hook=resolve('scripts','qio-hook.mjs');
const events=['sessionStart','sessionEnd','beforeShellExecution','afterShellExecution','beforeMCPExecution','afterMCPExecution','afterFileEdit','beforeSubmitPrompt','preCompact','stop','beforeTabFileRead','afterTabFileEdit'];
let existing={version:1,hooks:{}};
try {
  existing=JSON.parse(await readFile(settings,'utf8'));
} catch(error) {
  if(error?.code!=='ENOENT') {
    console.error('Cannot read or parse Cursor hooks.json; no changes made.');
    process.exit(1);
  }
}
if(!existing||Array.isArray(existing)||typeof existing!=='object') {
  console.error('Invalid Cursor hooks document; no changes made.');
  process.exit(1);
}
const next=structuredClone(existing);
if(next.version!==undefined&&next.version!==1) {
  console.error('Unsupported Cursor hooks version; no changes made.');
  process.exit(1);
}
next.version=1;
next.hooks??={};
if(!next.hooks||Array.isArray(next.hooks)||typeof next.hooks!=='object') {
  console.error('Invalid hooks object; no changes made.');
  process.exit(1);
}
const quote=value=>'"'+value.replaceAll('\\','\\\\').replaceAll('"','\\"')+'"';
const command=quote(process.execPath)+' '+quote(hook)+' --agent=Cursor';
for(const event of events) {
  const list=Array.isArray(next.hooks[event])?next.hooks[event]:[];
  if(!list.some(item=>item&&typeof item.command==='string'&&item.command.includes('qio-hook.mjs')&&item.command.includes('--agent=Cursor'))) {
    list.push({command});
  }
  next.hooks[event]=list;
}
await mkdir(root,{recursive:true});
try {
  await copyFile(settings,settings+'.qio-backup-'+Date.now());
} catch(error) {
  if(error?.code!=='ENOENT') throw error;
}
await writeFile(settings,JSON.stringify(next,null,2)+'\\n',{encoding:'utf8',mode:0o600});
console.log('Qio Cursor hooks installed. Restart Cursor if events do not appear.');
console.log('Only event metadata is logged locally; prompts, shell commands, and file contents are not stored.');
