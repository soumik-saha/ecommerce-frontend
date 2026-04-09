import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api-client';
import { Product } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class ProductDetailDatasource {
  private readonly api = inject(ApiClient);

  getProduct(productId: number): Observable<Product> {
    return this.api.getProduct(productId);
  }
}
