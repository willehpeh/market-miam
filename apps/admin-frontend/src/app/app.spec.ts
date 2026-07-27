import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('smoke', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeDefined();
  });

  // AGPL §13 owes the source offer to the users of *this* interface.
  it('offers the source code', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('footer a')?.getAttribute('href')).toBe(
      'https://marketmiam.fr/mentions-legales#licence',
    );
  });
});
