import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api-client';
import { Order } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class CheckoutDatasource {
  private readonly api = inject(ApiClient);

  placeOrder(): Observable<Order> {
    return this.api.createOrder();
  }
}
