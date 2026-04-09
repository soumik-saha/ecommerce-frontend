import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProfilePage } from '../../profile.page';

@Component({
  selector: 'app-enterprise-profile-page',
  standalone: true,
  imports: [ProfilePage],
  template: '<app-profile-page />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseProfilePageComponent {}
