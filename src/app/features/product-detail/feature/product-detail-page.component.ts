import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProductDetailPage } from '../../product-detail.page';

@Component({
  selector: 'app-enterprise-product-detail-page',
  standalone: true,
  imports: [ProductDetailPage],
  template: '<app-product-detail-page />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseProductDetailPageComponent {}
