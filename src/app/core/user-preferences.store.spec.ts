import { TestBed } from '@angular/core/testing';
import { UserPreferencesStore } from './user-preferences.store';

describe('UserPreferencesStore', () => {
  let store: UserPreferencesStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(UserPreferencesStore);
  });

  it('updates preferences and keeps values', () => {
    store.update({ compactMode: true, avatarUrl: 'https://example.com/a.png' });

    const prefs = store.preferences();
    expect(prefs.compactMode).toBeTrue();
    expect(prefs.avatarUrl).toContain('example.com');
  });

  it('resets to defaults', () => {
    store.update({ compactMode: true, marketingNotifications: true });
    store.reset();

    const prefs = store.preferences();
    expect(prefs.compactMode).toBeFalse();
    expect(prefs.marketingNotifications).toBeFalse();
    expect(prefs.emailNotifications).toBeTrue();
  });
});
