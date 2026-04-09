import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CartPage } from '../../cart.page';

@Component({
  selector: 'app-enterprise-cart-page',
  standalone: true,
  imports: [CartPage],
  template: '<app-cart-page />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseCartPageComponent {}
