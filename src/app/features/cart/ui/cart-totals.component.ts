import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-cart-totals',
  standalone: true,
  template: '<p class="product-price-lg">Subtotal: ₹{{ total().toFixed(2) }}</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartTotalsComponent {
  readonly total = input(0);
}
