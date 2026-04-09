import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiToastService } from '../core/ui-toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [CommonModule],
  template: `
    <section class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (toast of toasts(); track toast.id) {
        <article class="toast" [class]="'toast ' + toast.type">
          <p>{{ toast.message }}</p>
          <button type="button" (click)="dismiss(toast.id)" aria-label="Close notification">x</button>
        </article>
      }
    </section>
  `
})
export class ToastOutletComponent {
  private readonly toastService = inject(UiToastService);
  protected readonly toasts = this.toastService.toasts;

  protected dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
