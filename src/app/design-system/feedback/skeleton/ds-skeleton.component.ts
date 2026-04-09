import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ds-skeleton-grid',
  standalone: true,
  template: `
    <div class="grid two mt-sm" [attr.aria-label]="ariaLabel()">
      @for (_ of placeholders(); track $index) {
        <article class="page skeleton-card">
          <div class="skeleton skeleton-image"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DsSkeletonComponent {
  readonly count = input(4);
  readonly ariaLabel = input('Loading content');

  protected placeholders(): number[] {
    return Array.from({ length: Math.max(1, this.count()) }, (_, index) => index);
  }
}
