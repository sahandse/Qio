#!/usr/bin/env node
// Explicit opt-in: run manually to register Qio-only Claude hooks.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
const settings=join(homedir(),'.claude','settings.json');
const hook=resolve('scripts','qio-hook.mjs');
const events=['SessionStart','UserPromptSubmit','PreToolUse','PostToolUse','PostToolUseFailure','Stop','Notification','SubagentStart','SubagentStop'];
let existing={};
try{existing=JSON.parse(await readFile(settings,'utf8'))}catch(e){if(e?.code!=='ENOENT'){console.error('Cannot read or parse Claude settings; no changes made.');process.exit(1)}}
if(!existing||Array.isArray(existing)||typeof existing!=='object'){console.error('Invalid settings document.');process.exit(1)}
const clone=structuredClone(existing);
clone.hooks??={};
for(const event of events){
  const value=Array.isArray(clone.hooks[event])?clone.hooks[event]:[];
  const command='node '+JSON.stringify(hook);
  if(value.some(group=>Array.isArray(group.hooks)&&group.hooks.some(h=>h.command===command)))continue;
  value.push({hooks:[{type:'command',command,timeout:5,async:true}]});
  clone.hooks[event]=value;
}
const approval=resolve('scripts','qio-approval-hook.mjs');
const approvalCommand='node '+JSON.stringify(approval);
clone.hooks.PermissionRequest??=[];
if(!clone.hooks.PermissionRequest.some(group=>Array.isArray(group.hooks)&&group.hooks.some(h=>h.command===approvalCommand))){
 clone.hooks.PermissionRequest.push({hooks:[{type:'command',command:approvalCommand,timeout:25}]});
}
await mkdir(join(homedir(),'.claude'),{recursive:true});
try{await copyFile(settings,settings+'.qio-backup-'+Date.now())}catch(e){if(e?.code!=='ENOENT')throw e}
await writeFile(settings,JSON.stringify(clone,null,2)+'\n',{encoding:'utf8',mode:0o600});
console.log('Qio Claude Code hooks installed. Restart Claude Code.');
