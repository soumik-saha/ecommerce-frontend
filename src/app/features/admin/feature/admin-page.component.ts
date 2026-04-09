import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminPage } from '../../admin.page';

@Component({
  selector: 'app-enterprise-admin-page',
  standalone: true,
  imports: [AdminPage],
  template: '<app-admin-page />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseAdminPageComponent {}
