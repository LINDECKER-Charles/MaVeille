// Node-native unit tests for the data generator's pure helpers.
// Run with:  node --test tools/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFrontmatter,
  splitDetailIntoSnippets,
  stripLeadingH1,
  stripMd,
  stripHtml,
  hashAccent,
  slugify,
  defaultMonogram,
  readingMinutes,
  firstSentence,
  buildRegistry,
  extractWeekId,
  renderMarkdown,
  disposeHighlighter
} from './build-data.mjs';

test.after(() => disposeHighlighter());

test('parseFrontmatter: returns null for files without a leading fence', () => {
  const { frontmatter, body } = parseFrontmatter('# Title\n\nbody');
  assert.equal(frontmatter, null);
  assert.equal(body, '# Title\n\nbody');
});

test('parseFrontmatter: parses YAML and strips the fence', () => {
  const raw = '---\ntags: [a, b]\nimportance: high\n---\n# Title\n';
  const { frontmatter, body } = parseFrontmatter(raw);
  assert.deepEqual(frontmatter.tags, ['a', 'b']);
  assert.equal(frontmatter.importance, 'high');
  assert.equal(body, '# Title\n');
});

test('parseFrontmatter: tolerates malformed YAML (falls back to no frontmatter)', () => {
  const raw = '---\n: : : not yaml\n---\nbody';
  const { frontmatter } = parseFrontmatter(raw);
  assert.equal(frontmatter, null);
});

test('stripLeadingH1: extracts the title and returns the body', () => {
  const { title, body } = stripLeadingH1('# Hello World\n\nrest');
  assert.equal(title, 'Hello World');
  assert.equal(body, 'rest');
});

test('splitDetailIntoSnippets: parses numbered topics, source and date', async () => {
  const md = [
    '## 1. Angular 22',
    '',
    '**Source :** NgBlog — https://blog.angular.dev/x',
    '**Date :** 20 juin 2026',
    '',
    'Premier paragraphe punchy.',
    '',
    '---',
    '',
    '## 2. Second sujet',
    '',
    'Contenu.'
  ].join('\n');
  const snips = await splitDetailIntoSnippets(md);
  assert.equal(snips.length, 2);
  assert.equal(snips[0].index, '1');
  assert.equal(snips[0].title, 'Angular 22');
  assert.equal(snips[0].source, 'NgBlog');
  assert.equal(snips[0].sourceUrl, 'https://blog.angular.dev/x');
  assert.equal(snips[0].date, '20 juin 2026');
  assert.ok(snips[0].preview.startsWith('Premier paragraphe'));
  assert.ok(snips[0].bodyHtml.includes('<p>'));
  // Reading time present and floored at 2 minutes.
  assert.equal(typeof snips[0].readingMinutes, 'number');
  assert.ok(snips[0].readingMinutes >= 2);
});

test('splitDetailIntoSnippets: ignores non-numbered H2 headings', async () => {
  assert.equal((await splitDetailIntoSnippets('## Digest court\n\ntext')).length, 0);
});

test('stripMd: removes markdown markers', () => {
  const out = stripMd('# Title\n\n**bold** and `code` and [link](http://x)');
  assert.ok(!out.includes('#'));
  assert.ok(!out.includes('**'));
  assert.ok(out.includes('bold'));
  assert.ok(out.includes('link'));
});

