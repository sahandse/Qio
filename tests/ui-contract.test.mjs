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

test('AI model picker discovers models from real endpoints and permits manual entry',()=>{
 const rust=readFileSync('src-tauri/src/lib.rs','utf8');
 const main=readFileSync('src/main.ts','utf8');
 assert.match(rust,/async fn ai_models\(provider:String\)/);
 assert.match(rust,/strip_suffix\("chat\/completions"\)/);
 assert.match(rust,/redirect\(reqwest::redirect::Policy::none\(\)\)/);
 assert.match(rust,/ai_providers,ai_models,ai_chat/);
 assert.match(main,/id="ai-models-refresh"/);
 assert.match(main,/list="ai-model-options"/);
 assert.match(main,/loadAIModels/);
});
