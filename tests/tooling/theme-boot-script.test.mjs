import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The theme boot script is rendered inside <head> by a server component. It must be a plain string module:
// imported from a "use client" module it becomes a client-chunk reference and hydration can fail (React #418).
test('the theme boot script comes from a plain module, not a client module', () => {
  const boot = fs.readFileSync('src/lib/themeBoot.ts', 'utf8');
  assert.doesNotMatch(boot, /^\s*["']use client["']/m);
  assert.match(boot, /export const themeBootScript = `/);
  const doc = fs.readFileSync('src/components/LocaleDocument.tsx', 'utf8');
  assert.match(doc, /import \{ themeBootScript \} from "@\/lib\/themeBoot";/);
  const toggle = fs.readFileSync('src/components/ThemeToggle.tsx', 'utf8');
  assert.doesNotMatch(toggle, /export const themeBootScript/);
  const key = (src) => src.match(/const KEY = "([^"]+)";/)?.[1];
  assert.equal(key(boot), 'atlas-theme');
  assert.equal(key(toggle), key(boot));
});
test('the exported HTML carries the boot script text, not a client reference', { skip: !fs.existsSync('out/en/index.html') }, () => {
  const html = fs.readFileSync('out/en/index.html', 'utf8');
  assert.ok(html.slice(0, html.indexOf('</head>')).includes('localStorage.getItem("atlas-theme")'));
  assert.doesNotMatch(html, /"themeBootScript"\]/);
});
