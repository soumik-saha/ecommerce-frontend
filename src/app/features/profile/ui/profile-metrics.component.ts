import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-profile-metrics',
  standalone: true,
  template: '<p class="muted">Orders: {{ orders() }} · Addresses: {{ addresses() }}</p>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileMetricsComponent {
  readonly orders = input(0);
  readonly addresses = input(0);
}
