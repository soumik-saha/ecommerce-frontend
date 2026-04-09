import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiToastService } from '../../../core/ui-toast.service';

@Component({
  selector: 'ds-toast-stack',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (item of toast.items(); track item.id) {
        <article class="toast" [class]="'toast ' + item.type">
          <p>{{ item.message }}</p>
          <button type="button" aria-label="Dismiss notification" (click)="toast.dismiss(item.id)">Dismiss</button>
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DsToastComponent {
  protected readonly toast = inject(UiToastService);
}
