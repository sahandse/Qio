import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mini view dimensions fit Tauri minimum window size',()=>{
  const conf=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8'));
  const main=conf.app.windows.find(w=>w.label==='main');
  assert.ok(main,'main window must exist');
  assert.ok(main.minWidth<=150,'mini width would be clamped');
  assert.ok(main.minHeight<=165,'mini height would be clamped');
  const rust=readFileSync('src-tauri/src/lib.rs','utf8');
  assert.match(rust,/if enabled\s*\{\s*\(150\.0,165\.0\)\s*\}/);
});
test('expanded and mini resize commands are registered',()=>{
  const rust=readFileSync('src-tauri/src/lib.rs','utf8');
  assert.match(rust,/generate_handler!\[[^\]]*set_island_expanded[^\]]*set_mini_mode/);
  const ui=readFileSync('src/main.ts','utf8');
  assert.match(ui,/invoke\('set_mini_mode'/);
  assert.match(ui,/invoke\('set_island_expanded'/);
});

test('visual agent list comes only from detected local sources',()=>{
 const ui=readFileSync('src/main.ts','utf8');
 assert.match(ui,/sources\.filter\(s=>s\.detected\)/);
 assert.doesNotMatch(ui,/const agents = \[/);
 assert.doesNotMatch(ui,/data-mood=/);
 assert.match(ui,/latestHook\(\)/);
});
test('chat rejects incomplete messages and settings contain real support link',()=>{
 const ui=readFileSync('src/main.ts','utf8');
 assert.match(ui,/if\(aiBusy\|\|!modelId\.trim\(\)\|\|!promptText\.trim\(\)/);
 assert.match(ui,/https:\/\/t\.me\/sahandse/);
});
