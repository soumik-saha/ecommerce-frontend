import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CheckoutStep } from '../domain/checkout.models';

@Component({
  selector: 'app-checkout-stepper',
  standalone: true,
  template: '<p class="muted">Current step: {{ step() }}</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutStepperComponent {
  readonly step = input<CheckoutStep>('address');
}
