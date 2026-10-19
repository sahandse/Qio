import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('large event log tail tolerates a seek beginning inside a UTF-8 character',()=>{
 const rust=readFileSync('src-tauri/src/lib.rs','utf8');
 assert.match(rust,/read_to_end\(&mut bytes\)/);
 assert.match(rust,/String::from_utf8_lossy\(&bytes\)/);
 assert.match(rust,/MAX_TAIL_BYTES/);
});
