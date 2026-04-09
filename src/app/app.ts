import { CommonModule } from '@angular/common';
import { Component, Injector, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiClient } from './core/api-client';
import { AuditSyncService } from './core/audit-sync.service';
import { ObservabilityStore } from './core/observability.store';
import { SessionStore } from './core/session.store';
import { UiToastService } from './core/ui-toast.service';
import { UserPreferencesStore } from './core/user-preferences.store';
import { ToastOutletComponent } from './shared/toast-outlet.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly injector = inject(Injector);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(UiToastService);
  private readonly preferencesStore = inject(UserPreferencesStore);
  private readonly observability = inject(ObservabilityStore);
  private readonly _auditSync = inject(AuditSyncService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly navStartTimeById = new Map<number, number>();

  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  protected readonly isAdmin = this.sessionStore.isAdmin;
  protected readonly currentEmail = computed(() => this.sessionStore.session()?.email ?? 'Guest');
  protected readonly preferences = this.preferencesStore.preferences;
  protected readonly avatarUrl = computed(() => this.preferences().avatarUrl || '');
  protected readonly isLoggingOut = signal(false);
  protected readonly mobileMenuOpen = signal(false);

  constructor() {
    effect(() => {
      if (!this.isBrowser) {
        return;
      }

      document.body.classList.toggle('compact-mode', this.preferences().compactMode);
    });

    this.observability.recordUiAction('app.initialized');

    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navStartTimeById.set(event.id, performance.now());
        return;
      }

      if (event instanceof NavigationEnd) {
        this.captureNavigationMetric(event.id, event.urlAfterRedirects, 'ok');
        this.mobileMenuOpen.set(false);
        return;
      }

      if (event instanceof NavigationCancel) {
        this.captureNavigationMetric(event.id, event.url, 'cancelled');
        return;
      }

      if (event instanceof NavigationError) {
        this.captureNavigationMetric(event.id, event.url, 'error');
        this.observability.recordError('navigation.error', String(event.error ?? 'unknown'));
      }
    });

    if (this.isBrowser) {
      window.addEventListener('error', (event) => {
        this.observability.recordError('window.error', event.message || 'unknown');
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.observability.recordError('promise.rejection', String(event.reason ?? 'unknown'));
      });
    }
  }

  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);
    const api = this.injector.get(ApiClient);
    api.logout().subscribe({
      next: () => {
        this.sessionStore.clear();
        this.observability.recordUiAction('session.logout.success');
        this.toast.info('Signed out successfully');
        void this.router.navigate(['/login']);
      },
      error: () => {
        this.sessionStore.clear();
        this.observability.recordError('session.logout.error');
        this.toast.info('Session ended. Please sign in again.');
        void this.router.navigate(['/login']);
      },
      complete: () => this.isLoggingOut.set(false)
    });
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((state) => !state);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  private captureNavigationMetric(
    navigationId: number,
    path: string,
    outcome: 'ok' | 'cancelled' | 'error'
  ): void {
    const start = this.navStartTimeById.get(navigationId);
    this.navStartTimeById.delete(navigationId);
    if (typeof start !== 'number') {
      return;
    }

    const durationMs = Math.max(0, performance.now() - start);
    this.observability.recordNavigation(path, durationMs, outcome);
  }
}