test('hashAccent: deterministic valid hex per name', () => {
  const a = hashAccent('Angular');
  assert.equal(a, hashAccent('Angular'));
  assert.match(a, /^#[0-9a-f]{6}$/);
  assert.notEqual(hashAccent('Angular'), hashAccent('Tech'));
});

test('slugify: lowercase alphanumeric slug, ASCII-folded', () => {
  assert.equal(slugify('CSharp'), 'csharp');
  assert.equal(slugify('Angular'), 'angular');
  assert.equal(slugify('IA'), 'ia');
  assert.equal(slugify('Données & Tech'), 'donneestech');
  assert.equal(slugify('!!!'), 'cat');
});

test('defaultMonogram: 1–2 leading uppercase letters', () => {
  assert.equal(defaultMonogram('Angular'), 'AN');
  assert.equal(defaultMonogram('A'), 'A');
  assert.equal(defaultMonogram('C#'), 'C');
});

test('stripHtml: strips tags and decodes entities', () => {
  assert.equal(stripHtml('<p>Hello <strong>world</strong> &amp; more</p>'), 'Hello world & more');
});

test('readingMinutes: words/200 with floor', () => {
  assert.equal(readingMinutes('one two three', 2), 2); // below floor
  const long = Array.from({ length: 600 }, () => 'w').join(' ');
  assert.equal(readingMinutes(long, 1), 3);
  assert.equal(readingMinutes('', 1), 1);
});

test('firstSentence: extracts first sentence, trims and ellipsizes', () => {
  assert.equal(
    firstSentence('<p>Première phrase utile. Deuxième phrase.</p>'),
    'Première phrase utile.'
  );
  const longHtml = '<p>' + Array.from({ length: 80 }, () => 'mot').join(' ') + '</p>';
  const out = firstSentence(longHtml, 50);
  assert.ok(out.length <= 51);
  assert.ok(out.endsWith('…'));
});

test('buildRegistry: derives slug/monogram from config, slugify fallback', () => {
  const reg = buildRegistry(new Set(['Angular', 'CSharp', 'Unknown Cat']));
  const byName = Object.fromEntries(reg.map((c) => [c.name, c]));
  // From categories.config.json
  assert.equal(byName.Angular.slug, 'angular');
  assert.equal(byName.Angular.monogram, 'A');
  assert.equal(byName.CSharp.slug, 'csharp');
  assert.equal(byName.CSharp.monogram, '#');
  // Discovered-only category: derived slug + monogram.
  assert.equal(byName['Unknown Cat'].slug, 'unknowncat');
  assert.equal(byName['Unknown Cat'].monogram, 'UN');
  assert.match(byName['Unknown Cat'].accent, /^#[0-9a-f]{6}$/);
});

test('extractWeekId: parses the ISO week id from a path', () => {
  assert.equal(extractWeekId('report/weekly/2026-W25_weekly.md'), '2026-W25');
  assert.equal(extractWeekId('2026-W01_weekly.md'), '2026-W01');
  assert.equal(extractWeekId('no-week-here.md'), null);
});

test('renderMarkdown: highlights a ```ts block with Shiki (dual-theme spans)', async () => {
  const html = await renderMarkdown('```ts\nconst x: number = 1;\n```');
  assert.match(html, /class="shiki/);
  // Dual-theme CSS variables must survive the sanitizer.
  assert.match(html, /--shiki-light:/);
  assert.match(html, /--shiki-dark:/);
  // Token spans (and their inline styles) must not be stripped.
  assert.match(html, /<span[^>]*style="[^"]*--shiki/);
  assert.ok(!html.includes('class="mermaid"'));
});

test('renderMarkdown: a ```mermaid block becomes a <pre class="mermaid"> marker', async () => {
  const html = await renderMarkdown('```mermaid\nflowchart LR\n  a --> b\n```');
  assert.match(html, /<pre class="mermaid">/);
  // Source preserved (HTML-escaped; textContent decodes back for Mermaid).
  assert.match(html, /flowchart LR/);
  assert.match(html, /a --&gt; b/);
  // Must NOT be highlighted as a code block.
  assert.ok(!html.includes('class="shiki'));
});

test('renderMarkdown: a fence without a language keeps default code rendering', async () => {
  const html = await renderMarkdown('```\nplain text\n```');
  assert.match(html, /<pre><code/);
  assert.ok(!html.includes('class="shiki'));
  assert.ok(!html.includes('class="mermaid"'));
});
