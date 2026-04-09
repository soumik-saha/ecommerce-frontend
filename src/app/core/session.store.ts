import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, Role } from './models';
import { normalizeApiError } from './error-normalizer';

export interface Session {
  accessToken: string;
  email: string;
  userId: number;
  role: Role;
}

const KEY = 'ecom.session';

function storageAvailable(): Storage | null {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }
  return window.sessionStorage;
}

function mapRole(role: string | null | undefined): Role {
  const normalized = (role ?? '').replace('ROLE_', '').toUpperCase();
  return normalized === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
}

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly state = signal<Session | null>(this.load());
  readonly session = this.state.asReadonly();
  readonly token = computed(() => this.state()?.accessToken ?? null);
  readonly currentEmail = computed(() => this.state()?.email ?? 'Guest');
  readonly currentUserId = computed(() => this.state()?.userId ?? null);
  readonly isAuthenticated = computed(() => !!this.state()?.accessToken);
  readonly isAdmin = computed(() => this.state()?.role === 'ADMIN');
  set(response: AuthResponse): void {
    const session: Session = {
      accessToken: response.accessToken,
      email: response.email,
      userId: response.userId,
      role: mapRole(response.role)
    };
    this.state.set(session);
    storageAvailable()?.setItem(KEY, JSON.stringify(session));
  }
  clear(): void {
    this.state.set(null);
    storageAvailable()?.removeItem(KEY);
  }

  getErrorMessage(error: unknown): string {
    const normalized = normalizeApiError(error);
    if (normalized.fieldErrors && Object.keys(normalized.fieldErrors).length > 0) {
      return Object.entries(normalized.fieldErrors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(' | ');
    }

    return normalized.message;
  }

  private load(): Session | null {
    const raw = storageAvailable()?.getItem(KEY);
    if (!raw) {
      return null;
    }
    try {
      const session = JSON.parse(raw) as Session;
      if (!session.accessToken) {
        storageAvailable()?.removeItem(KEY);
        return null;
      }
      return { ...session, role: mapRole(session.role) };
    } catch {
      storageAvailable()?.removeItem(KEY);
      return null;
    }
  }
}
