#!/usr/bin/env node
// Qio opt-in PermissionRequest hook for Claude Code.
// Qio never auto-approves. A user must explicitly choose Allow or Deny in the desktop UI.
// Timeout and startup errors deliberately defer to Claude Code's own permission dialog.
import {randomUUID} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
let raw='';
for await(const chunk of process.stdin){
  raw+=chunk.toString('utf8');
  if(raw.length>524288)process.exit(0);
}
let input;
try{input=JSON.parse(raw)}catch{process.exit(0)}
if(input?.hook_event_name!=='PermissionRequest')process.exit(0);
const id=randomUUID();
const root=join(homedir(),'.qio');
const dir=join(root,'approvals');
const pending=join(dir,id+'.request.json');
const answer=join(dir,id+'.answer.json');
const display=(value,max)=>String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,max);
const tool=display(input.tool_name,100);
const toolInput=input.tool_input??{};
const preview=display(toolInput.command??toolInput.file_path??toolInput.path??'',450);
// Only expose bounded Edit/Write content previews for explicit local review.
let diffPreview='';
if(input.tool_name==='Edit' && typeof toolInput.old_string==='string' && typeof toolInput.new_string==='string'){
 diffPreview='--- before\n'+display(toolInput.old_string,700)+'\n+++ after\n'+display(toolInput.new_string,700);
}else if(input.tool_name==='Write' && typeof toolInput.content==='string'){
 diffPreview='+++ new file content\n'+display(toolInput.content,1200);
}
diffPreview=display(diffPreview,1600);
try{
 const heartbeat=Number(await readFile(join(root,'heartbeat'),'utf8'));
 if(!Number.isFinite(heartbeat) || (Date.now()/1000-heartbeat)>25)process.exit(0);
 await mkdir(dir,{recursive:true,mode:0o700});
 await writeFile(pending,JSON.stringify({id,tool,preview,diff_preview:diffPreview||undefined,at:Date.now(),expires_at:Date.now()+20000})+'\n',{mode:0o600,flag:'wx'});
 for(let i=0;i<40;i++){
   await sleep(500);
   let decision;
   try{decision=JSON.parse(await readFile(answer,'utf8'))}catch{continue}
   if(decision?.id!==id || !['allow','deny'].includes(decision.decision))continue;
   console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'PermissionRequest',decision:decision.decision==='allow'?{behavior:'allow'}:{behavior:'deny',message:'کاربر این درخواست را در کیو رد کرد'}}}));
   break;
 }
} catch { /* Claude Code will show its default permission UI. */ }
finally {
 await Promise.allSettled([rm(pending,{force:true}),rm(answer,{force:true})]);
}
