import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const KEY = 'ecom.user.preferences';

export interface UserPreferences {
  avatarUrl: string;
  compactMode: boolean;
  emailNotifications: boolean;
  marketingNotifications: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  avatarUrl: '',
  compactMode: false,
  emailNotifications: true,
  marketingNotifications: false
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly state = signal<UserPreferences>(DEFAULT_PREFERENCES);
  readonly preferences = this.state.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.state.set(this.load());
    }
  }

  update(partial: Partial<UserPreferences>): void {
    const next = { ...this.state(), ...partial };
    this.persist(next);
  }

  reset(): void {
    this.persist(DEFAULT_PREFERENCES);
  }

  private persist(next: UserPreferences): void {
    this.state.set(next);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(KEY, JSON.stringify(next));
  }

  private load(): UserPreferences {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_PREFERENCES;
    }

    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        avatarUrl: String(parsed.avatarUrl ?? ''),
        compactMode: Boolean(parsed.compactMode),
        emailNotifications: parsed.emailNotifications !== false,
        marketingNotifications: Boolean(parsed.marketingNotifications)
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }
}
