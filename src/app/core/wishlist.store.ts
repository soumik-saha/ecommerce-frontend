import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

const KEY = 'ecom.wishlist.ids';

@Injectable({ providedIn: 'root' })
export class WishlistStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly idsState = signal<number[]>(this.load());
  readonly ids = this.idsState.asReadonly();
  readonly count = computed(() => this.idsState().length);

  isWished(productId: number): boolean {
    return this.idsState().includes(productId);
  }

  toggle(productId: number): boolean {
    const current = this.idsState();
    if (current.includes(productId)) {
      const next = current.filter((id) => id !== productId);
      this.persist(next);
      return false;
    }

    const next = [...current, productId];
    this.persist(next);
    return true;
  }

  remove(productId: number): void {
    const next = this.idsState().filter((id) => id !== productId);
    this.persist(next);
  }

  clear(): void {
    this.persist([]);
  }

  private persist(ids: number[]): void {
    this.idsState.set(ids);

    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(KEY, JSON.stringify(ids));
  }

  private load(): number[] {
    if (!this.isBrowser) {
      return [];
    }

    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
    } catch {
      return [];
    }
  }
}
