import { Injectable, signal } from '@angular/core';
import { Address } from './models';

const KEY = 'ecom.saved.addresses';

export interface SavedAddress {
  id: string;
  label: string;
  address: Address;
}

@Injectable({ providedIn: 'root' })
export class AddressBookStore {
  private readonly state = signal<SavedAddress[]>(this.load());
  readonly addresses = this.state.asReadonly();

  add(label: string, address: Address): void {
    const normalized = {
      ...address,
      street: address.street.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      zipcode: address.zipcode.trim(),
      country: address.country.trim()
    };

    const next = [
      ...this.state(),
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        label: (label || 'Address').trim(),
        address: normalized
      }
    ];

    this.persist(next);
  }

  remove(id: string): void {
    this.persist(this.state().filter((entry) => entry.id !== id));
  }

  private persist(next: SavedAddress[]): void {
    this.state.set(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  private load(): SavedAddress[] {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as SavedAddress[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  }
}
