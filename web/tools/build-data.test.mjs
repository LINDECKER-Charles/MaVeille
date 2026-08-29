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
  firstParagraph,
  buildRegistry,
  extractWeekId,
  isoWeekRange,
  domainOf,
  flattenSubjects,
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

// ---------------------------------------------------------------------------
// Semaines ISO, domaines et aplatissement des sujets (ajouts de la refonte)
// ---------------------------------------------------------------------------

test('isoWeekRange: rend le lundi et le dimanche de la semaine ISO', () => {
  // W25 2026 est déclarée en frontmatter comme 2026-06-15/2026-06-21.
  assert.deepEqual(isoWeekRange('2026-W25'), { start: '2026-06-15', end: '2026-06-21' });
  // Semaine 1 : elle contient toujours le 4 janvier.
  const w1 = isoWeekRange('2026-W01');
  assert.ok(w1 && w1.start <= '2026-01-04' && '2026-01-04' <= w1.end);
  // Une année à 53 semaines reste dans les clous (2020 en a 53).
  assert.deepEqual(isoWeekRange('2020-W53'), { start: '2020-12-28', end: '2021-01-03' });
});

test('isoWeekRange: rejette un identifiant qui n’est pas une semaine ISO', () => {
  assert.equal(isoWeekRange('2026-06-15'), null);
  assert.equal(isoWeekRange('W25'), null);
});

test('domainOf: extrait le hostname, sans www., et tolère une URL illisible', () => {
  assert.equal(domainOf('https://www.infoq.com/news/x/'), 'infoq.com');
  assert.equal(domainOf('https://hf.co/Qwen'), 'hf.co');
  assert.equal(domainOf(undefined), undefined);
  assert.equal(domainOf('pas une url'), undefined);
});

test('firstParagraph: isole le premier <p>, sinon rend le fragment entier', () => {
  assert.equal(firstParagraph('<h2>Titre</h2><p>Corps.</p><p>Suite.</p>'), 'Corps.');
  assert.equal(firstParagraph('<ul><li>a</li></ul>'), '<ul><li>a</li></ul>');
});

test('flattenSubjects: aplatit, agrège le temps de lecture et retient le premier sujet', () => {
  const registry = new Map([
    ['IA', { slug: 'ia', monogram: 'AI' }],
    ['Tech', { slug: 'tech', monogram: 'T' }]
  ]);
  const rendered = {
    date: '2026-06-20',
    categories: [
      {
        category: 'IA',
        syntheseHtml: '<h2>Digest</h2><p>Première phrase. Deuxième.</p>',
        detailMinutes: 5,
        detailSnippets: [
          {
            index: '1',
            title: 'Un sujet',
            source: 'Hugging Face',
            sourceUrl: 'https://hf.co/a',
            readingMinutes: 3
          }
        ]
      },
      {
        category: 'Tech',
        syntheseHtml: '<p>Autre.</p>',
        detailMinutes: 4,
        detailSnippets: [
          { index: '1', title: 'Deux', readingMinutes: 2 },
          { index: '2', title: 'Trois', readingMinutes: 2 }
        ]
      }
    ]
  };

  const flat = flattenSubjects(rendered, registry);

  assert.equal(flat.subjects.length, 3);
  assert.equal(flat.readingMinutes, 9);
  assert.equal(flat.firstSubject, 'ia-1');
  assert.equal(flat.subjects[0].domain, 'hf.co');
  assert.equal(flat.subjects[0].mono, 'AI');
  // L'accroche vient de la catégorie qui porte le plus de sujets (Tech, 2 > 1).
  assert.equal(flat.headline, 'Autre.');
});

test('flattenSubjects: une journée sans sujet détaillé ne pose pas de firstSubject', () => {
  const flat = flattenSubjects(
    { date: '2026-06-20', categories: [{ category: 'IA', syntheseHtml: '<p>Rien.</p>' }] },
    new Map([['IA', { slug: 'ia', monogram: 'AI' }]])
  );

  assert.equal(flat.subjects.length, 0);
  assert.equal(flat.firstSubject, undefined);
  assert.equal(flat.readingMinutes, 0);
});
