import { Injectable, signal } from '@angular/core';

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
  private readonly state = signal<UserPreferences>(this.load());
  readonly preferences = this.state.asReadonly();

  update(partial: Partial<UserPreferences>): void {
    const next = { ...this.state(), ...partial };
    this.persist(next);
  }

  reset(): void {
    this.persist(DEFAULT_PREFERENCES);
  }

  private persist(next: UserPreferences): void {
    this.state.set(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  private load(): UserPreferences {
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
