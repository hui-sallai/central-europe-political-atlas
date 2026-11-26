import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parserFixture } from '../fixtures/citation-interchange.mjs';

const pandoc = process.env.PANDOC || 'pandoc';
const bibtex = process.env.BIBTEX || 'bibtex';

test('classic BibTeX reads every entry, URL and access date with structural punctuation in imported fields', t => {
  const {bundle} = parserFixture();
  const expected = JSON.parse(bundle.cslJson);
  const dir = mkdtempSync(path.join(tmpdir(), 'atlas-bibliography-'));
  t.after(() => rmSync(dir, {recursive:true,force:true}));
  writeFileSync(path.join(dir,'input.bib'),bundle.bibtex);
  writeFileSync(path.join(dir,'probe.aux'),String.raw`\relax
\citation{*}
\bibdata{input}
\bibstyle{fields}
`);
  // A controlled .bst asks BibTeX to report fields. No .bbl is executed or passed to TeX.
  writeFileSync(path.join(dir,'fields.bst'),`ENTRY { title url urldate year author } {} {}
FUNCTION {misc} {}
READ
FUNCTION {emit}
{ cite$ write$ newline$
  type$ write$ newline$
  url write$ newline$
  urldate missing$ { "-" } { urldate } if$ write$ newline$
  title missing$ { "missing-title" } { "title" } if$ write$ newline$
  year missing$ { author missing$ { "no-issued-or-author" } { "unexpected-author" } if$ } { "unexpected-year" } if$ write$ newline$
}
ITERATE {emit}
`);
  execFileSync(bibtex, ['-terse','probe'], {cwd:dir, encoding:'utf8',
    env:{...process.env, BIBINPUTS:'.', BSTINPUTS:'.'}});
  const records = readFileSync(path.join(dir,'probe.bbl'),'utf8').trimEnd().split('\n');
  assert.equal(records.length,expected.length * 6);
  for (let i=0; i<records.length; i+=6) {
    const [key,entryType,url,accessed,title,fields] = records.slice(i,i+6);
    const item = expected.find(entry => entry.id === key);
    assert.ok(item, key);
    assert.equal(entryType,'misc');
    assert.equal(url,item.URL);
    assert.equal(accessed,item.accessed ? item.accessed['date-parts'][0].map((n,i) => String(n).padStart(i===0 ? 4 : 2,'0')).join('-') : '-');
    assert.equal(title,'title');
    assert.equal(fields,'no-issued-or-author');
  }
});

test('Pandoc bibliography readers import the actual BibTeX and CSL-JSON files', () => {
  const {bundle,url} = parserFixture();
  const sourceItems = JSON.parse(bundle.cslJson);
  for (const [format,input] of [['bibtex',bundle.bibtex], ['csljson',bundle.cslJson]]) {
    const imported = JSON.parse(execFileSync(pandoc, ['--from',format,'--to','csljson'],
      {input, encoding:'utf8', maxBuffer:1024 * 1024}));
    assert.deepEqual(imported.map(entry => entry.id).sort(),sourceItems.map(entry => entry.id).sort(), format);
    for (const entry of imported) {
      const item = sourceItems.find(item => item.id === entry.id);
      assert.equal(entry.URL,item.URL,format);
      assert.deepEqual(entry.accessed,item.accessed,format);
      assert.equal(entry.title,item.title,format);
      if (format === 'csljson') assert.equal(entry.note,item.note,format);
      assert.ok(!Object.hasOwn(entry,'issued') && !Object.hasOwn(entry,'author'));
      if (entry.URL === url) {
        assert.match(entry.title,/Árvíztűrő tükörfúrógép 中文/);
        assert.match(entry.title,/50% A&B/);
      }
    }
  }
});
