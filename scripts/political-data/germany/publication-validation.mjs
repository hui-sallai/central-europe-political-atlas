import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root} from './acquire.mjs';
import {buildApprovedProduction} from './production.mjs';
import {politicalExportFiles} from './export.mjs';
import {researchPackageFilename} from '../../release/research-package-name.mjs';

export function validatePoliticalPublication(){
  const expected=politicalExportFiles(buildApprovedProduction());
  assert.equal(Object.keys(expected).length,26);
  for(const [name,content] of Object.entries(expected)){
    for(const directory of ['public','out'])assert.equal(fs.readFileSync(path.join(root,directory,'research-data/political/germany',name),'utf8'),content,`${directory}: ${name}`);
  }
  for(const route of ['politics','en/politics'])assert.ok(fs.existsSync(path.join(root,'out',route,'index.html')),route);
  // Germany plus countries with an owner admission record; their exact hashes are checked by validate-package-contents.mjs.
  const admittedCountries=[...new Set(JSON.parse(fs.readFileSync(path.join(root,'docs/legal-security/political_admission_records.json'),'utf8')).admissions.filter(r=>r.status==='owner_approved').map(r=>r.country))];
  execFileSync('python3',['-c',`import sys,zipfile,pathlib
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
names=z.namelist(); assert len(names)==len(set(names))
political=[n for n in names if n.startswith('political/')]
directory=pathlib.Path(sys.argv[2]); expected=['political/'+c+'/'+p.name for c in sys.argv[3:] for p in (directory/c).iterdir() if p.is_file()]
assert sorted(political)==sorted(expected), political
for n in political: assert z.read(n)==(directory/pathlib.Path(n).relative_to('political')).read_bytes(), n
`,path.join(root,'out/research-data',researchPackageFilename()),path.join(root,'public/research-data/political'),'germany',...admittedCountries],{stdio:'pipe'});
  return {status:'pass',files:26,routes:2};
}
