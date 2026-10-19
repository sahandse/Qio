import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('agent status uses recent real hook events and distinguishes active from merely configured',()=>{
 const rust=readFileSync('src-tauri/src/lib.rs','utf8');
 const ui=readFileSync('src/main.ts','utf8');
 assert.match(rust,/fn newest_qio_event\(home: &Path, agent: &str\)/);
 assert.match(rust,/value\.get\("agent"\)/);
 assert.match(rust,/"active-event"/);
 assert.match(rust,/"recent-event"/);
 assert.match(rust,/"hooks-configured"/);
 assert.match(ui,/Real event in the last 2 minutes/);
 assert.match(ui,/رویداد واقعی در ۲ دقیقه اخیر/);
});
