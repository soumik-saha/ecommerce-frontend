import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HomePage } from '../home.page';

@Component({
  selector: 'app-enterprise-home-page',
  standalone: true,
  imports: [HomePage],
  template: '<app-home-page />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseHomePageComponent {}
