import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthRequest,
  AuthResponse,
  CartItem,
  Order,
  PageResponse,
  Product,
  ProductListQuery,
  ProductRequest,
  RefreshTokenRequest,
  RegisterRequest,
  User,
  UserRequest
} from './models';
import { AuditLogEntry } from './audit-log.store';

export interface AuditSyncResponse {
  syncedIds?: string[];
  duplicateIds?: string[];
  conflictIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = this.normalizeBaseUrl(environment.apiBaseUrl);

  private endpoint(path: string): string {
    return `${this.base}${path}`;
  }

  private normalizeBaseUrl(value: string): string {
    const cleaned = (value || '').trim().replace(/\/+$/, '');
    if (!cleaned) {
      return '/api';
    }
    if (cleaned.endsWith('/api') || cleaned.includes('/api/')) {
      return cleaned;
    }
    return `${cleaned}/api`;
  }

  login(payload: AuthRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.endpoint('/auth/login'), payload);
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.endpoint('/auth/register'), payload);
  }

  registerAdmin(payload: RegisterRequest, adminSecret: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.endpoint('/auth/register/admin'), payload, {
      headers: { 'X-Admin-Secret': adminSecret }
    });
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.endpoint('/auth/logout'), null);
  }

  refresh(payload: RefreshTokenRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.endpoint('/auth/refresh'), payload);
  }

  listProducts(query?: ProductListQuery): Observable<PageResponse<Product>>;
  listProducts(keyword?: string, page?: number, size?: number): Observable<PageResponse<Product>>;
  listProducts(queryOrKeyword: ProductListQuery | string = {}, page = 0, size = 12): Observable<PageResponse<Product>> {
    const query: ProductListQuery =
      typeof queryOrKeyword === 'string'
        ? { keyword: queryOrKeyword, page, size }
        : (queryOrKeyword ?? {});

    const safePage = Math.max(0, query.page ?? 0);
    const safeSize = Math.max(1, query.size ?? 12);
    let params = new HttpParams()
      .set('keyword', (query.keyword ?? '').trim())
      .set('page', String(safePage))
      .set('size', String(safeSize));

    if (query.category) {
      params = params.set('category', query.category);
    }
    if (typeof query.minPrice === 'number') {
      params = params.set('minPrice', String(query.minPrice));
    }
    if (typeof query.maxPrice === 'number') {
      params = params.set('maxPrice', String(query.maxPrice));
    }

    return this.http.get<PageResponse<Product>>(this.endpoint('/products'), { params });
  }

  searchProducts(keyword: string): Observable<Product[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Product[]>(this.endpoint('/products/search'), { params });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(this.endpoint(`/products/${id}`));
  }

  createProduct(payload: ProductRequest): Observable<Product> {
    return this.http.post<Product>(this.endpoint('/products'), payload);
  }

  updateProduct(id: number, payload: ProductRequest): Observable<string> {
    return this.http.put(this.endpoint(`/products/${id}`), payload, { responseType: 'text' });
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/products/${id}`));
  }

  getCart(): Observable<CartItem[]> {
    return this.http.get<CartItem[]>(this.endpoint('/cart'));
  }

  addCartItem(productId: number, quantity: number): Observable<void> {
    return this.http.post<void>(this.endpoint('/cart'), { productId, quantity });
  }

  deleteCartItem(productId: number): Observable<void> {
    return this.http.delete<void>(this.endpoint(`/cart/items/${productId}`));
  }

  createOrder(): Observable<Order> {
    return this.http.post<Order>(this.endpoint('/orders'), {});
  }

  listOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.endpoint('/orders'));
  }

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.endpoint('/users'));
  }

  getUser(userId: number): Observable<User> {
    return this.http.get<User>(this.endpoint(`/users/${userId}`));
  }

  createUser(payload: UserRequest): Observable<string> {
    return this.http.post(this.endpoint('/users'), payload, { responseType: 'text' });
  }

  updateUser(userId: number, payload: UserRequest): Observable<string> {
    return this.http.put(this.endpoint(`/users/${userId}`), payload, { responseType: 'text' });
  }

  submitAuditLogs(entries: AuditLogEntry[], idempotencyKey: string): Observable<AuditSyncResponse> {
    const payload = entries.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      details: entry.details
    }));

    return this.http.post<AuditSyncResponse>(
      this.endpoint('/audit-logs/batch'),
      { entries: payload },
      { headers: { 'X-Idempotency-Key': idempotencyKey } }
    );
  }
}
