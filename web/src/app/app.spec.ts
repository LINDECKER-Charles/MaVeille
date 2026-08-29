import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

/** Envoie une frappe sur `document`, là où la coque écoute ses raccourcis. */
function press(key: string, init: KeyboardEventInit = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the brand and a theme toggle', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.wordmark')?.textContent).toContain('Veille');
    expect(el.querySelector('.theme-toggle')).toBeTruthy();
  });

  it('rend le rail, la barre d’état et les onglets mobiles', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.primary-nav')).toBeTruthy();
    expect(el.querySelector('#mobile-menu')).toBeTruthy();
    expect(el.querySelector('.shell__status')).toBeTruthy();
    expect(el.querySelector('.shell__tabs')).toBeTruthy();
  });

  it('bascule la palette avec ⌘K et la referme avec Échap', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    press('k', { metaKey: true });
    expect(app.paletteOpen()).toBeTrue();

    press('Escape');
    expect(app.paletteOpen()).toBeFalse();
  });

  it('ouvre la palette avec « / » hors champ de saisie', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    press('/');
    expect(app.paletteOpen()).toBeTrue();
  });

  it('laisse « / » aux champs de saisie', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    expect(app.paletteOpen()).toBeFalse();
    input.remove();
  });

  it('referme le tiroir mobile avec Échap', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;

    app.toggleMenu();
    expect(app.menuOpen()).toBeTrue();

    press('Escape');
    expect(app.menuOpen()).toBeFalse();
  });
});
