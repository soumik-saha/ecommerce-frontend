export interface Address {
  street: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
}

export type Role = 'ADMIN' | 'CUSTOMER';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  userId: number;
  email: string;
  role: Role;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  address: Address;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageUrl: string;
  active: boolean;
  rating?: number;
  reviewCount?: number;
  variants?: ProductVariant[];
  reviews?: ProductReview[];
}

export interface ProductVariant {
  id: string;
  label: string;
  value: string;
  inStock: boolean;
}

export interface ProductReview {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}
export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageUrl: string;
}
export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ProductListQuery {
  keyword?: string;
  page?: number;
  size?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}
export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
}
export interface Order {
  id: number;
  totalAmount: number;
  status: string;
  createdAt?: string;
  items: OrderItem[];
}
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  address: Address;
}

export interface UserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: Address;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}

export type ApiError = ApiErrorResponse;
