#!/usr/bin/env node
// Explicit opt-in: safely add Qio metadata-only hooks to Qoder settings.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
const settings=join(homedir(),'.qoder','settings.json');
const hook=resolve('scripts','qio-qoder-hook.mjs');
const events=['SessionStart','UserPromptSubmit','PreToolUse','PostToolUse','PostToolUseFailure','Stop','Notification','SubagentStart','SubagentStop','SessionEnd','PreCompact'];
let existing={};
try{existing=JSON.parse(await readFile(settings,'utf8'))}catch(e){if(e?.code!=='ENOENT'){console.error('Cannot read or parse Qoder settings; no changes made.');process.exit(1)}}
if(!existing||Array.isArray(existing)||typeof existing!=='object'){console.error('Invalid Qoder settings document.');process.exit(1)}
const clone=structuredClone(existing);clone.hooks??={};
if(!clone.hooks||Array.isArray(clone.hooks)||typeof clone.hooks!=='object'){console.error('Invalid hooks object; no changes made.');process.exit(1)}
const command='node '+JSON.stringify(hook);
for(const event of events){const value=Array.isArray(clone.hooks[event])?clone.hooks[event]:[];if(value.some(group=>Array.isArray(group.hooks)&&group.hooks.some(h=>h.command===command)))continue;value.push({hooks:[{type:'command',command,timeout:5,async:true}]});clone.hooks[event]=value;}
await mkdir(join(homedir(),'.qoder'),{recursive:true});
try{await copyFile(settings,settings+'.qio-backup-'+Date.now())}catch(e){if(e?.code!=='ENOENT')throw e}
await writeFile(settings,JSON.stringify(clone,null,2)+'\n',{encoding:'utf8',mode:0o600});
console.log('Qio Qoder hooks installed. Restart Qoder to activate event logging.');
