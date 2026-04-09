import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { ApiClient } from '../../../core/api-client';
import { Order, Product, User } from '../../../core/models';

export interface AdminDashboardPayload {
  products: Product[];
  users: User[];
  orders: Order[];
}

@Injectable({ providedIn: 'root' })
export class AdminDatasource {
  private readonly api = inject(ApiClient);

  loadDashboard(): Observable<AdminDashboardPayload> {
    return forkJoin({
      products: this.api.searchProducts(''),
      users: this.api.listUsers(),
      orders: this.api.listOrders()
    });
  }
}
