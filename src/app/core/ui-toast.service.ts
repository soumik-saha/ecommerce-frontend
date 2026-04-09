import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class UiToastService {
  private counter = 0;
  private readonly state = signal<ToastMessage[]>([]);
  readonly toasts = this.state.asReadonly();

  success(message: string, durationMs = 2800): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 3600): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = 2800): void {
    this.show(message, 'info', durationMs);
  }

  dismiss(id: number): void {
    this.state.update((current) => current.filter((toast) => toast.id !== id));
  }

  private show(message: string, type: ToastType, durationMs: number): void {
    const id = ++this.counter;
    this.state.update((current) => [...current, { id, message, type }]);
    window.setTimeout(() => this.dismiss(id), durationMs);
  }
}
