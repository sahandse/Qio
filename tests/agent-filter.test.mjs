import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('event dashboard filters can select Gemini CLI and OpenCode',()=>{
 const ui=readFileSync('src/main.ts','utf8');
 assert.match(ui,/value="Gemini CLI" \$\{eventFilter==='Gemini CLI'/);
 assert.match(ui,/value="OpenCode" \$\{eventFilter==='OpenCode'/);
});
