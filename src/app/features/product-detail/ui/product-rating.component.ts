import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-product-rating',
  standalone: true,
  template: '<p class="muted">Rating {{ rating() }} ({{ count() }} reviews)</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductRatingComponent {
  readonly rating = input(0);
  readonly count = input(0);
}
