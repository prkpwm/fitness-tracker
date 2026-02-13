import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navigation tabs', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const navTabs = compiled.querySelectorAll('.nav-tab');
    expect(navTabs.length).toBe(3);
    expect(navTabs[0].textContent?.trim()).toContain('Daily View');
    expect(navTabs[1].textContent?.trim()).toContain('Monthly View');
    expect(navTabs[2].textContent?.trim()).toContain('Yearly View');
  });
});
