import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('agent activity indicator distinguishes live, recent and configured-only states',()=>{
 const ui=readFileSync('src/main.ts','utf8');
 const css=readFileSync('src/style.css','utf8');
 assert.match(ui,/s\.state==='active-event'\?'active'/);
 assert.match(ui,/s\.state==='recent-event'\?'recent'/);
 assert.match(css,/\.agent-led\.active/);
 assert.match(css,/\.agent-led\.recent/);
 assert.match(css,/\.agent-led\.configured/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('event status reads the log tail so long-running logs keep reporting current events',()=>{
 const rust=readFileSync('src-tauri/src/lib.rs','utf8');
 assert.match(rust,/MAX_TAIL_BYTES/);
 assert.match(rust,/SeekFrom::End/);
 assert.match(rust,/content\.lines\(\)\.rev\(\)/);
});
