import { extractCodeBlocks, extractLinks, firstSentenceOf, withAnchors } from './content.util';

describe('content.util', () => {
  describe('withAnchors', () => {
    it('pose un id sur chaque h3 et renvoie le sommaire', () => {
      const { html, toc } = withAnchors('<h3>Contexte</h3><p>a</p><h3>En pratique — code</h3>');

      expect(toc).toEqual([
        { id: 's-1-contexte', label: 'Contexte' },
        { id: 's-2-en-pratique-code', label: 'En pratique — code' }
      ]);
      expect(html).toContain('<h3 id="s-1-contexte">Contexte</h3>');
      expect(html).toContain('id="s-2-en-pratique-code"');
    });

    it('respecte un id déjà présent', () => {
      const { html, toc } = withAnchors('<h3 id="deja">Titre</h3>');

      expect(toc).toEqual([{ id: 'deja', label: 'Titre' }]);
      expect(html).toBe('<h3 id="deja">Titre</h3>');
    });

    it('ignore un titre vide et laisse le corps intact', () => {
      const { html, toc } = withAnchors('<h3></h3><p>corps</p>');

      expect(toc).toEqual([]);
      expect(html).toBe('<h3></h3><p>corps</p>');
    });

    it('nettoie le balisage interne pour le libellé', () => {
      const { toc } = withAnchors('<h3>Un <code>flag</code> utile</h3>');

      expect(toc[0].label).toBe('Un flag utile');
    });
  });

  describe('extractCodeBlocks', () => {
    it('rend chaque bloc préfixé du titre de section qui l’introduit', () => {
      const blocks = extractCodeBlocks(
        '<h3>Install</h3><p>x</p><pre>npm i</pre><h3>Usage</h3><pre>run</pre>'
      );

      expect(blocks.length).toBe(2);
      expect(blocks[0]).toBe('<h3>Install</h3><pre>npm i</pre>');
      expect(blocks[1]).toBe('<h3>Usage</h3><pre>run</pre>');
    });

    it('rend un tableau vide sans bloc de code', () => {
      expect(extractCodeBlocks('<p>rien</p>')).toEqual([]);
    });

    it('écarte les diagrammes Mermaid, qui ne sont pas du code à copier', () => {
      const blocks = extractCodeBlocks('<pre class="mermaid">graph LR</pre><pre>npm i</pre>');

      expect(blocks).toEqual(['<pre>npm i</pre>']);
    });
  });

  describe('extractLinks', () => {
    it('dédoublonne par URL et ignore les liens non http', () => {
      const links = extractLinks(
        '<a href="https://a.dev">A</a><a href="https://a.dev">bis</a><a href="#local">L</a>'
      );

      expect(links).toEqual([{ href: 'https://a.dev', label: 'A' }]);
    });

    it('retombe sur l’URL quand le libellé est vide', () => {
      expect(extractLinks('<a href="https://b.dev"></a>')).toEqual([
        { href: 'https://b.dev', label: 'https://b.dev' }
      ]);
    });
  });

  describe('firstSentenceOf', () => {
    it('prend la première phrase du premier paragraphe', () => {
      const text = firstSentenceOf('<h2>Titre</h2><p>Une phrase. Une autre.</p>');

      expect(text).toBe('Une phrase.');
    });

    it('tronque proprement sur une limite de mot', () => {
      const long = `<p>${'mot '.repeat(60)}fin.</p>`;
      const text = firstSentenceOf(long, 40);

      expect(text.length).toBeLessThanOrEqual(41);
      expect(text.endsWith('…')).toBeTrue();
    });

    it('rend une chaîne vide pour un fragment vide', () => {
      expect(firstSentenceOf('<p></p>')).toBe('');
    });
  });
});
