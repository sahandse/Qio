#!/usr/bin/env node
// Qio local hook adapter. Reads an agent's JSON event from stdin and stores metadata only.
import {homedir} from 'node:os';
import {mkdir,appendFile} from 'node:fs/promises';
import {join} from 'node:path';
let raw='';
for await (const chunk of process.stdin) {
  raw+=chunk.toString('utf8');
  if(raw.length>524288)process.exit(0);
}
let input;
try {input=JSON.parse(raw)} catch {process.exit(0)}
if(!input||typeof input!=='object')process.exit(0);
const known = new Set(['SessionStart','UserPromptSubmit','PreToolUse','PostToolUse','PostToolUseFailure','Stop','SubagentStart','SubagentStop','Notification']);
const kind = typeof input.hook_event_name==='string' ? input.hook_event_name : String(input.event??input.type??'');
if(!known.has(kind))process.exit(0);
const agent=(process.env.QIO_AGENT??'Claude Code').slice(0,40);
const tool=typeof input.tool_name==='string'?input.tool_name.slice(0,64):'';
const entry=JSON.stringify({agent,kind,tool,at:Date.now(),test_status:'unverified'});
try {
 const directory=join(homedir(),'.qio');
 await mkdir(directory,{recursive:true,mode:0o700});
 await appendFile(join(directory,'events.jsonl'),entry+'\n',{encoding:'utf8',mode:0o600});
} catch { /* Hook must never block or crash the coding agent. */ }
