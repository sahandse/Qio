import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('agent dashboard has distinct icons for the added local history sources',()=>{
 const ui=readFileSync('src/main.ts','utf8');
 assert.match(ui,/name==='Gemini CLI'\?'✧'/);
 assert.match(ui,/name==='OpenCode'\?'⌘'/);
});
