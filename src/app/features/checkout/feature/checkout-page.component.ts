import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CheckoutPage } from '../../checkout.page';

@Component({
  selector: 'app-enterprise-checkout-page',
  standalone: true,
  imports: [CheckoutPage],
  template: '<app-checkout-page />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseCheckoutPageComponent {}
