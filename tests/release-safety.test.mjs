import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('all app manifests use one version without changing it during feature work',()=>{
 const pkg=JSON.parse(readFileSync('package.json','utf8'));
 const tauri=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8'));
 const cargo=readFileSync('src-tauri/Cargo.toml','utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
 assert.ok(pkg.version,'package version is present');
 assert.equal(tauri.version,pkg.version,'Tauri version must match package.json');
 assert.equal(cargo,pkg.version,'Cargo version must match package.json');
});

test('main branch pushes cannot publish a release automatically',()=>{
 const workflow=readFileSync('.github/workflows/release-windows.yml','utf8');
 assert.match(workflow,/push:\s*\n\s*branches:\s*\[main\]/);
 assert.match(workflow,/A push to main is a CI build, not permission to publish a release/);
 assert.match(workflow,/should_release=false/);
 assert.match(workflow,/elif \[\[ "\$REF_TYPE" == "tag" \]\]/);
 assert.match(workflow,/EVENT_NAME" == "workflow_dispatch"/);
});
