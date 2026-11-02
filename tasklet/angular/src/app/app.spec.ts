import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    localStorage.setItem(
      'tasklet:v1',
      JSON.stringify([{ id: '1', title: 'Saved task', done: false }]),
    );
  });

  afterEach(() => localStorage.clear());

  it('renders the saved tasks and the count', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('li span')?.textContent).toBe('Saved task');
    expect(element.querySelector('p.count')?.textContent).toBe('1 task left');
  });

  it('toggles a task through the checkbox', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLInputElement>('li input')!.click();
    await fixture.whenStable();
    expect(element.querySelector('li')?.classList).toContain('done');
    expect(element.querySelector('p.count')?.textContent).toBe('0 tasks left');
  });
});
