import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Qio discovers Gemini CLI and OpenCode from local history without claiming hook installation',()=>{
 const rust=readFileSync('src-tauri/src/lib.rs','utf8');
 assert.match(rust,/\("Gemini CLI","~\/\.gemini\/tmp","\.gemini\/tmp",None,None\)/);
 assert.match(rust,/\("OpenCode","~\/\.local\/share\/opencode\/storage","\.local\/share\/opencode\/storage",None,None\)/);
 assert.match(rust,/These are read-only history discovery for now/);
});
