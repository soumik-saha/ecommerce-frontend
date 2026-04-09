import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-tile',
  standalone: true,
  template: '<article class="page"><p class="muted">{{ label() }}</p><h3 class="title">{{ value() }}</h3></article>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiTileComponent {
  readonly label = input('Metric');
  readonly value = input(0);
}
