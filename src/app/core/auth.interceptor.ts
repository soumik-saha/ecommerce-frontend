import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionStore } from './session.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  const token = store.token();

  const base = environment.apiBaseUrl.replace(/\/+$/, '');
  const isApiCall = req.url.startsWith('/api') || req.url.startsWith(base);
  const isAuthEndpoint = /\/auth\/(login|register|logout)/.test(req.url);

  const request = token && isApiCall && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        store.clear();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
