import { domainOf } from './source.util';

describe('domainOf', () => {
  it('extrait le hostname et retire le www.', () => {
    expect(domainOf('https://www.infoq.com/news/2026/08/x/')).toBe('infoq.com');
  });

  it('accepte une URL sans schéma', () => {
    expect(domainOf('hf.co/Qwen/Qwen3')).toBe('hf.co');
  });

  it('retombe sur le nom de source quand il n’y a pas d’URL', () => {
    expect(domainOf(undefined, 'blog.angular.dev')).toBe('blog.angular.dev');
  });

  it('rend une chaîne vide sans rien d’exploitable', () => {
    expect(domainOf(undefined, undefined)).toBe('');
  });

  it('laisse un nom de source en texte libre intact', () => {
    expect(domainOf(undefined, 'Hugging Face')).toBe('Hugging Face');
  });

  it('rend le domaine plutôt que le chemin pour une URL complète', () => {
    expect(domainOf('https://devblogs.microsoft.com/dotnet/ef-core-11/')).toBe(
      'devblogs.microsoft.com'
    );
  });
});
