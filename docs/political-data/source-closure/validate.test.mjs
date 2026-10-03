import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const validator=fileURLToPath(new URL('./validate.mjs',import.meta.url));
test('checkpoint integrity does not approve closure or production',()=>{
 const result=spawnSync(process.execPath,[validator,'--checkpoint'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout.trim());
 assert.equal(report.audit_complete,false);
 assert.equal(report.production_ready,0);
 assert.equal(report.elections_with_open_gates,28);
 assert.equal(report.germany_files_unchanged,38);
 assert.equal(report.countries_ready,0,'no country READY while mandatory gates are open');
 assert.equal(report.contact_packets,4);
 assert.ok(report.gate_checks>=48);
});
test('default closure gate fails while evidence and licences remain unresolved',()=>{
 const result=spawnSync(process.execPath,[validator],{encoding:'utf8'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/CLOSURE BLOCKED/);
});
