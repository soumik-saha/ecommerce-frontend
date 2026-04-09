import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api-client';
import { CartItem } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class CartDatasource {
  private readonly api = inject(ApiClient);

  getCart(): Observable<CartItem[]> {
    return this.api.getCart();
  }
}
