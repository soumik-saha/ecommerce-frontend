import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-home-rail',
  standalone: true,
  template: '<h3 class="section-title">{{ title() }}</h3>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeRailComponent {
  readonly title = input('Featured');
}
