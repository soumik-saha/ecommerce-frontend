import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api-client';
import { Order, User } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class ProfileDatasource {
  private readonly api = inject(ApiClient);

  loadOrders(): Observable<Order[]> {
    return this.api.listOrders();
  }

  loadUser(userId: number): Observable<User> {
    return this.api.getUser(userId);
  }
}
